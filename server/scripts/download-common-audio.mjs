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

// Global rate limiter: a min-interval gate so we don't trip Youdao's throttle.
// Unlike a promise-chain queue, this keeps true concurrency (workers race,
// each gates its own request) instead of serializing every request.
const MIN_REQUEST_INTERVAL = 80; // ms → max ~12.5 req/s
let nextAllowedAt = 0;

async function rateLimit() {
  const now = Date.now();
  const wait = Math.max(0, nextAllowedAt - now);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  nextAllowedAt = Math.max(now, nextAllowedAt) + MIN_REQUEST_INTERVAL;
}

async function pause(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function downloadOne(word, { quick = false } = {}) {
  const file = path.join(outDir, `${word}.mp3`);
  let lastErr;
  let attempt = 0;
  // For words known to 500 from previous runs (names/typos/gibberish), try
  // once with no backoff — re-trying them is just wasted clock time.
  const attempts = quick ? 1 : retries + 1;
  while (attempt < attempts) {
    try {
      await rateLimit();
      const res = await fetch(BASE + encodeURIComponent(word));
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
  let lastLogAt = 0;

  // Words that failed in earlier builds (any missing file within the original
  // list prefix) are almost certainly permanent Youdao 500s — do not hammer them.
  const OLD_LIST_COUNT = 46717;
  const knownBad = new Set();
  for (let i = 0; i < Math.min(OLD_LIST_COUNT, words.length); i++) {
    if (!hasValidFile(words[i])) {
      knownBad.add(words[i]);
    }
  }
  if (knownBad.size > 0 && verbose) {
    console.log(`known-bad words (single-attempt): ${knownBad.size}`);
  }

  function logProgress() {
    const elapsed = ((Date.now() - started) / 1000).toFixed(0);
    const rate = (index / Math.max(1, elapsed)).toFixed(1);
    console.log(
      `[${elapsed}s] ${downloaded} downloaded, ${skipped} skipped, ${failed} failed, ${index}/${total} (~${rate} words/s)`,
    );
  }

  async function worker() {
    while (index < total) {
      const word = slice[index++];
      if (hasValidFile(word)) {
        skipped++;
        continue;
      }
      await downloadOne(word, { quick: knownBad.has(word) });
      const now = Date.now();
      // Heartbeat once a minute so progress is visible even with no new downloads.
      if (now - lastLogAt > 60000 || (downloaded > 0 && downloaded % 200 === 0)) {
        lastLogAt = now;
        logProgress();
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