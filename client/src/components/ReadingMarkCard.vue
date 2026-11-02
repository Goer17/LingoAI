<template>
  <div
    class="reading-mark-card"
    :class="{ active: focused, dragging }"
    :data-mark-id="mark.id"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="dragging = false"
    @click="$emit('focus', mark.id)"
  >
    <div class="reading-mark-head">
      <button class="reading-mark-jump" type="button" @click.stop="$emit('jump', mark)">
        ¶{{ mark.paragraphIndex }}
      </button>
      <span class="reading-mark-kind">{{ mark.kind }}</span>
      <span class="reading-mark-spacer" />
      <button
        class="reading-mark-icon"
        type="button"
        title="Quote in chat"
        @click.stop="$emit('cite', mark)"
      >
        @
      </button>
      <button
        class="reading-mark-icon"
        type="button"
        title="Delete mark"
        @click.stop="handleDelete"
      >
        ×
      </button>
    </div>

    <blockquote class="reading-mark-quote">{{ mark.text }}</blockquote>

    <textarea
      v-model="draft"
      class="reading-mark-note"
      rows="2"
      placeholder="Sticky note…"
      spellcheck="false"
      @click.stop
      @input="scheduleSave"
      @blur="flushSave"
    />

    <div class="reading-mark-foot">
      <span>{{ savedLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { ReadingMark } from '@/types/models';

const props = defineProps<{
  mark: ReadingMark;
  focused?: boolean;
}>();

const emit = defineEmits<{
  (event: 'save-note', markId: string, note: string): void;
  (event: 'delete', markId: string): void;
  (event: 'cite', mark: ReadingMark): void;
  (event: 'jump', mark: ReadingMark): void;
  (event: 'focus', markId: string): void;
}>();

const draft = ref(props.mark.note);
const saved = ref(props.mark.note);
const dragging = ref(false);
const savedLabel = ref('');
let timer: number | undefined;

watch(
  () => props.mark.note,
  (note) => {
    if (note !== saved.value) {
      draft.value = note;
      saved.value = note;
    }
  },
);

function scheduleSave() {
  savedLabel.value = 'editing…';
  if (timer) {
    window.clearTimeout(timer);
  }
  timer = window.setTimeout(() => flushSave(), 600);
}

function flushSave() {
  if (timer) {
    window.clearTimeout(timer);
    timer = undefined;
  }
  if (draft.value === saved.value) {
    return;
  }
  saved.value = draft.value;
  savedLabel.value = 'saved';
  emit('save-note', props.mark.id, draft.value);
}

function handleDragStart(event: DragEvent) {
  dragging.value = true;
  if (!event.dataTransfer) {
    return;
  }
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('application/x-reading-mark', props.mark.id);
  event.dataTransfer.setData('text/plain', props.mark.text);
}

function handleDelete() {
  if (window.confirm('Delete this mark and its note?')) {
    emit('delete', props.mark.id);
  }
}

onBeforeUnmount(() => {
  if (timer) {
    window.clearTimeout(timer);
  }
});
</script>