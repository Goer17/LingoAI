import { db } from './database.js';
import type { LearningTask, ListeningEntry, MistakeEntry, QuizSession, Settings, VocabularyEntry, WritingTopic } from '../types/models.js';

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export const settingsRepository = {
  get(): Settings | null {
    const row = db.prepare(`
      SELECT payload_json, updated_at
      FROM settings
      WHERE id = 1
    `).get() as {
      payload_json: string;
      updated_at: string | null;
    } | undefined;

    if (!row) {
      return null;
    }

    let parsed: Partial<Settings>;
    try {
      parsed = row.payload_json ? (JSON.parse(row.payload_json) as Partial<Settings>) : {};
    } catch {
      parsed = {};
    }

    return {
      models: {
        language: parsed.models?.language ?? { entries: [], activeId: null },
        audio: parsed.models?.audio ?? { entries: [], activeId: null },
        image: parsed.models?.image ?? { entries: [], activeId: null },
      },
      updatedAt: row.updated_at,
    };
  },

  upsert(settings: Settings) {
    db.prepare(`
      INSERT INTO settings (id, base_url, api_key, language_model, audio_model, image_model, payload_json, updated_at)
      VALUES (1, '', '', '', '', '', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `).run(
      JSON.stringify({ models: settings.models }),
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
      INSERT INTO quiz_sessions (id, created_at, source_type, current_index, completed, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        created_at = excluded.created_at,
        source_type = excluded.source_type,
        current_index = excluded.current_index,
        completed = excluded.completed,
        payload_json = excluded.payload_json
    `).run(
      session.id,
      session.createdAt,
      session.sourceType,
      session.currentIndex,
      session.completed ? 1 : 0,
      JSON.stringify(session),
    );
  },
};

export const taskRepository = {
  list(): LearningTask[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM learning_tasks
      ORDER BY created_at DESC
    `).all() as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<LearningTask>(row.payload_json));
  },

  getById(id: string): LearningTask | null {
    const row = db.prepare(`
      SELECT payload_json
      FROM learning_tasks
      WHERE id = ?
    `).get(id) as { payload_json: string } | undefined;

    return row ? parseJson<LearningTask>(row.payload_json) : null;
  },

  save(task: LearningTask) {
    db.prepare(`
      INSERT INTO learning_tasks (id, type, status, created_at, updated_at, quiz_session_id, question_count, error, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        status = excluded.status,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        quiz_session_id = excluded.quiz_session_id,
        question_count = excluded.question_count,
        error = excluded.error,
        payload_json = excluded.payload_json
    `).run(
      task.id,
      task.type,
      task.status,
      task.createdAt,
      task.updatedAt,
      task.quizSessionId,
      task.questionCount,
      task.error,
      JSON.stringify(task),
    );
  },

  remove(id: string) {
    db.prepare('DELETE FROM learning_tasks WHERE id = ?').run(id);
  },

  removeByQuizSessionId(quizSessionId: string) {
    db.prepare('DELETE FROM learning_tasks WHERE quiz_session_id = ?').run(quizSessionId);
  },
};

export const mistakeRepository = {
  list(): MistakeEntry[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM mistake_entries
      ORDER BY created_at DESC
    `).all() as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<MistakeEntry>(row.payload_json));
  },

  getById(id: string): MistakeEntry | null {
    const row = db.prepare(`
      SELECT payload_json
      FROM mistake_entries
      WHERE id = ?
    `).get(id) as { payload_json: string } | undefined;

    return row ? parseJson<MistakeEntry>(row.payload_json) : null;
  },

  save(entry: MistakeEntry) {
    db.prepare(`
      INSERT INTO mistake_entries (id, created_at, updated_at, type, word, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        type = excluded.type,
        word = excluded.word,
        payload_json = excluded.payload_json
    `).run(
      entry.id,
      entry.createdAt,
      entry.updatedAt,
      entry.type,
      entry.word,
      JSON.stringify(entry),
    );
  },

  remove(id: string) {
    db.prepare('DELETE FROM mistake_entries WHERE id = ?').run(id);
  },
};

export const listeningRepository = {
  list(): ListeningEntry[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM listening_entries
      ORDER BY familiarity ASC, created_at DESC
    `).all() as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<ListeningEntry>(row.payload_json));
  },

  getById(id: string): ListeningEntry | null {
    const row = db.prepare(`
      SELECT payload_json
      FROM listening_entries
      WHERE id = ?
    `).get(id) as { payload_json: string } | undefined;

    return row ? parseJson<ListeningEntry>(row.payload_json) : null;
  },

  getByNormalizedSentence(normalizedSentence: string): ListeningEntry | null {
    const row = db.prepare(`
      SELECT payload_json
      FROM listening_entries
      WHERE normalized_sentence = ?
    `).get(normalizedSentence) as { payload_json: string } | undefined;

    return row ? parseJson<ListeningEntry>(row.payload_json) : null;
  },

  save(entry: ListeningEntry) {
    db.prepare(`
      INSERT INTO listening_entries (
        id, sentence, normalized_sentence, familiarity, created_at, updated_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        sentence = excluded.sentence,
        normalized_sentence = excluded.normalized_sentence,
        familiarity = excluded.familiarity,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        payload_json = excluded.payload_json
    `).run(
      entry.id,
      entry.sentence,
      entry.sentence.trim().toLowerCase(),
      entry.familiarity,
      entry.createdAt,
      entry.updatedAt,
      JSON.stringify(entry),
    );
  },

  remove(id: string) {
    db.prepare('DELETE FROM listening_entries WHERE id = ?').run(id);
  },
};

export const writingTopicRepository = {
  list(): WritingTopic[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM writing_topics
      ORDER BY created_at DESC
    `).all() as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<WritingTopic>(row.payload_json));
  },

  getById(id: string): WritingTopic | null {
    const row = db.prepare(`
      SELECT payload_json
      FROM writing_topics
      WHERE id = ?
    `).get(id) as { payload_json: string } | undefined;

    return row ? parseJson<WritingTopic>(row.payload_json) : null;
  },

  getByNormalizedTitle(normalizedTitle: string): WritingTopic | null {
    const row = db.prepare(`
      SELECT payload_json
      FROM writing_topics
      WHERE normalized_title = ?
    `).get(normalizedTitle) as { payload_json: string } | undefined;

    return row ? parseJson<WritingTopic>(row.payload_json) : null;
  },

  save(topic: WritingTopic) {
    db.prepare(`
      INSERT INTO writing_topics (
        id, normalized_title, created_at, updated_at, payload_json
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        normalized_title = excluded.normalized_title,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        payload_json = excluded.payload_json
    `).run(
      topic.id,
      topic.title.trim().toLowerCase(),
      topic.createdAt,
      topic.updatedAt,
      JSON.stringify(topic),
    );
  },

  remove(id: string) {
    db.prepare('DELETE FROM writing_topics WHERE id = ?').run(id);
  },
};
