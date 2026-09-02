/**
 * Pre-generate spliced (compound) audio for every multi-word vocabulary entry
 * already saved in the database, so they play without TTS.
 *
 * Usage (after `npm run build` so dist/ exists):
 *   node scripts/build-compound-audio.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCompoundAudio, tokenizePhrase } from '../dist/services/compoundAudioService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const db = new DatabaseSync(path.join(repoRoot, 'data', 'lingoai.sqlite'));

const rows = db.prepare('SELECT text, tts_text FROM vocabulary_entries').all();
let built = 0;
let failed = 0;
let singleToken = 0;

for (const row of rows) {
  const input = row.tts_text || row.text;
  const tokens = tokenizePhrase(input);
  if (tokens.length < 2) {
    singleToken++;
    continue;
  }
  try {
    const url = await buildCompoundAudio(input);
    if (url) {
      built++;
      console.log(`OK   ${input.padEnd(24)} → ${url}`);
    } else {
      failed++;
      console.log(`FAIL ${input} (→ TTS)`);
    }
  } catch (err) {
    failed++;
    console.log(`FAIL ${input} (${err.message})`);
  }
}

console.log(`\nDone: built=${built} failed=${failed} single-token=${singleToken}`);