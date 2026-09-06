import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getActiveModelEntry } from './settingsService.js';
import { generateAudioBase64 } from './openaiService.js';
import { env } from '../config/env.js';

const AUDIO_CACHE_LIMIT = 2 ** 10;

class LruAudioCache {
  private readonly store = new Map<string, string>();

  get(key: string) {
    const value = this.store.get(key);
    if (!value) {
      return null;
    }

    this.store.delete(key);
    this.store.set(key, value);
    return value;
  }

  set(key: string, value: string) {
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, value);

    if (this.store.size <= AUDIO_CACHE_LIMIT) {
      return;
    }

    const oldestKey = this.store.keys().next().value;
    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  delete(key: string) {
    this.store.delete(key);
  }
}

const audioDataUrlCache = new LruAudioCache();
const MEDIA_ROUTE_PREFIX = '/api/media';

function getCacheKey(input: string) {
  const entry = getActiveModelEntry('audio');
  return [
    entry?.baseUrl ?? '',
    entry?.model ?? '',
    input.trim(),
  ].join('::');
}

export async function createAudioDataUrl(input: string, force = false) {
  if (!force) {
    const key = getCacheKey(input);
    const cached = audioDataUrlCache.get(key);
    if (cached) {
      return cached;
    }
  }

  const base64 = await generateAudioBase64(input);
  const audioUrl = `data:${detectAudioMime(base64)};base64,${base64}`;
  const key = getCacheKey(input);
  audioDataUrlCache.set(key, audioUrl);
  return audioUrl;
}

/**
 * TTS providers return either MP3 (OpenAI-compatible /audio/speech) or WAV
 * (DashScope native SpeechSynthesizer). Tag the data URL with the real
 * format so browsers decode it correctly instead of assuming MP3.
 */
function detectAudioMime(base64: string): string {
  // Decode enough base64 to cover the 12-byte RIFF header.
  const head = Buffer.from(base64.slice(0, 16), 'base64');
  if (head.length >= 12 && head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WAVE') {
    return 'audio/wav';
  }
  return 'audio/mpeg';
}

function ensureAudioDirectory() {
  fs.mkdirSync(env.audioDirectory, { recursive: true });
}

function getAudioFilePath(fileName: string) {
  return path.join(env.audioDirectory, path.basename(fileName));
}

export function getMediaUrl(fileName: string) {
  return `${MEDIA_ROUTE_PREFIX}/${encodeURIComponent(path.basename(fileName))}`;
}

export function audioFileExists(fileName: string) {
  return fs.existsSync(getAudioFilePath(fileName));
}

export async function createOrUpdateAudioFile(fileName: string, input: string) {
  ensureAudioDirectory();
  const absolutePath = getAudioFilePath(fileName);
  if (fs.existsSync(absolutePath)) {
    return absolutePath;
  }

  const base64 = await generateAudioBase64(input);
  fs.writeFileSync(absolutePath, Buffer.from(base64, 'base64'));
  return absolutePath;
}

/**
 * Stable file name for a generated clip so the same text is only ever
 * synthesized once (even across quizzes) and served from disk instead of
 * embedding megabytes of base64 audio in the quiz session payload.
 */
function quizAudioFileName(input: string): string {
  const hash = createHash('sha1').update(input.trim()).digest('hex').slice(0, 16);
  return `quiz-${hash}.mp3`;
}

/**
 * Generate (or reuse) TTS audio for a quiz question and return a media URL
 * (`/api/media/quiz-*.mp3`) rather than a base64 data URL. This keeps
 * quiz session payloads small and lets express.static serve the clip.
 */
export async function createQuizAudioUrl(input: string, force = false): Promise<string> {
  const fileName = quizAudioFileName(input);
  if (force) {
    const absolutePath = getAudioFilePath(fileName);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
    audioDataUrlCache.delete(getCacheKey(input));
  }

  await createOrUpdateAudioFile(fileName, input);
  return getMediaUrl(fileName);
}

export function deleteAudioFile(fileName?: string) {
  if (!fileName) {
    return;
  }

  const absolutePath = getAudioFilePath(fileName);
  if (!fs.existsSync(absolutePath)) {
    return;
  }

  fs.unlinkSync(absolutePath);
}
