<template>
  <section class="settings-page stack">
    <header class="settings-hero card">
      <p class="eyebrow">Configuration</p>
      <h1>Model Providers</h1>
      <p class="subtle-copy">
        Manage the model endpoints used across LingoAI. Add as many entries as you like to each category, activate the ones you want to use, and drag active entries to set their priority.
        Every call tries models from top to bottom and falls back to the next one when it fails.
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
            <span v-if="activeCount(group.key) > 0">
              Active: <strong class="model-active-chain">{{ activeSummary(group.key) }}</strong>
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
            v-for="entry in getCategory(group.key).entries"
            :key="entry.id"
            class="model-entry"
            :class="{
              'model-entry-active': isActive(group.key, entry.id),
              'is-dragging': dragState?.id === entry.id,
              'is-drop-target': dropTargetId === entry.id,
            }"
            @dragover.prevent="onDragOver(group.key, entry.id, $event)"
            @drop.prevent="onDrop(group.key, entry.id, $event)"
          >
            <span
              class="model-drag-handle"
              :class="{ 'is-disabled': !isActive(group.key, entry.id) }"
              :draggable="isActive(group.key, entry.id)"
              :title="isActive(group.key, entry.id) ? 'Drag to change priority' : 'Inactive models are ordered after active ones and cannot be moved'"
              @dragstart="onDragStart(group.key, entry.id, $event)"
              @dragend="onDragEnd"
            >⠿</span>
            <label class="model-entry-main">
              <span class="model-entry-title-row">
                <span
                  v-if="isActive(group.key, entry.id)"
                  class="model-priority-badge"
                  :title="`Priority ${priorityOf(group.key, entry.id)}`"
                >{{ priorityOf(group.key, entry.id) }}</span>
                <span class="model-entry-title">{{ entry.model || `Untitled model #${entryIndex(group.key, entry.id) + 1}` }}</span>
                <span class="model-entry-status">
                  {{ isActive(group.key, entry.id) ? 'Active' : 'Inactive' }}
                </span>
              </span>
              <span class="model-entry-sub">{{ entry.baseUrl || 'No Base URL' }}</span>
              <span
                v-if="testResults[entry.id]"
                class="model-entry-test"
                :class="testStatusClass(entry.id)"
              >
                {{ testStatusLabel(entry.id) }}
              </span>
            </label>
            <label class="toggle model-toggle" :title="isActive(group.key, entry.id) ? 'Deactivate this model' : 'Activate this model'">
              <input
                type="checkbox"
                :checked="isActive(group.key, entry.id)"
                @change="toggleActive(group.key, entry.id)"
              />
              <span class="toggle-track" aria-hidden="true"></span>
              <span class="toggle-label">{{ isActive(group.key, entry.id) ? 'On' : 'Off' }}</span>
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

    <article class="card more-card">
      <header class="more-card-head">
        <span class="model-category-icon" v-html="MORE_ICON"></span>
        <div class="more-card-title">
          <h2>More</h2>
          <p class="subtle-copy">Additional app settings.</p>
        </div>
      </header>
      <div class="more-settings">
        <div class="more-setting-row">
          <div class="more-setting-text">
            <strong>Image Auto Generation</strong>
            <p class="subtle-copy">
              When enabled, each new vocabulary word you add is queued to automatically generate an image for its example sentences (uses the active image model).
            </p>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              v-model="settings.form.autoImageGeneration"
            />
            <span class="toggle-track" aria-hidden="true"></span>
            <span class="toggle-label">{{ settings.form.autoImageGeneration ? 'On' : 'Off' }}</span>
          </label>
        </div>

        <div class="more-setting-row">
          <div class="more-setting-text">
            <strong>Vocabulary Quiz Max Questions</strong>
            <p class="subtle-copy">
              Maximum number of questions in each generated vocabulary quiz (1-50).
            </p>
          </div>
          <input
            class="more-setting-input"
            type="number"
            min="1"
            max="50"
            v-model.number="settings.form.quizMaxQuestions!.vocabulary"
          />
        </div>

        <div class="more-setting-row">
          <div class="more-setting-text">
            <strong>Listening Quiz Max Questions</strong>
            <p class="subtle-copy">
              Maximum number of questions in each generated listening quiz (1-50).
            </p>
          </div>
          <input
            class="more-setting-input"
            type="number"
            min="1"
            max="50"
            v-model.number="settings.form.quizMaxQuestions!.listening"
          />
        </div>

        <div class="more-setting-row">
          <div class="more-setting-text">
            <strong>Daily Auto Quiz</strong>
            <p class="subtle-copy">
              When enabled, a vocabulary quiz and a listening quiz (from a random topic with more than one sentence) are generated automatically every day at 06:00.
              Expression practice auto-generation is not included yet.
            </p>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              v-model="settings.form.autoDailyQuiz"
            />
            <span class="toggle-track" aria-hidden="true"></span>
            <span class="toggle-label">{{ settings.form.autoDailyQuiz ? 'On' : 'Off' }}</span>
          </label>
        </div>
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

