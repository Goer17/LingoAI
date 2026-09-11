import { settingsRepository } from '../db/repositories.js';
import type { Settings, SettingsModelCategory, SettingsModelEntry } from '../types/models.js';

const REDACTED_API_KEY = '********';

function emptyCategory(): SettingsModelCategory {
  return { entries: [], activeIds: [] };
}

export function getSettings(): Settings {
  const stored = settingsRepository.get();
  return {
    models: stored?.models ?? {
      language: emptyCategory(),
      audio: emptyCategory(),
      image: emptyCategory(),
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
    activeIds: category.activeIds,
    entries: category.entries.map((entry) => ({
      ...entry,
      apiKey: entry.apiKey ? REDACTED_API_KEY : '',
      extraBody: entry.extraBody ?? '',
    })),
  };
}

/**
 * Category as sent by the client. `activeId` is the legacy single-selection
 * field older clients may still send — accept it as a fallback so a save
 * from a stale tab cannot silently deactivate every model.
 */
interface IncomingModelCategory {
  entries: SettingsModelEntry[];
  activeIds?: string[];
  activeId?: string | null;
}

interface IncomingSettings {
  models: {
    language: IncomingModelCategory;
    audio: IncomingModelCategory;
    image: IncomingModelCategory;
  };
  autoImageGeneration?: boolean;
  quizMaxQuestions?: {
    vocabulary?: number;
    listening?: number;
  };
  autoDailyQuiz?: boolean;
  updatedAt?: string | null;
}

function mergeCategoryWithStored(
  incoming: IncomingModelCategory,
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
  // Priority order comes from activeIds; filter out ids that vanished and
  // dedupe while preserving the client's order.
  let activeIds = [...new Set((incoming.activeIds ?? []).filter((id) => validIds.has(id)))];
  if (activeIds.length === 0 && incoming.activeId && validIds.has(incoming.activeId)) {
    activeIds = [incoming.activeId];
  }

  return { entries, activeIds };
}

export function saveSettings(incoming: IncomingSettings) {
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

/**
 * Active model entries for a category in priority order (best first).
 * Only the configured ones — callers use this list to try each model in
 * order and fall back to the next one when a call fails.
 */
export function getActiveModelEntries(
  category: 'language' | 'audio' | 'image',
): SettingsModelEntry[] {
  const settings = getSettings();
  const group = settings.models[category];
  const byId = new Map(group.entries.map((entry) => [entry.id, entry]));
  const order = [...new Set(group.activeIds ?? [])].filter((id) => byId.has(id));
  return order
    .map((id) => byId.get(id))
    .filter((entry): entry is SettingsModelEntry => !!entry)
    .filter((entry) => entry.baseUrl && entry.apiKey && entry.model);
}

/** Highest-priority active entry, or null. Kept for cache keys and tests. */
export function getActiveModelEntry(
  category: 'language' | 'audio' | 'image',
): SettingsModelEntry | null {
  return getActiveModelEntries(category)[0] ?? null;
}
