/**
 * One-time data task: download pronunciation MP3s for all common words.
 *
 * Source: Youdao dictvoice (type=2 = American English).
 * Output: server/data/audio/common/{word}.mp3
 *
 * Idempotent — skips words that already have a valid file, so it can be
 * re-run to resume after an interruption.
 *
 * Usage:
 *   node scripts/download-common-audio.mjs            # down to audio dir
 *   node scripts/download-common-audio.mjs --limit 50 # only first 50
 *   node scripts/download-common-audio.mjs --concurrency 8
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const wordsPath = path.join(repoRoot, 'src', 'data', 'common-words.json');
const outDir = process.env.AUDIO_DIR
  ?? path.join(repoRoot, 'data', 'audio', 'common');

const args = process.argv.slice(2);
const limit = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '', 10);
const concurrency = parseInt(args.find((a) => a.startsWith('--concurrency='))?.split('=')[1] ?? '', 10) || 8;

const words = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
const slice = Number.isFinite(limit) && limit > 0 ? words.slice(0, limit) : words;

fs.mkdirSync(outDir, { recursive: true });

const BASE = 'https://dict.youdao.com/dictvoice?type=2&audio=';

let downloaded = 0;
let skipped = 0;
let failed = 0;
const failures = [];

function hasValidFile(word) {
  const file = path.join(outDir, `${word}.mp3`);
  try {
    return fs.statSync(file).size > 1000;
  } catch {
    return false;
  }
}

async function downloadOne(word) {
  const file = path.join(outDir, `${word}.mp3`);
  try {
    const res = await fetch(BASE + encodeURIComponent(word));
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) {
      throw new Error('too small');
    }
    fs.writeFileSync(file, buf);
    downloaded++;
  } catch (err) {
    failed++;
    failures.push(`${word}: ${err.message}`);
  }
}

async function run() {
  let index = 0;
  const total = slice.length;
  const started = Date.now();

  async function worker() {
    while (index < total) {
      const word = slice[index++];
      if (hasValidFile(word)) {
        skipped++;
        continue;
      }
      await downloadOne(word);
      if (downloaded % 200 === 0) {
        const elapsed = ((Date.now() - started) / 1000).toFixed(0);
        console.log(
          `[${elapsed}s] ${downloaded} downloaded, ${skipped} skipped, ${failed} failed, ${index}/${total}`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  const elapsed = ((Date.now() - started) / 1000).toFixed(0);
  console.log('\nDone.');
  console.log(`  words: ${total}`);
  console.log(`  downloaded: ${downloaded}`);
  console.log(`  skipped: ${skipped}`);
  console.log(`  failed: ${failed}`);
  if (failures.length) {
    fs.writeFileSync(path.join(outDir, '_failures.txt'), failures.join('\n'));
    console.log(`  failures written to ${path.join(outDir, '_failures.txt')}`);
    console.log('  first failures:', failures.slice(0, 10));
  }
}

run();