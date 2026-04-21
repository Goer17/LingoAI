<template>
  <form class="search-panel" @submit.prevent="$emit('search')">
    <label class="field search-field">
      <span>Search Word or Phrase</span>
      <input v-model="model" type="text" />
    </label>
    <button class="button button-primary" type="submit" :disabled="loading || !model.trim()">
      {{ loading ? 'Searching...' : 'Search' }}
    </button>
  </form>
</template>

<script setup lang="ts">
const model = defineModel<string>({ required: true });

defineProps<{
  loading: boolean;
}>();

defineEmits<{
  search: [];
}>();
</script>
