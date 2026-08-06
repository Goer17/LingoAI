import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

const commonAudioDir = path.join(env.audioDirectory, 'common');

export function hasCommonAudio(word: string): boolean {
  const normalized = word.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const file = path.join(commonAudioDir, `${normalized}.mp3`);
  try {
    return fs.statSync(file).size > 1000;
  } catch {
    return false;
  }
}

export function getCommonAudioUrl(word: string): string {
  return `/api/media/common/${encodeURIComponent(word.trim().toLowerCase())}.mp3`;
}