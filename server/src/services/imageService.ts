import fs from 'node:fs';
import path from 'node:path';
import { sentenceImageRepository } from '../db/repositories.js';
import { REALISTIC_IMAGE_STYLE, createSentenceImagePrompt, createSentenceImageSceneMaterialPrompt, createSentenceImageSceneSystemPrompt } from '../prompts/sentenceImagePrompt.js';
import { createMatchSentencePrompt } from '../prompts/matchSentencePrompt.js';
import { askWordChat, generateImageBase64, matchSentenceCandidates } from './openaiService.js';
import { getMediaUrl } from './audioService.js';
import { findWordByText } from './vocabularyService.js';
import { createId } from '../utils/id.js';
import { env } from '../config/env.js';
import type { Meaning, SentenceImage } from '../types/models.js';

const FUZZY_MATCH_CANDIDATE_LIMIT = 24;

export interface SentenceImageOptions {
  word?: string;
  /**
   * Explicitly provided gloss for the single meaning this sentence belongs to
   * (part of speech + English/Chinese meaning). When absent, it is looked up
   * from the vocabulary entry for `word` — preferring the meaning whose
   * example matches the sentence, falling back to the first meaning. Only ONE
   * meaning is ever sent to the LLM: an example sentence belongs to exactly
   * one meaning.
   */
  meaning?: string;
  force?: boolean;
}

export interface SentenceImageResult {
  imageUrl: string;
  cached: boolean;
  source: 'exact' | 'fuzzy' | 'generated';
  matchedSentence?: string;
}

