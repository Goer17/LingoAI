/**
 * One-off migration: quiz sessions (and mistake entries) previously embedded
 * full base64 WAV audio (`data:audio/wav;base64,...`) as `audioUrl` on every
 * listening question, ballooning payloads to 1-4MB. This rewrites them to
 * file-backed `/api/media/quiz-<hash>.mp3` URLs, using the exact same file
 * naming as `createQuizAudioUrl()` in audioService so already-written files
 * are reused and the DB stops storing megabytes of audio.
 *
 * Processes rows one at a time to stay within a small memory footprint.
 *
 * Usage: node scripts/migrate-quiz-audio-files.mjs
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const db = new DatabaseSync(path.join(repoRoot, 'data', 'lingoai.sqlite'));
const audioDir = path.join(repoRoot, 'data', 'audio');

db.exec('PRAGMA busy_timeout = 5000;');
fs.mkdirSync(audioDir, { recursive: true });

function quizAudioFileName(input) {
  const hash = createHash('sha1').update(input.trim()).digest('hex').slice(0, 16);
  return `quiz-${hash}.mp3`;
}

/** @returns {string | null} file name, or null when the audioUrl is not a data URL. */
function migrateAudioUrl(audioUrl, fallbackText) {
  if (typeof audioUrl !== 'string' || !audioUrl.startsWith('data:')) {
    return null;
  }

  const base64 = audioUrl.slice(audioUrl.indexOf(',') + 1);
  const input = (fallbackText && String(fallbackText).trim()) || 'audio';
  const fileName = quizAudioFileName(input);
  const absolutePath = path.join(audioDir, fileName);
  if (!fs.existsSync(absolutePath)) {
    fs.writeFileSync(absolutePath, Buffer.from(base64, 'base64'));
  }
  return fileName;
}

function migrateQuestions(questions) {
  let migrated = 0;
  for (const question of Array.isArray(questions) ? questions : []) {
    if (!question || typeof question.audioUrl !== 'string' || !question.audioUrl.startsWith('data:')) {
      continue;
    }
    const fileName = migrateAudioUrl(question.audioUrl, question.ttsText || question.sentence || question.word);
    if (fileName) {
      question.audioUrl = `/api/media/${encodeURIComponent(fileName)}`;
      migrated += 1;
    }
  }
  return migrated;
}

const summary = { quizSessions: 0, quizQuestionsMigrated: 0, mistakesMigrated: 0, bytesFreed: 0 };

// Quiz sessions — one row at a time.
const quizIds = db.prepare('SELECT id FROM quiz_sessions').all().map((row) => row.id);
const getQuiz = db.prepare('SELECT length(payload_json) AS bytes, payload_json FROM quiz_sessions WHERE id = ?');
const updateQuiz = db.prepare('UPDATE quiz_sessions SET payload_json = ? WHERE id = ?');
for (const id of quizIds) {
  const row = getQuiz.get(id);
  if (!row) {
    continue;
  }

  let payload;
  try {
    payload = JSON.parse(row.payload_json);
  } catch {
    continue;
  }

  const migrated = migrateQuestions(payload.questions);
  if (migrated === 0) {
    continue;
  }

  const nextJson = JSON.stringify(payload);
  updateQuiz.run(nextJson, id);
  summary.quizSessions += 1;
  summary.quizQuestionsMigrated += migrated;
  summary.bytesFreed += row.bytes - nextJson.length;
  payload = null;
  console.log(`  quiz ${id.slice(0, 18)}… ${Math.round(row.bytes / 1024)}KB -> ${Math.round(nextJson.length / 1024)}KB (${migrated} audio migrated)`);
}

// Mistake entries — same shape as a question, one row at a time.
const mistakeIds = db.prepare('SELECT id FROM mistake_entries').all().map((row) => row.id);
const getMistake = db.prepare('SELECT length(payload_json) AS bytes, payload_json FROM mistake_entries WHERE id = ?');
const updateMistake = db.prepare('UPDATE mistake_entries SET payload_json = ? WHERE id = ?');
for (const id of mistakeIds) {
  const row = getMistake.get(id);
  if (!row) {
    continue;
  }

  let payload;
  try {
    payload = JSON.parse(row.payload_json);
  } catch {
    continue;
  }

  const fileName = typeof payload.audioUrl === 'string'
    ? migrateAudioUrl(payload.audioUrl, payload.ttsText || payload.sentence || payload.word)
    : null;
  if (!fileName) {
    continue;
  }

  payload.audioUrl = `/api/media/${encodeURIComponent(fileName)}`;
  const nextJson = JSON.stringify(payload);
  updateMistake.run(nextJson, id);
  summary.mistakesMigrated += 1;
  summary.bytesFreed += row.bytes - nextJson.length;
}

console.log('Migration summary:');
console.log(`  quiz sessions rewritten:        ${summary.quizSessions}`);
console.log(`  quiz questions audio migrated:  ${summary.quizQuestionsMigrated}`);
console.log(`  mistake entries migrated:       ${summary.mistakesMigrated}`);
console.log(`  DB bytes freed:                 ${(summary.bytesFreed / 1024).toFixed(0)} KB`);