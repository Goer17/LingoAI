import fs from 'node:fs';
import path from 'node:path';
import { sentenceImageRepository } from '../db/repositories.js';
import { createSentenceImagePrompt } from '../prompts/sentenceImagePrompt.js';
import { createMatchSentencePrompt } from '../prompts/matchSentencePrompt.js';
import { generateImageBase64, matchSentenceCandidates } from './openaiService.js';
import { getMediaUrl } from './audioService.js';
import { createId } from '../utils/id.js';
import { env } from '../config/env.js';
import type { SentenceImage } from '../types/models.js';

const FUZZY_MATCH_CANDIDATE_LIMIT = 24;

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

export async function getOrCreateSentenceImage(sentence: string, force = false): Promise<SentenceImageResult> {
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

  const base64 = await generateImageBase64(createSentenceImagePrompt(sentence));
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

function writeImageFile(base64: string): string {
  fs.mkdirSync(env.imageDirectory, { recursive: true });
  const fileName = `sentence-image-${createId('img')}.jpg`;
  const absolutePath = path.join(env.imageDirectory, fileName);
  fs.writeFileSync(absolutePath, Buffer.from(base64, 'base64'));
  return fileName;
}