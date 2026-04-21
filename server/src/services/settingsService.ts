import { settingsRepository } from '../db/repositories.js';
import type { Settings } from '../types/models.js';

export function getSettings(): Settings {
  return settingsRepository.get() ?? {
    baseUrl: '',
    apiKey: '',
    languageModel: '',
    audioModel: '',
    updatedAt: null,
  };
}

export function saveSettings(settings: Settings) {
  settingsRepository.upsert(settings);
  return getSettings();
}
