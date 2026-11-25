<template>
  <section class="expression-page">
    <header class="expression-head">
      <div>
        <p class="eyebrow">Expression</p>
        <h2>Notes</h2>
      </div>
      <div class="expression-tabs" role="tablist" aria-label="Note type">
        <button
          class="expression-tab"
          :class="{ active: store.kind === 'grammar' }"
          type="button"
          role="tab"
          :aria-selected="store.kind === 'grammar'"
          @click="store.setKind('grammar')"
        >
          Grammar
        </button>
        <button
          class="expression-tab"
          :class="{ active: store.kind === 'topic' }"
          type="button"
          role="tab"
          :aria-selected="store.kind === 'topic'"
          @click="store.setKind('topic')"
        >
          Topics
        </button>
      </div>
    </header>

    <div class="expression-grid">
      <aside class="expression-list">
        <form class="expression-add" @submit.prevent="handleAdd">
          <input
            v-model="newTitle"
            type="text"
            :placeholder="store.kind === 'grammar' ? 'New grammar title' : 'New topic title'"
            :disabled="adding"
          />
          <button
            class="button button-primary button-tight"
            type="submit"
            :disabled="adding || !newTitle.trim()"
          >
            Add
          </button>
        </form>

        <p v-if="error" class="error-text expression-error">{{ error }}</p>
        <p v-if="store.loading && store.items.length === 0" class="empty-copy">Loading…</p>
        <p v-else-if="store.items.length === 0" class="empty-copy">
          {{ store.kind === 'grammar' ? 'No grammar notes yet.' : 'No topic notes yet.' }}
        </p>
        <ul v-else class="expression-titles">
          <li v-for="item in store.items" :key="item.id">
            <button
              class="expression-title"
              :class="{ active: item.id === store.selectedId }"
              type="button"
              @click="store.select(item.id)"
            >
              <span class="expression-title-text">{{ item.title }}</span>
              <span class="expression-title-preview">{{ previewOf(item.note) }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <section class="expression-note">
        <template v-if="selected">
          <header class="expression-note-head">
            <div class="expression-heading">
              <p class="eyebrow">{{ store.kind === 'grammar' ? 'Grammar' : 'Topic' }}</p>
              <input
                v-if="renaming"
                ref="titleInputRef"
                v-model="titleDraft"
                class="expression-title-input"
                type="text"
                @keydown.enter.prevent="commitRename"
                @keydown.esc.prevent="cancelRename"
                @blur="commitRename"
              />
              <h3 v-else>{{ selected.title }}</h3>
            </div>

            <div class="expression-actions">
              <div class="expression-modes" role="group" aria-label="View mode">
                <button
                  class="expression-mode"
                  :class="{ active: mode === 'edit' }"
                  type="button"
                  @click="mode = 'edit'"
                >
                  Edit
                </button>
                <button
                  class="expression-mode"
                  :class="{ active: mode === 'preview' }"
                  type="button"
                  @click="mode = 'preview'"
                >
                  Preview
                </button>
              </div>
              <button class="button button-secondary button-tight" type="button" @click="startRename">
                Rename
              </button>
              <button class="button button-secondary button-tight" type="button" @click="handleDelete">
                Delete
              </button>
            </div>
          </header>

          <textarea
            v-if="mode === 'edit'"
            v-model="draft"
            class="expression-textarea"
            spellcheck="false"
            placeholder="Write in Markdown. Headings, lists and code blocks all work — the Preview tab shows the result."
          />
          <div v-else class="expression-preview markdown-content">
            <div v-if="draft.trim()" v-html="renderMarkdown(draft)" />
            <p v-else class="empty-copy">Nothing written yet.</p>
          </div>

          <p class="expression-status muted-text">{{ statusLabel }}</p>
        </template>

        <div v-else class="expression-empty">
          <p class="empty-copy">
            Select a title on the left, or add one to start writing.
          </p>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useConfirmStore } from '@/stores/confirm';
import { useWritingStore } from '@/stores/writing';
import { renderMarkdown } from '@/utils/markdown';

const store = useWritingStore();
const confirm = useConfirmStore();

const SAVE_DELAY_MS = 700;

const newTitle = ref('');
const adding = ref(false);
const error = ref('');
const mode = ref<'edit' | 'preview'>('edit');
const draft = ref('');
const savedNote = ref('');
const saving = ref(false);
const savedAt = ref(0);
const renaming = ref(false);
const titleDraft = ref('');
const titleInputRef = ref<HTMLInputElement | null>(null);

let saveTimer: ReturnType<typeof setTimeout> | null = null;

const selected = computed(() => store.selected);
const statusLabel = computed(() => {
  if (saving.value) {
    return 'Saving…';
  }
  if (draft.value !== savedNote.value) {
    return 'Unsaved changes';
  }
  return savedAt.value ? 'Saved' : '';
});

function previewOf(note: string) {
  const text = note.replace(/[#>*_`]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) {
    return 'Empty note';
  }
  return text.length > 60 ? `${text.slice(0, 59)}…` : text;
}

function loadSelected() {
  draft.value = selected.value?.note ?? '';
  savedNote.value = draft.value;
  savedAt.value = 0;
  renaming.value = false;
}

async function persist() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  const topic = selected.value;
  if (!topic || draft.value === savedNote.value) {
    return;
  }

  const snapshot = draft.value;
  saving.value = true;
  try {
    await store.saveNote(topic.id, snapshot);
    if (draft.value === snapshot) {
      savedNote.value = snapshot;
    }
    savedAt.value = Date.now();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save the note.';
  } finally {
    saving.value = false;
  }
}

// Debounced autosave while typing.
watch(draft, () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    void persist();
  }, SAVE_DELAY_MS);
});

// Switching titles saves the previous note first, then loads the new one.
watch(
  () => selected.value?.id,
  async (_next, previous) => {
    if (previous) {
      await persist();
    }
    error.value = '';
    loadSelected();
  },
);

async function handleAdd() {
  const title = newTitle.value.trim();
  if (!title || adding.value) {
    return;
  }

  error.value = '';
  adding.value = true;
  try {
    const result = await store.addTitle(title);
    newTitle.value = '';
    if (!result.created) {
      error.value = `"${result.topic.title}" already exists.`;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to add the title.';
  } finally {
    adding.value = false;
  }
}

async function startRename() {
  if (!selected.value) {
    return;
  }

  titleDraft.value = selected.value.title;
  renaming.value = true;
  await nextTick();
  titleInputRef.value?.focus();
  titleInputRef.value?.select();
}

function cancelRename() {
  renaming.value = false;
  titleDraft.value = '';
}

async function commitRename() {
  const topic = selected.value;
  const title = titleDraft.value.trim();
  renaming.value = false;
  if (!topic || !title || title === topic.title) {
    return;
  }

  error.value = '';
  try {
    await store.rename(topic.id, title);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to rename the title.';
  }
}

async function handleDelete() {
  const topic = selected.value;
  if (!topic) {
    return;
  }

  const confirmed = await confirm.ask({
    title: `Delete "${topic.title}"?`,
    message: 'The note and its Markdown will be removed. This cannot be undone.',
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!confirmed) {
    return;
  }

  error.value = '';
  try {
    await store.remove(topic.id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete the title.';
  }
}

onMounted(async () => {
  try {
    await store.fetchTopics();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load notes.';
  }
  loadSelected();
});

onBeforeUnmount(() => {
  void persist();
});
</script>