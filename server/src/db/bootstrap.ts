import fs from 'node:fs';
import { env } from '../config/env.js';
import { metaRepository, settingsRepository, quizRepository, vocabularyRepository } from './repositories.js';
import { createId } from '../utils/id.js';
import type { QuizSession, Settings, VocabularyEntry } from '../types/models.js';

const LEGACY_IMPORT_MARKER = 'legacy_json_import_v1';

interface LegacySettings {
  baseUrl?: string;
  apiKey?: string;
  languageModel?: string;
  audioModel?: string;
  updatedAt?: string | null;
}

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

function emptySettings(): Settings {
  return {
    models: {
      language: { entries: [], activeId: null },
      audio: { entries: [], activeId: null },
      image: { entries: [], activeId: null },
    },
    updatedAt: null,
  };
}

function buildSettingsFromLegacy(legacy: LegacySettings): Settings {
  const settings = emptySettings();
  const sharedBaseUrl = legacy.baseUrl?.trim() ?? '';
  const sharedApiKey = legacy.apiKey?.trim() ?? '';

  if (legacy.languageModel) {
    const entry = {
      id: createId('mdl'),
      baseUrl: sharedBaseUrl,
      apiKey: sharedApiKey,
      model: legacy.languageModel,
    };
    settings.models.language.entries.push(entry);
    settings.models.language.activeId = entry.id;
  }

  if (legacy.audioModel) {
    const entry = {
      id: createId('mdl'),
      baseUrl: sharedBaseUrl,
      apiKey: sharedApiKey,
      model: legacy.audioModel,
    };
    settings.models.audio.entries.push(entry);
    settings.models.audio.activeId = entry.id;
  }

  settings.updatedAt = legacy.updatedAt ?? null;
  return settings;
}

export function bootstrapDatabase() {
  if (!settingsRepository.get()) {
    const migrated = readJsonIfExists<LegacySettings>(env.legacySettingsPath);
    settingsRepository.upsert(migrated ? buildSettingsFromLegacy(migrated) : emptySettings());
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
