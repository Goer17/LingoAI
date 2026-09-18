/**
 * One-time data task: backfill the transcribed IPA for vocabulary entries that
 * already have a local common-audio pronunciation. Only touches entries where
 * the local IPA differs from the stored (LLM-generated) transcription; audio
 * files are never touched.
 *
 * Phrase entries ("take over") get their transcription spliced from the
 * per-token values, exactly like the runtime resolver.
 *
 * Usage:
 *   node scripts/backfill-pronunciations.mjs               # apply
 *   node scripts/backfill-pronunciations.mjs --dry-run     # report only
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const mapPath = path.join(repoRoot, 'src', 'data', 'common-pronunciations.json');
const dbPath = process.env.DB_PATH ?? path.join(repoRoot, 'data', 'lingoai.sqlite');

const dryRun = process.argv.includes('--dry-run');

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

function getCommonPronunciation(word) {
  return map[word.trim().toLowerCase()] ?? null;
}

function resolvePronunciation(text) {
  const value = getCommonPronunciation(text);
  if (value !== null) {
    return `/${value}/`;
  }
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return null;
  }
  const parts = [];
  for (const token of tokens) {
    const ipa = getCommonPronunciation(token);
    if (ipa === null) {
      return null;
    }
    // Spliced phrases take the first variant only (matches the runtime resolver).
    parts.push(ipa.split(';')[0].trim());
  }
  return `/${parts.join(' ')}/`;
}

const db = new DatabaseSync(dbPath);
const rows = db.prepare('SELECT id, text, pronunciation FROM vocabulary_entries').all();

let updated = 0;
const samples = [];
for (const row of rows) {
  const resolved = resolvePronunciation(row.text);
  if (!resolved || resolved === row.pronunciation) {
    continue;
  }
  updated++;
  if (samples.length < 10) {
    samples.push(`${row.text}: ${row.pronunciation} -> ${resolved}`);
  }
  if (!dryRun) {
    db.prepare('UPDATE vocabulary_entries SET pronunciation = ? WHERE id = ?').run(resolved, row.id);
  }
}

console.log(`entries scanned: ${rows.length}`);
console.log(`${dryRun ? 'would update' : 'updated'}: ${updated}`);
if (samples.length) {
  console.log('samples:');
  for (const s of samples) {
    console.log(`  ${s}`);
  }
}