function normalizeSentence(sentence: string) {
  return sentence.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function checkSentenceImage(sentence: string): SentenceImageResult | null {
  const existing = sentenceImageRepository.getByNormalizedSentence(normalizeSentence(sentence));
  if (!existing) {
    return null;
  }

  return {
    imageUrl: getMediaUrl(existing.imageFile),
    cached: true,
    source: 'exact',
  };
}

export async function getOrCreateSentenceImage(sentence: string, options: SentenceImageOptions = {}): Promise<SentenceImageResult> {
  const { word, meaning, force } = options;
  const normalized = normalizeSentence(sentence);
  if (!normalized) {
    throw new Error('Sentence is required.');
  }

  if (!force) {
    const exact = sentenceImageRepository.getByNormalizedSentence(normalized);
    if (exact) {
      return {
        imageUrl: getMediaUrl(exact.imageFile),
        cached: true,
        source: 'exact',
      };
    }

    const matched = await findFuzzyMatch(sentence);
    if (matched) {
      // Alias the new sentence to the existing image so future lookups hit the exact cache.
      saveAlias(normalized, sentence, matched.imageFile);
      return {
        imageUrl: getMediaUrl(matched.imageFile),
        cached: true,
        source: 'fuzzy',
        matchedSentence: matched.sentence,
      };
    }
  }

  const base64 = await generateImageBase64(await buildImagePrompt(sentence, word, meaning));
  const imageFile = writeImageFile(base64);
  const now = new Date().toISOString();
  const entry: SentenceImage = {
    id: createId('simg'),
    sentence: sentence.trim().replace(/\s+/g, ' '),
    normalizedSentence: normalized,
    imageFile,
    createdAt: now,
    updatedAt: now,
  };
  sentenceImageRepository.save(entry);

  return {
    imageUrl: getMediaUrl(imageFile),
    cached: false,
    source: 'generated',
  };
}

async function findFuzzyMatch(sentence: string): Promise<SentenceImage | null> {
  const normalized = normalizeSentence(sentence);
  const seenFiles = new Set<string>();
  const candidates = sentenceImageRepository
    .list()
    .filter((item) => {
      if (item.normalizedSentence === normalized || seenFiles.has(item.imageFile)) {
        return false;
      }
      seenFiles.add(item.imageFile);
      return true;
    })
    .slice(0, FUZZY_MATCH_CANDIDATE_LIMIT);

  if (candidates.length === 0) {
    return null;
  }

  const prompt = createMatchSentencePrompt(sentence, candidates.map((item) => item.sentence));
  try {
    const { matchedIndices } = await matchSentenceCandidates(prompt);
    for (const index of matchedIndices) {
      const matched = candidates[index];
      if (!matched) {
        continue;
      }
      return matched;
    }
  } catch {
    // If the LLM judgement fails, fall through and generate a fresh image.
  }

  return null;
}

function saveAlias(normalizedSentence: string, sentence: string, imageFile: string) {
  const now = new Date().toISOString();
  sentenceImageRepository.save({
    id: createId('simg'),
    sentence: sentence.trim().replace(/\s+/g, ' '),
    normalizedSentence,
    imageFile,
    createdAt: now,
    updatedAt: now,
  });
}

/** Format a single meaning's gloss as "- pos: english (中文)". */
export function formatMeaningText(meaning: Meaning): string {
  const pos = meaning.partOfSpeech ? `${meaning.partOfSpeech}: ` : '';
  const zh = meaning.chineseMeaning ? ` (${meaning.chineseMeaning})` : '';
  return `- ${pos}${meaning.englishMeaning ?? ''}${zh}`;
}

/**
 * Pull the gloss for a SINGLE meaning (part of speech + English/Chinese
 * meaning) so the LLM can pin the exact sense of the word. An example sentence
 * belongs to exactly one meaning, so this prefers the meaning whose example
 * matches `sentence`; when the sentence does not match any cached example
 * (e.g. a user-typed sentence), it falls back to the first meaning. Never more
 * than one meaning.
 */
function resolveMeaningText(sentence: string, word: string, explicitMeaning?: string): string | undefined {
  if (explicitMeaning?.trim()) {
    return explicitMeaning.trim();
  }
  if (!word?.trim()) {
    return undefined;
  }

  try {
    const entry = findWordByText(word);
    if (!entry?.meanings?.length) {
      return undefined;
    }
    const normalizedTarget = normalizeSentence(sentence);
    const matched = entry.meanings.find((m) => m.example && normalizeSentence(m.example) === normalizedTarget);
    const meaning = matched ?? entry.meanings[0];
    return formatMeaningText(meaning);
  } catch {
    return undefined;
  }
}

async function buildImagePrompt(sentence: string, word?: string, explicitMeaning?: string): Promise<string> {
  try {
    const meaningText = resolveMeaningText(sentence, word ?? '', explicitMeaning);
    const reply = (
      await askWordChat(
        createSentenceImageSceneMaterialPrompt(sentence, word, meaningText),
        createSentenceImageSceneSystemPrompt(),
      )
    ).trim();
    const description = extractSceneFromReply(reply);
    if (description) {
      return `${REALISTIC_IMAGE_STYLE}\nScene: ${description}`;
    }
  } catch {
    // If the scene-design step fails, fall back to the raw sentence so generation still works.
  }

  return createSentenceImagePrompt(sentence);
}

/**
 * The scene-design LLM thinks first, then ends its reply with a structured
 * `### text: <scene description>` block on the last line. Take everything after
 * the marker (the last occurrence, in case the marker appears in the reasoning
 * too) and use it as the image prompt, so the reasoning never leaks into the
 * generated picture. Returns undefined when no marker is present, letting the
 * caller fall back.
 */
function extractSceneFromReply(reply: string): string | undefined {
  const parts = reply.split(/###\s*text\s*[:：]?/i);
  if (parts.length < 2) {
    return undefined;
  }
  const scene = parts[parts.length - 1]
    .replace(/^[\s"']+/, '')
    .replace(/[\s"']+$/, '');
  return scene.length > 0 ? scene : undefined;
}

function writeImageFile(base64: string): string {
  fs.mkdirSync(env.imageDirectory, { recursive: true });
  const buf = Buffer.from(base64, 'base64');
  // DashScope's wan* models return PNG, OpenAI-compatible providers return
  // JPEG — pick the extension from the actual magic bytes so the served
  // Content-Type matches the content.
  const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const ext = isJpeg ? 'jpg' : 'png';
  const fileName = `sentence-image-${createId('img')}.${ext}`;
  const absolutePath = path.join(env.imageDirectory, fileName);
  fs.writeFileSync(absolutePath, buf);
  return fileName;
}