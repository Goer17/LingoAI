/**
 * One-time data task: download IPA transcriptions for all common words that
 * already have a local pronunciation audio file.
 *
 * Source: Youdao dict jsonapi (ec.word[0].usphone — American English, same
 * voice as the downloaded dictvoice audio). Phrases like "take over" return
 * no transcription from Youdao, so they are skipped here; the runtime service
 * splices per-token transcriptions instead.
 *
 * Output: server/src/data/common-pronunciations.json  { "word": "ipa", ... }
 * IPA values are stored WITHOUT surrounding slashes; the runtime service wraps
 * them ("/teɪk/") and splices phrases ("/teɪk ˈoʊvər/").
 *
 * Idempotent — skips words already present in the output file, so it can be
 * re-run to resume after an interruption.
 *
 * Usage:
 *   node scripts/download-common-pronunciations.mjs
 *   node scripts/download-common-pronunciations.mjs --limit 50
 *   node scripts/download-common-pronunciations.mjs --concurrency 8
 *   node scripts/download-common-pronunciations.mjs --audio-dir /path/to/common
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const wordsPath = path.join(repoRoot, 'src', 'data', 'common-words.json');
const outPath = path.join(repoRoot, 'src', 'data', 'common-pronunciations.json');
const audioDir = process.env.AUDIO_DIR
  ?? path.join(repoRoot, 'data', 'audio', 'common');

const args = process.argv.slice(2);
const argument = (name) => {
  const inline = args.find((a) => a.startsWith(`${name}=`))?.split('=')[1];
  if (inline !== undefined) {
    return inline;
  }
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
};
const limit = parseInt(argument('--limit') ?? '', 10);
const concurrency = parseInt(argument('--concurrency') ?? '', 10) || 8;
const verbose = args.includes('--verbose');
const retryFailures = args.includes('--retry-failures');

const words = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));

// Only words that actually have a local audio file: the app's pronunciation
// fallback chain mirrors the audio chain (has common audio -> use local IPA).
function hasAudioFile(word) {
  try {
    return fs.statSync(path.join(audioDir, `${word}.mp3`)).size > 1000;
  } catch {
    return false;
  }
}

let targets;
if (retryFailures) {
  // Re-run only the words that failed last time. Words Youdao genuinely has no
  // rhyme for (inflections like "years", abbreviations, names) fail again but
  // burn one request each; rate-limited ones usually succeed this round.
  const failuresPath = path.join(repoRoot, 'src', 'data', 'pronunciations-failures.txt');
  targets = fs.existsSync(failuresPath)
    ? fs.readFileSync(failuresPath, 'utf8').split('\n').map((w) => w.trim()).filter(Boolean)
    : [];
} else {
  targets = words.filter(hasAudioFile);
}
const slice = Number.isFinite(limit) && limit > 0 ? targets.slice(0, limit) : targets;

// Existing map (resume support). Preserve insertion order: later runs append
// in place, keeping the file stable instead of rewriting the whole map.
const existing = new Map();
if (fs.existsSync(outPath)) {
  for (const [word, ipa] of Object.entries(JSON.parse(fs.readFileSync(outPath, 'utf8')))) {
    existing.set(word, ipa);
  }
}

let downloaded = 0;
let skipped = 0;
let failed = 0;
const failures = [];

const BASE = 'https://dict.youdao.com/jsonapi?q=';

function parseIpa(body) {
  try {
    const data = JSON.parse(body);
    const word = Array.isArray(data?.ec?.word) ? data.ec.word[0] : null;
    if (!word) {
      return null;
    }
    // American English matches the type=2 dictvoice audio. UK is the fallback.
    return (typeof word.usphone === 'string' && word.usphone) || (typeof word.ukphone === 'string' && word.ukphone) || null;
  } catch {
    return null;
  }
}

// Global rate limiter (same pattern as download-common-audio.mjs).
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

async function fetchOne(word) {
  const attempts = 2;
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await rateLimit();
      const res = await fetch(BASE + encodeURIComponent(word), {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      });
      if (res.status === 429 || res.status === 500 || res.status === 503) {
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
      const ipa = parseIpa(await res.text());
      if (ipa) {
        return ipa;
      }
      // Streamed responses claim success but the JSON may lack the word.
      throw new Error('no IPA in response');
    } catch (err) {
      lastErr = err;
    }
  }
  return null;
}

async function run() {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  let index = 0;
  const total = slice.length;
  const started = Date.now();
  const progressEvery = Math.max(200, Math.floor(total / 100) || 200);
  let lastLogAt = 0;

  function logProgress() {
    const elapsed = ((Date.now() - started) / 1000).toFixed(0);
    const rate = (index / Math.max(1, elapsed)).toFixed(1);
    console.log(
      `[${elapsed}s] ${downloaded} new, ${skipped} skipped, ${failed} failed, ${index}/${total} (~${rate} words/s)`,
    );
  }

  async function worker() {
    while (index < total) {
      const word = slice[index++];
      if (existing.has(word)) {
        skipped++;
        continue;
      }
      const ipa = await fetchOne(word);
      const now = Date.now();
      if (ipa) {
        existing.set(word, ipa);
        downloaded++;
        if (downloaded % 25 === 0) {
          // Persist as we go: an interruption keeps everything fetched so far.
          fs.writeFileSync(outPath, JSON.stringify(Object.fromEntries(existing), null, 0));
        }
      } else {
        failed++;
        failures.push(word);
        if (verbose) {
          console.error(`  FAIL ${word}`);
        }
      }
      if (now - lastLogAt > 60000 || (downloaded > 0 && downloaded % progressEvery === 0)) {
        lastLogAt = now;
        logProgress();
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  // Final write (also covers the <25-new case and a zero-download run).
  fs.writeFileSync(outPath, JSON.stringify(Object.fromEntries(existing), null, 0));

  const elapsed = ((Date.now() - started) / 1000).toFixed(0);
  console.log('\nDone.');
  console.log(`  words with audio: ${targets.length}`);
  console.log(`  processed: ${total}`);
  console.log(`  downloaded: ${downloaded}`);
  console.log(`  skipped (already have): ${skipped}`);
  console.log(`  failed: ${failed}`);
  console.log(`  total in map: ${existing.size}`);
  console.log(`  wrote ${outPath} (${Math.round(fs.statSync(outPath).size / 1024)} KB) in ${elapsed}s`);
  if (failures.length) {
    fs.writeFileSync(path.join(path.dirname(outPath), 'pronunciations-failures.txt'), failures.join('\n'));
    console.log(`  failures written to src/data/pronunciations-failures.txt (${failures.length})`);
    console.log('  first failures:', failures.slice(0, 10).join(', '));
  }
}

run();