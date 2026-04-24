import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { env } from '../config/env.js';
import { ensureDir } from '../utils/fs.js';

ensureDir(env.databasePath);
if (!fs.existsSync(env.databasePath)) {
  fs.closeSync(fs.openSync(env.databasePath, 'w'));
}

export const db = new DatabaseSync(env.databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    base_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    language_model TEXT NOT NULL,
    audio_model TEXT NOT NULL,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vocabulary_entries (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    normalized_text TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    familiarity INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    note TEXT NOT NULL,
    pronunciation TEXT NOT NULL,
    tts_text TEXT NOT NULL,
    payload_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    source_type TEXT NOT NULL,
    current_index INTEGER NOT NULL,
    completed INTEGER NOT NULL,
    payload_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS learning_tasks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    quiz_session_id TEXT,
    question_count INTEGER NOT NULL,
    error TEXT,
    payload_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mistake_entries (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    type TEXT NOT NULL,
    word TEXT NOT NULL,
    payload_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS listening_entries (
    id TEXT PRIMARY KEY,
    sentence TEXT NOT NULL,
    normalized_sentence TEXT NOT NULL UNIQUE,
    familiarity INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_vocabulary_order
    ON vocabulary_entries (familiarity ASC, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_learning_tasks_created
    ON learning_tasks (created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_mistake_entries_created
    ON mistake_entries (created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_listening_entries_order
    ON listening_entries (familiarity ASC, created_at DESC);
`);

try {
  db.exec(`
    ALTER TABLE quiz_sessions
    ADD COLUMN source_type TEXT NOT NULL DEFAULT 'vocabulary_task';
  `);
} catch {
  // Column already exists.
}
