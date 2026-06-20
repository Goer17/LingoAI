import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/services/api';
import type { SettingsForm } from '@/types/models';

function emptyForm(): SettingsForm {
  return {
    models: {
      language: { entries: [], activeId: null },
      audio: { entries: [], activeId: null },
      image: { entries: [], activeId: null },
    },
    updatedAt: null,
  };
}

export const useSettingsStore = defineStore('settings', () => {
  const form = reactive<SettingsForm>(emptyForm());
  const loading = ref(false);
  const saving = ref(false);

  function applyData(data: SettingsForm) {
    form.models = data.models;
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
      const data = await api.saveSettings({ models: form.models });
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
