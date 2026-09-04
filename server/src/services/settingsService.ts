import { settingsRepository } from '../db/repositories.js';
import type { Settings, SettingsModelCategory, SettingsModelEntry } from '../types/models.js';

const REDACTED_API_KEY = '********';

export function getSettings(): Settings {
  const stored = settingsRepository.get();
  return {
    models: stored?.models ?? {
      language: { entries: [], activeId: null },
      audio: { entries: [], activeId: null },
      image: { entries: [], activeId: null },
    },
    autoImageGeneration: stored?.autoImageGeneration ?? false,
    quizMaxQuestions: {
      vocabulary: normalizeQuestionLimit(stored?.quizMaxQuestions?.vocabulary),
      listening: normalizeQuestionLimit(stored?.quizMaxQuestions?.listening),
    },
    autoDailyQuiz: stored?.autoDailyQuiz ?? false,
    updatedAt: stored?.updatedAt ?? null,
  };
}

/** Clamp a quiz question limit to a sane range (1-50). */
function normalizeQuestionLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 10;
  }
  return Math.min(50, Math.max(1, Math.round(value)));
}

export function getRedactedSettings(): Settings {
  const settings = getSettings();
  return {
    ...settings,
    models: {
      language: redactCategory(settings.models.language),
      audio: redactCategory(settings.models.audio),
      image: redactCategory(settings.models.image),
    },
  };
}

function redactCategory(category: SettingsModelCategory): SettingsModelCategory {
  return {
    activeId: category.activeId,
    entries: category.entries.map((entry) => ({
      ...entry,
      apiKey: entry.apiKey ? REDACTED_API_KEY : '',
      extraBody: entry.extraBody ?? '',
    })),
  };
}

function mergeCategoryWithStored(
  incoming: SettingsModelCategory,
  stored: SettingsModelCategory,
): SettingsModelCategory {
  const storedById = new Map(stored.entries.map((entry) => [entry.id, entry]));

  const entries: SettingsModelEntry[] = incoming.entries.map((entry) => {
    const previous = storedById.get(entry.id);
    const apiKey = entry.apiKey === REDACTED_API_KEY && previous ? previous.apiKey : entry.apiKey;
    return {
      id: entry.id,
      baseUrl: entry.baseUrl,
      apiKey,
      model: entry.model,
      extraBody: entry.extraBody ?? '',
    };
  });

  const validIds = new Set(entries.map((entry) => entry.id));
  const activeId = incoming.activeId && validIds.has(incoming.activeId) ? incoming.activeId : null;

  return { entries, activeId };
}

export function saveSettings(incoming: Settings) {
  const current = getSettings();
  const next: Settings = {
    models: {
      language: mergeCategoryWithStored(incoming.models.language, current.models.language),
      audio: mergeCategoryWithStored(incoming.models.audio, current.models.audio),
      image: mergeCategoryWithStored(incoming.models.image, current.models.image),
    },
    autoImageGeneration: incoming.autoImageGeneration ?? current.autoImageGeneration ?? false,
    quizMaxQuestions: {
      vocabulary: normalizeQuestionLimit(incoming.quizMaxQuestions?.vocabulary),
      listening: normalizeQuestionLimit(incoming.quizMaxQuestions?.listening),
    },
    autoDailyQuiz: incoming.autoDailyQuiz ?? current.autoDailyQuiz ?? false,
    updatedAt: new Date().toISOString(),
  };

  settingsRepository.upsert(next);
  return getRedactedSettings();
}

export function getActiveModelEntry(
  category: 'language' | 'audio' | 'image',
): SettingsModelEntry | null {
  const settings = getSettings();
  const group = settings.models[category];
  if (!group.activeId) {
    return null;
  }
  return group.entries.find((entry) => entry.id === group.activeId) ?? null;
}
