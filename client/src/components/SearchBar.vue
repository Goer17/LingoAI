<template>
  <form class="search-panel" @submit.prevent="$emit('search')">
    <label class="field search-field">
      <span>Search Word or Phrase</span>
      <input
        v-model="model"
        type="text"
        autocomplete="off"
        spellcheck="false"
        role="combobox"
        :aria-expanded="showSuggestions && suggestions.length > 0"
        aria-autocomplete="list"
        :aria-activedescendant="activeDescendant"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="showSuggestions = true"
        @blur="hideSuggestions"
      />
      <div v-if="showSuggestions && suggestions.length" ref="suggestionsBox" class="suggestions" role="listbox">
        <button
          v-for="(word, index) in suggestions"
          :key="word"
          :id="`suggestion-${index}`"
          class="suggestion"
          :class="{ active: index === activeIndex }"
          role="option"
          :aria-selected="index === activeIndex"
          type="button"
          @mousedown.prevent="selectSuggestion(word)"
          @mouseenter="activeIndex = index"
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
import { computed, onBeforeUnmount, ref } from 'vue';

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
const activeIndex = ref(-1);
const suggestionsBox = ref<HTMLDivElement | null>(null);
const suggestionEls = ref<HTMLElement[]>([]);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let requestSeq = 0;

const activeDescendant = computed(() =>
  activeIndex.value >= 0 ? `suggestion-${activeIndex.value}` : undefined,
);

function handleInput() {
  activeIndex.value = -1;
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
        if (activeIndex.value >= result.length) {
          activeIndex.value = result.length - 1;
        }
      }
    } catch {
      if (seq === requestSeq) {
        suggestions.value = [];
      }
    }
  }, 180);
}

function handleKeydown(event: KeyboardEvent) {
  if (!showSuggestions.value || suggestions.value.length === 0) {
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length;
    scrollActiveIntoView();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value =
      activeIndex.value <= 0 ? suggestions.value.length - 1 : activeIndex.value - 1;
    scrollActiveIntoView();
  } else if (event.key === 'Enter') {
    // If an entry is highlighted with arrow keys, Enter picks it and searches.
    if (activeIndex.value >= 0 && activeIndex.value < suggestions.value.length) {
      event.preventDefault();
      selectSuggestion(suggestions.value[activeIndex.value]);
    }
  } else if (event.key === 'Escape') {
    event.preventDefault();
    suggestions.value = [];
    showSuggestions.value = false;
    activeIndex.value = -1;
  }
}

function scrollActiveIntoView() {
  const box = suggestionsBox.value;
  const el = suggestionEls.value[activeIndex.value];
  if (!box || !el) {
    return;
  }

  const top = el.offsetTop - box.clientTop;
  const bottom = top + el.offsetHeight;
  if (top < box.scrollTop) {
    box.scrollTop = top;
  } else if (bottom > box.scrollTop + box.clientHeight) {
    box.scrollTop = bottom - box.clientHeight;
  }
}

function selectSuggestion(word: string) {
  model.value = word;
  suggestions.value = [];
  showSuggestions.value = false;
  activeIndex.value = -1;
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
.suggestion:focus,
.suggestion.active {
  background: var(--bg-hover, #f0f0f0);
}
</style>