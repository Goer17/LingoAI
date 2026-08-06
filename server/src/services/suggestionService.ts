import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wordsPath = path.join(__dirname, '..', 'data', 'common-words.json');

// The list is frequency-ordered (most common first), so prefix matches
// preserve a sensible ordering without extra computation.
const commonWords: string[] = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));

export function suggestWords(prefix: string, limit = 8): string[] {
  const normalized = prefix.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const matches: string[] = [];
  for (const word of commonWords) {
    if (word.startsWith(normalized)) {
      matches.push(word);
      if (matches.length >= limit) {
        break;
      }
    }
  }

  return matches;
}