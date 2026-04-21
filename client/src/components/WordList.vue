<template>
  <section class="card list-card">
    <div class="section-heading inline-heading">
      <div>
        <p class="eyebrow">Vocabulary</p>
        <h2>Word List</h2>
      </div>
      <span class="count-chip">{{ items.length }} items</span>
    </div>
    <div class="list-scroller">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="word-row"
        :class="{ active: item.id === selectedId }"
        @click="$emit('select', item.id)"
      >
        <span>{{ item.text }}</span>
        <span class="familiarity-pill">{{ item.familiarity }}</span>
      </button>
      <p v-if="items.length === 0" class="empty-copy">No saved words yet.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { VocabularyEntry } from '@/types/models';

defineProps<{
  items: VocabularyEntry[];
  selectedId: string;
}>();

defineEmits<{
  select: [id: string];
}>();
</script>