const MORE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>`;

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
    description: 'Generates illustrations for vocabulary example sentences and quiz hint images (1024×1024, realistic style).',
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
    for (const key of Object.keys(settings.form.models) as SettingsModelCategoryKey[]) {
      normalizeCategoryOrder(settings.form.models[key]);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load settings.';
  }
});

function getCategory(key: SettingsModelCategoryKey): SettingsModelCategory {
  return settings.form.models[key];
}

function isActive(key: SettingsModelCategoryKey, id: string): boolean {
  return getCategory(key).activeIds.includes(id);
}

function activeCount(key: SettingsModelCategoryKey): number {
  return getCategory(key).activeIds.length;
}

/** Position within the display list (active first, then inactive). */
function entryIndex(key: SettingsModelCategoryKey, id: string): number {
  return getCategory(key).entries.findIndex((entry) => entry.id === id);
}

/** 1-based priority rank, or null when the entry is inactive. */
function priorityOf(key: SettingsModelCategoryKey, id: string): number | null {
  const index = getCategory(key).activeIds.indexOf(id);
  return index === -1 ? null : index + 1;
}

/** Active models joined by '›' — the order they will be tried in. */
function activeSummary(key: SettingsModelCategoryKey): string {
  const category = getCategory(key);
  return category.activeIds
    .map((id) => category.entries.find((entry) => entry.id === id))
    .filter((entry): entry is SettingsModelEntry => !!entry)
    .map((entry) => entry.model || 'Untitled model')
    .join(' › ');
}

/**
 * Keep entries in display order: active models first (in `activeIds` priority
 * order), then inactive models in their existing relative order.
 */
function normalizeCategoryOrder(category: SettingsModelCategory) {
  const byId = new Map(category.entries.map((entry) => [entry.id, entry]));
  const inactive = category.entries.filter((entry) => !category.activeIds.includes(entry.id));
  category.entries = [
    ...category.activeIds.map((id) => byId.get(id)).filter((entry): entry is SettingsModelEntry => !!entry),
    ...inactive,
  ];
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
  if (category.activeIds.length === 0) {
    category.activeIds = [entry.id];
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
  if (category.activeIds.includes(id)) {
    category.activeIds = category.activeIds.filter((activeId) => activeId !== id);
  }
}

/**
 * Activate / deactivate a model. The row always sinks to the correct position:
 * activating appends it at the end of the active block (lowest priority),
 * deactivating moves it to the end of the inactive block.
 */
function toggleActive(key: SettingsModelCategoryKey, id: string) {
  const category = getCategory(key);
  const position = category.activeIds.indexOf(id);
  if (position !== -1) {
    category.activeIds = category.activeIds.filter((activeId) => activeId !== id);
    const index = category.entries.findIndex((entry) => entry.id === id);
    if (index !== -1) {
      const [removed] = category.entries.splice(index, 1);
      category.entries.push(removed);
    }
    return;
  }

  category.activeIds = [...category.activeIds, id];
  const index = category.entries.findIndex((entry) => entry.id === id);
  if (index !== -1) {
    const [removed] = category.entries.splice(index, 1);
    const firstInactive = category.entries.findIndex((entry) => !category.activeIds.includes(entry.id));
    if (firstInactive === -1) {
      category.entries.push(removed);
    } else {
      category.entries.splice(firstInactive, 0, removed);
    }
  }
}

// Drag & drop reordering of active models. Inactive models are never
// draggable and always stay at the end of the list.
const dragState = ref<{ key: SettingsModelCategoryKey; id: string } | null>(null);
const dropTargetId = ref<string | null>(null);

function onDragStart(key: SettingsModelCategoryKey, id: string, event: DragEvent) {
  if (!isActive(key, id)) {
    event.preventDefault();
    return;
  }
  dragState.value = { key, id };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  }
}

function onDragOver(key: SettingsModelCategoryKey, targetId: string, _event: DragEvent) {
  if (!dragState.value || dragState.value.key !== key || !isActive(key, targetId)) {
    return;
  }
  if (dropTargetId.value !== targetId) {
    dropTargetId.value = targetId;
  }
}

function onDrop(key: SettingsModelCategoryKey, targetId: string, event: DragEvent) {
  event.preventDefault();
  const source = dragState.value;
  dragState.value = null;
  dropTargetId.value = null;
  if (!source || source.key !== key || source.id === targetId) {
    return;
  }
  reorderActive(key, source.id, targetId);
}

function onDragEnd() {
  dragState.value = null;
  dropTargetId.value = null;
}

/** Move `sourceId` to `targetId`'s slot within the active block. */
function reorderActive(key: SettingsModelCategoryKey, sourceId: string, targetId: string) {
  const category = getCategory(key);
  const activeIds = [...category.activeIds];
  const fromIndex = activeIds.indexOf(sourceId);
  const toIndex = activeIds.indexOf(targetId);
  if (fromIndex === -1 || toIndex === -1) {
    return;
  }
  activeIds.splice(fromIndex, 1);
  activeIds.splice(toIndex, 0, sourceId);
  category.activeIds = activeIds;

  normalizeCategoryOrder(category);
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
