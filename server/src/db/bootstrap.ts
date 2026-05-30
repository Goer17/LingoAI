import fs from 'node:fs';
import { env } from '../config/env.js';
import { metaRepository, settingsRepository, quizRepository, taskRepository, vocabularyRepository } from './repositories.js';
import type { QuizSession, Settings, VocabularyEntry } from '../types/models.js';

const LEGACY_IMPORT_MARKER = 'legacy_json_import_v1';

function readJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as T;
}

export function bootstrapDatabase() {
  if (!settingsRepository.get()) {
    const migrated = readJsonIfExists<Settings>(env.legacySettingsPath);
    settingsRepository.upsert(migrated ?? {
      baseUrl: '',
      apiKey: '',
      languageModel: '',
      audioModel: '',
      updatedAt: null,
    });
  }

  if (metaRepository.get(LEGACY_IMPORT_MARKER) !== 'done') {
    const vocabulary = readJsonIfExists<VocabularyEntry[]>(env.legacyVocabularyPath) ?? [];
    for (const entry of vocabulary) {
      vocabularyRepository.save(entry);
    }

    const sessions = readJsonIfExists<QuizSession[]>(env.legacyQuizSessionsPath) ?? [];
    for (const session of sessions) {
      quizRepository.save({
        ...session,
        sourceType: session.sourceType ?? 'vocabulary_task',
      });
    }

    metaRepository.set(LEGACY_IMPORT_MARKER, 'done');
  }
}
