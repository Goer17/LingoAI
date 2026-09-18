import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pronunciationsPath = path.join(__dirname, '..', 'data', 'common-pronunciations.json');

// Loaded once at startup like common-words.json. The map is keyed by lowercase
// word (phrases are never stored: they are spliced from token transcriptions).
let pronunciationMap: Record<string, string> = {};
try {
  pronunciationMap = JSON.parse(fs.readFileSync(pronunciationsPath, 'utf8'));
} catch {
  // Missing/incomplete data file: the app still works, it just falls back to
  // the LLM-generated transcription.
}

/** Raw IPA without the surrounding slashes, or null when unknown. */
export function getCommonPronunciation(word: string): string | null {
  const normalized = word.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return pronunciationMap[normalized] ?? null;
}

export function hasCommonPronunciation(word: string): boolean {
  return getCommonPronunciation(word) !== null;
}

/**
 * Resolve the IPA transcription for a word or phrase:
 * - exact hit ("door")            → "/dɔːr/"
 * - phrase ("take over")          → splice token transcriptions → "/teɪk ˈoʊvər/"
 * - otherwise null — callers keep the LLM-generated value.
 *
 * This mirrors the common → tts audio chain: the local data is authoritative
 * when present, and everything else (LLM audio/TTS) is untouched.
 */
export function resolvePronunciation(text: string): string | null {
  const value = getCommonPronunciation(text);
  if (value !== null) {
    return `/${value}/`;
  }

  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return null;
  }

  const parts: string[] = [];
  for (const token of tokens) {
    const ipa = getCommonPronunciation(token);
    if (ipa === null) {
      return null;
    }
    // Spliced phrases take the first variant only (Youdao separates weak/strong
    // forms with ";") — "have a brush with" must not become "hæv; həv ə; eɪ …".
    parts.push(ipa.split(';')[0].trim());
  }
  return `/${parts.join(' ')}/`;
}