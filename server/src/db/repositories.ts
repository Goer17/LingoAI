import { db } from './database.js';
import type { QuizSession, Settings, VocabularyEntry } from '../types/models.js';

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export const settingsRepository = {
  get(): Settings | null {
    const row = db.prepare(`
      SELECT base_url, api_key, language_model, audio_model, updated_at
      FROM settings
      WHERE id = 1
    `).get() as {
      base_url: string;
      api_key: string;
      language_model: string;
      audio_model: string;
      updated_at: string | null;
    } | undefined;

    if (!row) {
      return null;
    }

    return {
      baseUrl: row.base_url,
      apiKey: row.api_key,
      languageModel: row.language_model,
      audioModel: row.audio_model,
      updatedAt: row.updated_at,
    };
  },

  upsert(settings: Settings) {
    db.prepare(`
      INSERT INTO settings (id, base_url, api_key, language_model, audio_model, updated_at)
      VALUES (1, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        base_url = excluded.base_url,
        api_key = excluded.api_key,
        language_model = excluded.language_model,
        audio_model = excluded.audio_model,
        updated_at = excluded.updated_at
    `).run(
      settings.baseUrl,
      settings.apiKey,
      settings.languageModel,
      settings.audioModel,
      settings.updatedAt,
    );
  },
};

export const metaRepository = {
  get(key: string): string | null {
    const row = db.prepare(`
      SELECT value
      FROM app_meta
      WHERE key = ?
    `).get(key) as { value: string } | undefined;

    return row?.value ?? null;
  },

  set(key: string, value: string) {
    db.prepare(`
      INSERT INTO app_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value
    `).run(key, value);
  },
};

export const vocabularyRepository = {
  list(): VocabularyEntry[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM vocabulary_entries
      ORDER BY familiarity ASC, created_at DESC
    `).all() as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<VocabularyEntry>(row.payload_json));
  },

  getById(id: string): VocabularyEntry | null {
    const row = db.prepare(`
      SELECT payload_json
      FROM vocabulary_entries
      WHERE id = ?
    `).get(id) as { payload_json: string } | undefined;

    return row ? parseJson<VocabularyEntry>(row.payload_json) : null;
  },

  getByNormalizedText(normalizedText: string): VocabularyEntry | null {
    const row = db.prepare(`
      SELECT payload_json
      FROM vocabulary_entries
      WHERE normalized_text = ?
    `).get(normalizedText) as { payload_json: string } | undefined;

    return row ? parseJson<VocabularyEntry>(row.payload_json) : null;
  },

  save(entry: VocabularyEntry) {
    db.prepare(`
      INSERT INTO vocabulary_entries (
        id, text, normalized_text, type, familiarity, created_at, updated_at, note, pronunciation, tts_text, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        text = excluded.text,
        normalized_text = excluded.normalized_text,
        type = excluded.type,
        familiarity = excluded.familiarity,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        note = excluded.note,
        pronunciation = excluded.pronunciation,
        tts_text = excluded.tts_text,
        payload_json = excluded.payload_json
    `).run(
      entry.id,
      entry.text,
      entry.text.trim().toLowerCase(),
      entry.type,
      entry.familiarity,
      entry.createdAt,
      entry.updatedAt,
      entry.note,
      entry.pronunciation,
      entry.ttsText,
      JSON.stringify(entry),
    );
  },

  remove(id: string) {
    db.prepare('DELETE FROM vocabulary_entries WHERE id = ?').run(id);
  },
};

export const quizRepository = {
  list(): QuizSession[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM quiz_sessions
      ORDER BY created_at DESC
    `).all() as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<QuizSession>(row.payload_json));
  },

  getById(id: string): QuizSession | null {
    const row = db.prepare(`
      SELECT payload_json
      FROM quiz_sessions
      WHERE id = ?
    `).get(id) as { payload_json: string } | undefined;

    return row ? parseJson<QuizSession>(row.payload_json) : null;
  },

  save(session: QuizSession) {
    db.prepare(`
      INSERT INTO quiz_sessions (id, created_at, current_index, completed, payload_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        created_at = excluded.created_at,
        current_index = excluded.current_index,
        completed = excluded.completed,
        payload_json = excluded.payload_json
    `).run(
      session.id,
      session.createdAt,
      session.currentIndex,
      session.completed ? 1 : 0,
      JSON.stringify(session),
    );
  },
};
