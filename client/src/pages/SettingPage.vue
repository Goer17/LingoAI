<template>
  <section class="card settings-card">
    <div class="section-heading">
      <p class="eyebrow">Configuration</p>
      <h1>Model Settings</h1>
      <p class="subtle-copy">These values stay on the server and are reused by search, audio, and quiz APIs.</p>
    </div>

    <form class="settings-grid" @submit.prevent="save">
      <label class="field">
        <span>Base URL</span>
        <input v-model="settings.form.baseUrl" type="url" placeholder="https://api.example.com/v1" required />
      </label>
      <label class="field">
        <span>API Key</span>
        <input v-model="settings.form.apiKey" type="password" placeholder="sk-..." required />
      </label>
      <label class="field">
        <span>Language Model</span>
        <input v-model="settings.form.languageModel" type="text" placeholder="gpt-5.4" required />
      </label>
      <label class="field">
        <span>Audio Model</span>
        <input v-model="settings.form.audioModel" type="text" placeholder="tts-1-hd" required />
      </label>
      <div class="settings-footer">
        <div>
          <p class="subtle-copy">Last updated</p>
          <strong>{{ settings.form.updatedAt ? formatDate(settings.form.updatedAt) : 'Not saved yet' }}</strong>
        </div>
        <button class="button button-primary" type="submit" :disabled="settings.saving">
          {{ settings.saving ? 'Saving...' : 'Save Settings' }}
        </button>
      </div>
    </form>

    <p v-if="message" class="success-text">{{ message }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const message = ref('');
const error = ref('');

onMounted(async () => {
  try {
    await settings.fetchSettings();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load settings.';
  }
});

async function save() {
  message.value = '';
  error.value = '';
  try {
    await settings.saveSettings();
    message.value = 'Settings saved.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save settings.';
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
</script>
