<template>
  <section class="settings-page stack">
    <header class="settings-hero card">
      <p class="eyebrow">Configuration</p>
      <h1>Model Providers</h1>
      <p class="subtle-copy">
        Manage the model endpoints used across LingoAI. Add as many entries as you like to each category, then pick one to mark it active.
      </p>
      <div class="settings-meta">
        <span class="settings-meta-label">Last saved</span>
        <span class="settings-meta-value">{{ settings.form.updatedAt ? formatDate(settings.form.updatedAt) : 'Not saved yet' }}</span>
      </div>
    </header>

    <p v-if="message" class="success-text">{{ message }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <article
      v-for="group in categoryGroups"
      :key="group.key"
      class="card model-category"
      :class="{ 'is-collapsed': !expanded[group.key] }"
    >
      <button
        type="button"
        class="model-category-head"
        :aria-expanded="expanded[group.key]"
        @click="toggleExpanded(group.key)"
      >
        <span class="model-category-icon" aria-hidden="true" v-html="group.icon"></span>
        <div class="model-category-head-main">
          <h2>{{ group.title }}</h2>
          <p class="subtle-copy">
            <span v-if="activeEntry(group.key)">
              Active: <strong>{{ activeEntry(group.key)?.model || 'Untitled model' }}</strong>
            </span>
            <span v-else>No model active</span>
            <span class="model-category-divider">·</span>
            {{ getCategory(group.key).entries.length }}
            {{ getCategory(group.key).entries.length === 1 ? 'entry' : 'entries' }}
          </p>
        </div>
        <span class="model-category-chevron" aria-hidden="true">
          {{ expanded[group.key] ? '−' : '+' }}
        </span>
      </button>

      <div v-if="expanded[group.key]" class="model-category-body">
        <div class="model-category-toolbar">
          <p class="muted-text">{{ group.description }}</p>
          <button
            class="button button-secondary"
            type="button"
            @click="addEntry(group.key)"
          >
            + Add Model
          </button>
        </div>

        <div
          v-if="getCategory(group.key).entries.length === 0"
          class="model-empty"
        >
          No {{ group.shortLabel }} models yet. Add one to begin.
        </div>

        <ul v-else class="model-entry-list">
          <li
            v-for="(entry, index) in getCategory(group.key).entries"
            :key="entry.id"
            class="model-entry"
            :class="{ 'model-entry-active': getCategory(group.key).activeId === entry.id }"
          >
            <label class="model-radio">
              <input
                type="radio"
                :name="`active-${group.key}`"
                :value="entry.id"
                :checked="getCategory(group.key).activeId === entry.id"
                @change="setActive(group.key, entry.id)"
              />
              <span class="model-radio-indicator" aria-hidden="true"></span>
              <span class="model-radio-label">
                <span class="model-entry-title">{{ entry.model || `Untitled model #${index + 1}` }}</span>
                <span class="model-entry-sub">{{ entry.baseUrl || 'No Base URL' }}</span>
                <span
                  v-if="testResults[entry.id]"
                  class="model-entry-test"
                  :class="testStatusClass(entry.id)"
                >
                  {{ testStatusLabel(entry.id) }}
                </span>
              </span>
              <span class="model-entry-status">
                {{ getCategory(group.key).activeId === entry.id ? 'Active' : 'Inactive' }}
              </span>
            </label>
            <div class="model-entry-actions">
              <button
                class="button button-secondary button-tight"
                type="button"
                :disabled="testingId === entry.id"
                @click="runTest(group.key, entry.id)"
              >
                {{ testingId === entry.id ? 'Testing...' : 'Test' }}
              </button>
              <button
                class="button button-secondary button-tight"
                type="button"
                @click="openEdit(group.key, entry.id)"
              >
                Edit
              </button>
              <button
                class="icon-button danger"
                type="button"
                :title="`Remove ${group.shortLabel} model`"
                @click="removeEntry(group.key, entry.id)"
              >
                ×
              </button>
            </div>
          </li>
        </ul>
      </div>
    </article>

    <footer class="settings-actions">
      <p class="subtle-copy">
        Active models are written to the server when you save.
      </p>
      <button
        class="button button-primary"
        type="button"
        :disabled="settings.saving"
        @click="save"
      >
        {{ settings.saving ? 'Saving...' : 'Save Settings' }}
      </button>
    </footer>

    <div
      v-if="editing && editingDraft"
      class="modal-backdrop"
      @click.self="closeEdit"
    >
      <div class="modal-panel card" role="dialog" aria-modal="true">
        <header class="modal-head">
          <span class="modal-head-icon" aria-hidden="true" v-html="editingGroup?.icon ?? ''"></span>
          <div class="modal-head-text">
            <h2>Edit {{ editingGroup?.title }}</h2>
            <p class="subtle-copy">{{ editingGroup?.description }}</p>
          </div>
        </header>

        <div class="modal-body">
          <label class="field">
            <span>Base URL</span>
            <input
              v-model="editingDraft.baseUrl"
              type="url"
              placeholder="https://api.example.com/v1"
            />
          </label>
          <label class="field">
            <span>API Key</span>
            <input
              v-model="editingDraft.apiKey"
              type="password"
              autocomplete="off"
              placeholder="sk-..."
              @focus="clearMaskedKey(editingDraft)"
            />
          </label>
          <label class="field">
            <span>Model</span>
            <input
              v-model="editingDraft.model"
              type="text"
              :placeholder="editingGroup?.modelPlaceholder"
            />
          </label>
          <label class="field">
            <span>Extra body (JSON)</span>
            <textarea
              v-model="editingDraft.extraBody"
              class="field-textarea"
              rows="3"
              placeholder='{"temperature": 0.5, "max_tokens": 200}'
            />
            <p class="field-hint">Optional JSON key-values merged into every request body.</p>
          </label>
        </div>

        <footer class="modal-actions">
          <button class="button button-secondary" type="button" @click="closeEdit">
            Cancel
          </button>
          <button class="button button-primary" type="button" @click="applyEdit">
            Apply
          </button>
        </footer>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { api } from '@/services/api';
import type {
  SettingsModelCategory,
  SettingsModelCategoryKey,
  SettingsModelEntry,
} from '@/types/models';

const settings = useSettingsStore();
const message = ref('');
const error = ref('');

interface TestResult {
  ok: boolean;
  latencyMs: number;
  sample?: string;
  error?: string;
}

const testingId = ref<string | null>(null);
const testResults = reactive<Record<string, TestResult>>({});

interface CategoryGroup {
  key: SettingsModelCategoryKey;
  title: string;
  shortLabel: string;
  description: string;
  modelPlaceholder: string;
  icon: string;
}

const LANGUAGE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h10"/><path d="M9 3v2"/><path d="M5 5c0 4 2.5 7 6 8"/><path d="M13 5c0 3-3 6-7 8"/><path d="M13 20l4-10 4 10"/><path d="M14.5 17h5"/></svg>`;

const AUDIO_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M9 21h6"/></svg>`;

const IMAGE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-8 9"/></svg>`;

const categoryGroups: CategoryGroup[] = [
  {
    key: 'language',
    title: 'Language Model',
    shortLabel: 'language',
    description: 'Powers search, tutoring chat, quiz generation, and writing scenarios.',
    modelPlaceholder: 'e.g. gpt-5.4',
    icon: LANGUAGE_ICON,
  },
  {
    key: 'audio',
    title: 'Audio Model',
    shortLabel: 'audio',
    description: 'Text-to-speech model used for pronunciation and listening drills.',
    modelPlaceholder: 'e.g. tts-1-hd',
    icon: AUDIO_ICON,
  },
  {
    key: 'image',
    title: 'Image Generation Model',
    shortLabel: 'image',
    description: 'Reserved for upcoming image-generation features. Configure now to keep settings ready.',
    modelPlaceholder: 'e.g. dall-e-3',
    icon: IMAGE_ICON,
  },
];

const expanded = reactive<Record<SettingsModelCategoryKey, boolean>>({
  language: false,
  audio: false,
  image: false,
});

const editing = ref<{ key: SettingsModelCategoryKey; id: string } | null>(null);
const editingDraft = ref<SettingsModelEntry | null>(null);
const editingGroup = ref<CategoryGroup | null>(null);

onMounted(async () => {
  try {
    await settings.fetchSettings();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load settings.';
  }
});

function getCategory(key: SettingsModelCategoryKey): SettingsModelCategory {
  return settings.form.models[key];
}

function activeEntry(key: SettingsModelCategoryKey): SettingsModelEntry | null {
  const category = getCategory(key);
  return category.entries.find((entry) => entry.id === category.activeId) ?? null;
}

function toggleExpanded(key: SettingsModelCategoryKey) {
  expanded[key] = !expanded[key];
}

function createEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `mdl-${crypto.randomUUID()}`;
  }
  return `mdl-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function addEntry(key: SettingsModelCategoryKey) {
  const category = getCategory(key);
  const entry: SettingsModelEntry = {
    id: createEntryId(),
    baseUrl: '',
    apiKey: '',
    model: '',
    extraBody: '',
  };
  category.entries.push(entry);
  if (!category.activeId) {
    category.activeId = entry.id;
  }
  expanded[key] = true;
  openEdit(key, entry.id);
  message.value = '';
}

function removeEntry(key: SettingsModelCategoryKey, id: string) {
  const category = getCategory(key);
  const index = category.entries.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return;
  }
  category.entries.splice(index, 1);
  if (category.activeId === id) {
    category.activeId = category.entries[0]?.id ?? null;
  }
}

function setActive(key: SettingsModelCategoryKey, id: string) {
  getCategory(key).activeId = id;
}

function clearMaskedKey(entry: SettingsModelEntry) {
  if (entry.apiKey === '********') {
    entry.apiKey = '';
  }
}

function openEdit(key: SettingsModelCategoryKey, id: string) {
  const entry = getCategory(key).entries.find((item) => item.id === id);
  if (!entry) {
    return;
  }
  editing.value = { key, id };
  editingDraft.value = { ...entry };
  editingGroup.value = categoryGroups.find((g) => g.key === key) ?? null;
}

function closeEdit() {
  editing.value = null;
  editingDraft.value = null;
  editingGroup.value = null;
}

function applyEdit() {
  if (!editing.value || !editingDraft.value) {
    return;
  }
  const { key, id } = editing.value;
  const entry = getCategory(key).entries.find((item) => item.id === id);
  if (!entry) {
    closeEdit();
    return;
  }
  entry.baseUrl = editingDraft.value.baseUrl;
  entry.apiKey = editingDraft.value.apiKey;
  entry.model = editingDraft.value.model;
  entry.extraBody = editingDraft.value.extraBody;
  closeEdit();
}

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

async function runTest(key: SettingsModelCategoryKey, id: string) {
  if (testingId.value) {
    return;
  }
  const entry = getCategory(key).entries.find((item) => item.id === id);
  if (!entry) {
    return;
  }
  if (!entry.baseUrl || !entry.model) {
    testResults[id] = { ok: false, latencyMs: 0, error: 'Fill in Base URL and Model first.' };
    return;
  }
  try {
    await settings.saveSettings();
  } catch (err) {
    testResults[id] = {
      ok: false,
      latencyMs: 0,
      error: err instanceof Error ? err.message : 'Save failed before test.',
    };
    return;
  }
  testingId.value = id;
  try {
    const result = await api.testModelEntry(key, id);
    testResults[id] = result;
  } catch (err) {
    testResults[id] = {
      ok: false,
      latencyMs: 0,
      error: err instanceof Error ? err.message : 'Test failed.',
    };
  } finally {
    testingId.value = null;
  }
}

function testStatusClass(id: string) {
  const result = testResults[id];
  if (!result) {
    return '';
  }
  return result.ok ? 'is-ok' : 'is-fail';
}

function testStatusLabel(id: string) {
  const result = testResults[id];
  if (!result) {
    return '';
  }
  if (result.ok) {
    return `OK · ${result.latencyMs} ms${result.sample ? ` · ${result.sample}` : ''}`;
  }
  return `Fail · ${result.error ?? 'unknown error'}`;
}
</script>
