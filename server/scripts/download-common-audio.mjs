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
 *   node scripts/download-common-audio.mjs --retries 3
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
const retries = parseInt(args.find((a) => a.startsWith('--retries='))?.split('=')[1] ?? '', 10) || 2;
const verbose = args.includes('--verbose');

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

// Global rate limiter: space out requests so we don't trip Youdao's throttle.
const MIN_REQUEST_INTERVAL = 90; // ms → max ~11 req/s
let lastRequestAt = 0;
let rateQueue = Promise.resolve();

function rateLimited(fn) {
  const run = rateQueue.then(async () => {
    const wait = Math.max(0, lastRequestAt + MIN_REQUEST_INTERVAL - Date.now());
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    lastRequestAt = Date.now();
    return fn();
  });
  rateQueue = run.catch(() => {});
  return run;
}

async function pause(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function downloadOne(word) {
  const file = path.join(outDir, `${word}.mp3`);
  let lastErr;
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const res = await rateLimited(() => fetch(BASE + encodeURIComponent(word)));
      if (res.status === 429 || res.status === 500 || res.status === 503) {
        // Rate-limited / transient server error: exponential backoff (+ Retry-After).
        const retryAfter = Number(res.headers.get('retry-after'));
        const waitMs = Math.max(
          (Number.isFinite(retryAfter) ? retryAfter * 1000 : 0),
          1000 * 2 ** attempt,
        );
        await pause(waitMs);
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) {
        throw new Error('too small');
      }
      fs.writeFileSync(file, buf);
      downloaded++;
      return;
    } catch (err) {
      lastErr = err;
    }
    attempt++;
  }
  failed++;
  failures.push(`${word}: ${lastErr?.message ?? 'unknown'}`);
  if (verbose) {
    console.error(`  FAIL ${word} (${lastErr?.message})`);
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
        const rate = (index / Math.max(1, elapsed)).toFixed(1);
        console.log(
          `[${elapsed}s] ${downloaded} downloaded, ${skipped} skipped, ${failed} failed, ${index}/${total} (~${rate} words/s)`,
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
  } else {
    // Previous _failures.txt entries that succeeded this run are now stale.
    try {
      fs.unlinkSync(path.join(outDir, '_failures.txt'));
    } catch {}
  }
}

run();