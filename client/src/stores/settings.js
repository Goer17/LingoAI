import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/services/api';
function emptyForm() {
    return {
        models: {
            language: { entries: [], activeId: null },
            audio: { entries: [], activeId: null },
            image: { entries: [], activeId: null },
        },
        autoImageGeneration: false,
        updatedAt: null,
    };
}
export const useSettingsStore = defineStore('settings', () => {
    const form = reactive(emptyForm());
    const loading = ref(false);
    const saving = ref(false);
    function applyData(data) {
        form.models = data.models;
        form.autoImageGeneration = data.autoImageGeneration ?? false;
        form.updatedAt = data.updatedAt;
    }
    async function fetchSettings() {
        loading.value = true;
        try {
            const data = await api.getSettings();
            applyData(data);
        }
        finally {
            loading.value = false;
        }
    }
    async function saveSettings() {
        saving.value = true;
        try {
            const data = await api.saveSettings({ models: form.models, autoImageGeneration: form.autoImageGeneration });
            applyData(data);
        }
        finally {
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
