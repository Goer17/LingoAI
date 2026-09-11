import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/services/api';
import type { SettingsForm, SettingsModelCategory, SettingsModelEntry } from '@/types/models';

function emptyForm(): SettingsForm {
  return {
    models: {
      language: { entries: [], activeIds: [] },
      audio: { entries: [], activeIds: [] },
      image: { entries: [], activeIds: [] },
    },
    autoImageGeneration: false,
    quizMaxQuestions: { vocabulary: 10, listening: 10 },
    autoDailyQuiz: false,
    updatedAt: null,
  };
}

/**
 * Normalize a category received from the server into `{ entries, activeIds }`.
 * Tolerates the legacy single-selection format (`activeId`) and missing
 * categories so the settings page never crashes on stale payloads.
 */
function normalizeCategory(
  raw: SettingsModelCategory & { activeId?: string | null } | undefined,
): SettingsModelCategory {
  if (!raw || !Array.isArray(raw.entries)) {
    return { entries: [], activeIds: [] };
  }
  const entries: SettingsModelEntry[] = raw.entries;
  const knownIds = new Set(entries.map((entry) => entry.id));
  let activeIds = Array.isArray(raw.activeIds)
    ? [...new Set(raw.activeIds.filter((id): id is string => typeof id === 'string' && knownIds.has(id)))]
    : [];
  if (activeIds.length === 0 && typeof raw.activeId === 'string' && knownIds.has(raw.activeId)) {
    activeIds = [raw.activeId];
  }
  return { entries, activeIds };
}

export const useSettingsStore = defineStore('settings', () => {
  const form = reactive<SettingsForm>(emptyForm());
  const loading = ref(false);
  const saving = ref(false);

  function applyData(data: SettingsForm) {
    form.models = {
      language: normalizeCategory(data.models?.language),
      audio: normalizeCategory(data.models?.audio),
      image: normalizeCategory(data.models?.image),
    };
    form.autoImageGeneration = data.autoImageGeneration ?? false;
    form.quizMaxQuestions = data.quizMaxQuestions ?? { vocabulary: 10, listening: 10 };
    form.autoDailyQuiz = data.autoDailyQuiz ?? false;
    form.updatedAt = data.updatedAt;
  }

  async function fetchSettings() {
    loading.value = true;
    try {
      const data = await api.getSettings();
      applyData(data);
    } finally {
      loading.value = false;
    }
  }

  async function saveSettings() {
    saving.value = true;
    try {
      const data = await api.saveSettings({
        models: form.models,
        autoImageGeneration: form.autoImageGeneration,
        quizMaxQuestions: form.quizMaxQuestions,
        autoDailyQuiz: form.autoDailyQuiz,
      });
      applyData(data);
    } finally {
      saving.value = false;
    }
  }

  return {
    form,
    loading,
    saving,
    fetchSettings,
    saveSettings,
  };
});
