import { db } from './database.js';
import type { LearningTask, ListeningEntry, ListeningGroup, MistakeEntry, QuizSession, ReadingArticle, ReadingCategory, ReadingMark, SentenceImage, Settings, SettingsModelCategory, TutorMemory, TutorMessage, TutorSession, VocabularyEntry, WritingTopic } from '../types/models.js';

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

/** Sort entries so known ones always sink to the end, then by familiarity
 *  ascending and newest first (matches the SQL ORDER BY used before). */
function compareFamiliarity<T extends { known?: boolean; familiarity: number; createdAt: string }>(a: T, b: T) {
  return Number(Boolean(a.known)) - Number(Boolean(b.known))
    || a.familiarity - b.familiarity
    || b.createdAt.localeCompare(a.createdAt);
}

/**
 * Normalize a stored model category into `{ entries, activeIds }`.
 * Handles the legacy single-selection format (`activeId`) that older
 * installs may still have in `payload_json`, and drops ids that no longer
 * match any entry.
 */
function normalizeModelCategory(raw: unknown): SettingsModelCategory {
  if (!raw || typeof raw !== 'object') {
    return { entries: [], activeIds: [] };
  }
  const obj = raw as Partial<SettingsModelCategory> & { activeId?: unknown };
  const entries = Array.isArray(obj.entries) ? obj.entries : [];
  const knownIds = new Set(entries.map((entry) => entry.id));

  let activeIds: string[] = [];
  if (Array.isArray(obj.activeIds)) {
    activeIds = [...new Set(obj.activeIds.filter((id): id is string => typeof id === 'string' && knownIds.has(id)))];
  } else if (typeof obj.activeId === 'string' && knownIds.has(obj.activeId)) {
    activeIds = [obj.activeId];
  }

  return { entries, activeIds };
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
      ...parsed,
      models: {
        language: normalizeModelCategory(parsed.models?.language),
        audio: normalizeModelCategory(parsed.models?.audio),
        image: normalizeModelCategory(parsed.models?.image),
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
      JSON.stringify(settings),
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

    return rows
      .map((row) => parseJson<VocabularyEntry>(row.payload_json))
      .sort(compareFamiliarity);
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

export const listeningGroupRepository = {
  list(): ListeningGroup[] {
    const rows = db.prepare(`
      SELECT id, name, created_at, updated_at
      FROM listening_groups
      ORDER BY created_at ASC
    `).all() as Array<{ id: string; name: string; created_at: string; updated_at: string }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  getById(id: string): ListeningGroup | null {
    const row = db.prepare(`
      SELECT id, name, created_at, updated_at
      FROM listening_groups
      WHERE id = ?
    `).get(id) as { id: string; name: string; created_at: string; updated_at: string } | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  save(group: ListeningGroup) {
    db.prepare(`
      INSERT INTO listening_groups (id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        updated_at = excluded.updated_at
    `).run(group.id, group.name, group.createdAt, group.updatedAt);
  },

  remove(id: string) {
    db.prepare('DELETE FROM listening_groups WHERE id = ?').run(id);
  },
};

export const listeningRepository = {
  list(): ListeningEntry[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM listening_entries
      ORDER BY familiarity ASC, created_at DESC
    `).all() as Array<{ payload_json: string }>;

    return rows
      .map((row) => parseJson<ListeningEntry>(row.payload_json))
      .sort(compareFamiliarity);
  },

  listByGroup(groupId: string): ListeningEntry[] {
    const all = listeningRepository.list();
    return all.filter((entry) => (entry.groupId || '') === groupId);
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

export const sentenceImageRepository = {
  list(): SentenceImage[] {
    const rows = db.prepare(`
      SELECT id, normalized_sentence, sentence, image_file, created_at, updated_at
      FROM sentence_images
      ORDER BY updated_at DESC
    `).all() as Array<{ id: string; normalized_sentence: string; sentence: string; image_file: string; created_at: string; updated_at: string }>;

    return rows.map(toSentenceImage);
  },

  getByNormalizedSentence(normalizedSentence: string): SentenceImage | null {
    const row = db.prepare(`
      SELECT id, normalized_sentence, sentence, image_file, created_at, updated_at
      FROM sentence_images
      WHERE normalized_sentence = ?
    `).get(normalizedSentence) as { id: string; normalized_sentence: string; sentence: string; image_file: string; created_at: string; updated_at: string } | undefined;

    return row ? toSentenceImage(row) : null;
  },

  save(entry: SentenceImage) {
    db.prepare(`
      INSERT INTO sentence_images (id, normalized_sentence, sentence, image_file, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(normalized_sentence) DO UPDATE SET
        sentence = excluded.sentence,
        image_file = excluded.image_file,
        updated_at = excluded.updated_at
    `).run(
      entry.id,
      entry.normalizedSentence,
      entry.sentence,
      entry.imageFile,
      entry.createdAt,
      entry.updatedAt,
    );
  },
};

function toSentenceImage(row: { id: string; normalized_sentence: string; sentence: string; image_file: string; created_at: string; updated_at: string }): SentenceImage {
  return {
    id: row.id,
    normalizedSentence: row.normalized_sentence,
    sentence: row.sentence,
    imageFile: row.image_file,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

export const tutorSessionRepository = {
  list(): TutorSession[] {
    const rows = db.prepare(`
      SELECT
        s.id,
        s.title,
        s.created_at,
        s.updated_at,
        (SELECT COUNT(*) FROM tutor_messages m WHERE m.session_id = s.id) AS message_count,
        (
          SELECT m.content FROM tutor_messages m
          WHERE m.session_id = s.id
          ORDER BY m.created_at DESC, m.rowid DESC
          LIMIT 1
        ) AS preview
      FROM tutor_sessions s
      ORDER BY s.updated_at DESC
    `).all() as Array<{
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
      message_count: number;
      preview: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: Number(row.message_count) || 0,
      preview: row.preview ?? '',
    }));
  },

  getById(id: string): TutorSession | null {
    const row = db.prepare(`
      SELECT
        s.id,
        s.title,
        s.created_at,
        s.updated_at,
        (SELECT COUNT(*) FROM tutor_messages m WHERE m.session_id = s.id) AS message_count,
        (
          SELECT m.content FROM tutor_messages m
          WHERE m.session_id = s.id
          ORDER BY m.created_at DESC, m.rowid DESC
          LIMIT 1
        ) AS preview
      FROM tutor_sessions s
      WHERE s.id = ?
    `).get(id) as {
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
      message_count: number;
      preview: string | null;
    } | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: Number(row.message_count) || 0,
      preview: row.preview ?? '',
    };
  },

  save(session: Pick<TutorSession, 'id' | 'title' | 'createdAt' | 'updatedAt'>) {
    db.prepare(`
      INSERT INTO tutor_sessions (id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        updated_at = excluded.updated_at
    `).run(session.id, session.title, session.createdAt, session.updatedAt);
  },

  remove(id: string) {
    db.prepare('DELETE FROM tutor_messages WHERE session_id = ?').run(id);
    db.prepare('DELETE FROM tutor_sessions WHERE id = ?').run(id);
  },
};

export const tutorMessageRepository = {
  listBySession(sessionId: string): TutorMessage[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM tutor_messages
      WHERE session_id = ?
      ORDER BY created_at ASC, rowid ASC
    `).all(sessionId) as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<TutorMessage>(row.payload_json));
  },

  listRecent(sessionId: string, limit: number): TutorMessage[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM tutor_messages
      WHERE session_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `).all(sessionId, limit) as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<TutorMessage>(row.payload_json)).reverse();
  },

  save(sessionId: string, message: TutorMessage) {
    db.prepare(`
      INSERT INTO tutor_messages (id, session_id, role, content, created_at, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        role = excluded.role,
        content = excluded.content,
        created_at = excluded.created_at,
        payload_json = excluded.payload_json
    `).run(
      message.id,
      sessionId,
      message.role,
      message.content,
      message.createdAt,
      JSON.stringify(message),
    );
  },
};

export const tutorMemoryRepository = {
  list(): TutorMemory[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM tutor_memories
      ORDER BY created_at ASC, rowid ASC
    `).all() as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<TutorMemory>(row.payload_json));
  },

  getById(id: string): TutorMemory | null {
    const row = db.prepare(`
      SELECT payload_json
      FROM tutor_memories
      WHERE id = ?
    `).get(id) as { payload_json: string } | undefined;

    return row ? parseJson<TutorMemory>(row.payload_json) : null;
  },

  save(memory: TutorMemory) {
    db.prepare(`
      INSERT INTO tutor_memories (id, kind, content, created_at, updated_at, session_id, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        kind = excluded.kind,
        content = excluded.content,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        session_id = excluded.session_id,
        payload_json = excluded.payload_json
    `).run(
      memory.id,
      memory.kind,
      memory.content,
      memory.createdAt,
      memory.updatedAt,
      memory.sessionId ?? null,
      JSON.stringify(memory),
    );
  },

  remove(id: string) {
    db.prepare('DELETE FROM tutor_memories WHERE id = ?').run(id);
  },
};

export const readingCategoryRepository = {
  list(): ReadingCategory[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM reading_categories
      ORDER BY position ASC, created_at ASC
    `).all() as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<ReadingCategory>(row.payload_json));
  },

  getById(id: string): ReadingCategory | null {
    const row = db.prepare(`
      SELECT payload_json FROM reading_categories WHERE id = ?
    `).get(id) as { payload_json: string } | undefined;

    return row ? parseJson<ReadingCategory>(row.payload_json) : null;
  },

  getByName(name: string): ReadingCategory | null {
    const row = db.prepare(`
      SELECT payload_json FROM reading_categories WHERE lower(name) = lower(?)
    `).get(name.trim()) as { payload_json: string } | undefined;

    return row ? parseJson<ReadingCategory>(row.payload_json) : null;
  },

  save(category: ReadingCategory) {
    db.prepare(`
      INSERT INTO reading_categories (id, name, position, created_at, updated_at, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        position = excluded.position,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        payload_json = excluded.payload_json
    `).run(
      category.id,
      category.name,
      category.position,
      category.createdAt,
      category.updatedAt,
      JSON.stringify(category),
    );
  },

  remove(id: string) {
    db.prepare('DELETE FROM reading_categories WHERE id = ?').run(id);
  },
};

export const readingArticleRepository = {
  list(): ReadingArticle[] {
    const rows = db.prepare(`
      SELECT payload_json FROM reading_articles ORDER BY updated_at DESC
    `).all() as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<ReadingArticle>(row.payload_json));
  },

  listByCategory(categoryId: string): ReadingArticle[] {
    return readingArticleRepository.list().filter((article) => article.categoryId === categoryId);
  },

  getById(id: string): ReadingArticle | null {
    const row = db.prepare(`
      SELECT payload_json FROM reading_articles WHERE id = ?
    `).get(id) as { payload_json: string } | undefined;

    return row ? parseJson<ReadingArticle>(row.payload_json) : null;
  },

  save(article: ReadingArticle) {
    db.prepare(`
      INSERT INTO reading_articles (
        id, category_id, title, created_at, updated_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        category_id = excluded.category_id,
        title = excluded.title,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        payload_json = excluded.payload_json
    `).run(
      article.id,
      article.categoryId,
      article.title,
      article.createdAt,
      article.updatedAt,
      JSON.stringify(article),
    );
  },

  remove(id: string) {
    db.prepare('DELETE FROM reading_articles WHERE id = ?').run(id);
  },
};

export const readingMarkRepository = {
  listByArticle(articleId: string): ReadingMark[] {
    const rows = db.prepare(`
      SELECT payload_json
      FROM reading_marks
      WHERE article_id = ?
      ORDER BY paragraph_index ASC, start_offset ASC, created_at ASC
    `).all(articleId) as Array<{ payload_json: string }>;

    return rows.map((row) => parseJson<ReadingMark>(row.payload_json));
  },

  countByArticle(articleId: string): number {
    const row = db.prepare(`
      SELECT COUNT(*) AS count FROM reading_marks WHERE article_id = ?
    `).get(articleId) as { count: number } | undefined;

    return row?.count ?? 0;
  },

  getById(id: string): ReadingMark | null {
    const row = db.prepare(`
      SELECT payload_json FROM reading_marks WHERE id = ?
    `).get(id) as { payload_json: string } | undefined;

    return row ? parseJson<ReadingMark>(row.payload_json) : null;
  },

  save(mark: ReadingMark) {
    db.prepare(`
      INSERT INTO reading_marks (
        id, article_id, kind, paragraph_index, start_offset, end_offset,
        created_at, updated_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        article_id = excluded.article_id,
        kind = excluded.kind,
        paragraph_index = excluded.paragraph_index,
        start_offset = excluded.start_offset,
        end_offset = excluded.end_offset,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        payload_json = excluded.payload_json
    `).run(
      mark.id,
      mark.articleId,
      mark.kind,
      mark.paragraphIndex,
      mark.startOffset,
      mark.endOffset,
      mark.createdAt,
      mark.updatedAt,
      JSON.stringify(mark),
    );
  },

  remove(id: string) {
    db.prepare('DELETE FROM reading_marks WHERE id = ?').run(id);
  },

  removeByArticle(articleId: string) {
    db.prepare('DELETE FROM reading_marks WHERE article_id = ?').run(articleId);
  },
};
