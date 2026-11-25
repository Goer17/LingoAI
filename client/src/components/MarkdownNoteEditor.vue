<template>
  <div class="note-editor">
    <div
      v-for="(block, index) in localBlocks"
      :key="`${index}-${editingIndex === index ? 'edit' : 'view'}`"
      class="note-block"
    >
      <textarea
        v-if="editingIndex === index"
        ref="inputRef"
        :value="buffer"
        class="note-block-input"
        spellcheck="false"
        @input="handleInput"
        @keydown.enter.exact.prevent="handleEnter"
        @keydown.esc.prevent="stopEditing(index)"
        @blur="stopEditing(index)"
      />
      <div
        v-else
        class="note-block-view markdown-content"
        :class="{ 'note-block-empty': !block.trim() }"
        :data-placeholder="index === 0 ? 'Start writing in Markdown…' : 'Empty block'"
        @click="startEditing(index)"
        v-html="renderBlock(block)"
      />
    </div>

    <button class="note-append" type="button" @click="appendBlock">+ Add block</button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { renderMarkdown } from '@/utils/markdown';

/**
 * Typora-style Markdown surface: the note is a list of blocks, each rendered
 * until you click it, then it becomes a plain textarea. Everything outside the
 * block being edited stays rendered, so there is no separate preview pane.
 *
 * The block list is local state while editing. Re-deriving it from the prop on
 * every keystroke would renumber the blocks (blank blocks collapse when the
 * text is split again) and drop the caret into the wrong one.
 */
const props = defineProps<{ value: string }>();
const emit = defineEmits<{ 'update:value': [value: string] }>();

const inputRef = ref<HTMLTextAreaElement | HTMLTextAreaElement[] | null>(null);
const editingIndex = ref<number | null>(null);
const buffer = ref('');
const localBlocks = ref<string[]>(splitBlocks(props.value));

/** Split on blank lines, but never inside a fenced code block. */
function splitBlocks(markdown: string): string[] {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let current: string[] = [];
  let inFence = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
    }

    if (!inFence && line.trim() === '') {
      if (current.length) {
        result.push(current.join('\n'));
        current = [];
      }
      continue;
    }

    current.push(line);
  }

  if (current.length) {
    result.push(current.join('\n'));
  }

  return result.length ? result : [''];
}

function renderBlock(block: string) {
  return block.trim() ? renderMarkdown(block) : '';
}

function resize(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function emitBlocks() {
  emit('update:value', localBlocks.value.join('\n\n'));
}

// External changes (switching titles, reload) replace the block list.
watch(
  () => props.value,
  (value) => {
    if (editingIndex.value !== null) {
      return;
    }

    if (value !== localBlocks.value.join('\n\n')) {
      localBlocks.value = splitBlocks(value);
    }
  },
);

async function startEditing(index: number) {
  editingIndex.value = index;
  buffer.value = localBlocks.value[index] ?? '';
  await nextTick();
  const el = Array.isArray(inputRef.value) ? inputRef.value[0] : inputRef.value;
  if (!el) {
    return;
  }

  el.focus();
  el.setSelectionRange(el.value.length, el.value.length);
  resize(el);
}

/**
 * Leaving a block clears the editing state. The index guard matters for Enter:
 * moving to the next block unmounts the textarea, and the blur that follows must
 * not cancel the block that is now being edited.
 */
function stopEditing(index?: number) {
  if (index !== undefined && editingIndex.value !== index) {
    return;
  }

  editingIndex.value = null;
  buffer.value = '';
}

function handleInput(event: Event) {
  const el = event.target as HTMLTextAreaElement;
  buffer.value = el.value;
  resize(el);

  const index = editingIndex.value;
  if (index === null) {
    return;
  }

  localBlocks.value[index] = el.value;
  emitBlocks();
}

/** Enter leaves the block instead of adding a line (Shift+Enter for a line). */
async function handleEnter() {
  const index = editingIndex.value;
  if (index === null) {
    return;
  }

  const nextIndex = index + 1;
  if (nextIndex >= localBlocks.value.length) {
    localBlocks.value.push('');
    emitBlocks();
  }

  // Drop the current editor first so its blur cannot overwrite the move.
  editingIndex.value = null;
  buffer.value = '';

  await nextTick();
  await startEditing(nextIndex);
}

async function appendBlock() {
  localBlocks.value.push('');
  emitBlocks();
  await nextTick();
  await startEditing(localBlocks.value.length - 1);
}
</script>