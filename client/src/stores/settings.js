import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/services/api';
export const useSettingsStore = defineStore('settings', () => {
    const form = reactive({
        baseUrl: '',
        apiKey: '',
        languageModel: '',
        audioModel: '',
        updatedAt: null,
    });
    const loading = ref(false);
    const saving = ref(false);
    async function fetchSettings() {
        loading.value = true;
        try {
            const data = await api.getSettings();
            Object.assign(form, data);
        }
        finally {
            loading.value = false;
        }
    }
    async function saveSettings() {
        saving.value = true;
        try {
            const data = await api.saveSettings({
                baseUrl: form.baseUrl,
                apiKey: form.apiKey,
                languageModel: form.languageModel,
                audioModel: form.audioModel,
            });
            Object.assign(form, data);
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
