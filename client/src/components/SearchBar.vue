<template>
  <form class="search-panel" @submit.prevent="$emit('search')">
    <label class="field search-field">
      <span>Search Word or Phrase</span>
      <input
        v-model="model"
        type="text"
        autocomplete="off"
        spellcheck="false"
        @input="handleInput"
        @focus="showSuggestions = true"
        @blur="hideSuggestions"
      />
      <div v-if="showSuggestions && suggestions.length" class="suggestions">
        <button
          v-for="word in suggestions"
          :key="word"
          class="suggestion"
          type="button"
          @mousedown.prevent="selectSuggestion(word)"
        >
          {{ word }}
        </button>
      </div>
    </label>
    <button class="button button-primary" type="submit" :disabled="loading || !model.trim()">
      {{ loading ? 'Searching...' : 'Search' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';

const model = defineModel<string>({ required: true });

const props = defineProps<{
  loading: boolean;
  suggest?: (prefix: string) => Promise<string[]>;
}>();

const emit = defineEmits<{
  search: [];
}>();

const suggestions = ref<string[]>([]);
const showSuggestions = ref(false);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let requestSeq = 0;

function handleInput() {
  if (!props.suggest) {
    suggestions.value = [];
    return;
  }

  showSuggestions.value = true;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const prefix = model.value.trim();
    if (!prefix) {
      suggestions.value = [];
      return;
    }

    const seq = ++requestSeq;
    try {
      const result = await props.suggest!(prefix);
      // Ignore stale responses from a previous keystroke.
      if (seq === requestSeq) {
        suggestions.value = result;
      }
    } catch {
      if (seq === requestSeq) {
        suggestions.value = [];
      }
    }
  }, 180);
}

function selectSuggestion(word: string) {
  model.value = word;
  suggestions.value = [];
  showSuggestions.value = false;
  // Selecting a suggestion should immediately trigger the search.
  emit('search');
}

function hideSuggestions() {
  // Delay so a click on a suggestion can register before the dropdown hides.
  setTimeout(() => {
    showSuggestions.value = false;
  }, 120);
}

onBeforeUnmount(() => {
  clearTimeout(debounceTimer);
});
</script>

<style scoped>
.search-field {
  position: relative;
}

.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 20;
  margin-top: 2px;
  background: var(--bg-panel, #ffffff);
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 4px;
  max-height: 240px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.suggestion {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.suggestion:hover,
.suggestion:focus {
  background: var(--bg-hover, #f0f0f0);
}
</style>