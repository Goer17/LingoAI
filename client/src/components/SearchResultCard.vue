<template>
  <section v-if="result" class="card result-card">
    <div class="result-head">
      <div>
        <p class="eyebrow">Search Result</p>
        <h2>{{ result.text }}</h2>
        <p v-if="result.found" class="subtle-copy">{{ result.type }} · {{ result.pronunciation }}</p>
        <p v-else class="subtle-copy">{{ result.type }} · Not Found</p>
      </div>
      <div v-if="result.found" class="result-actions">
        <button class="icon-button" type="button" aria-label="Play pronunciation" title="Play pronunciation" @click="$emit('play-audio', result.ttsText)">
          🔊
        </button>
        <button class="button button-secondary" type="button" @click="$emit('toggle-translation')">
          {{ showChinese ? 'Hide Chinese' : 'Show Chinese' }}
        </button>
        <button v-if="allowSave" class="button button-primary" type="button" @click="$emit('save')" :disabled="saving">
          {{ saving ? 'Saving...' : 'Add to Vocabulary' }}
        </button>
      </div>
    </div>
    <div v-if="result.found" class="meaning-grid">
      <article v-for="(meaning, index) in result.meanings" :key="`${meaning.partOfSpeech}-${index}`" class="meaning-card">
        <div class="meaning-top">
          <strong>{{ meaning.partOfSpeech }}</strong>
        </div>
        <p>{{ meaning.englishMeaning }}</p>
        <p v-if="showChinese" class="muted-text">{{ meaning.chineseMeaning }}</p>
        <p class="example-text">{{ meaning.example }}</p>
        <p v-if="showChinese" class="muted-text">{{ meaning.exampleTranslation }}</p>
      </article>
    </div>
    <article v-else class="meaning-card">
      <div class="meaning-top">
        <strong>Not Found</strong>
      </div>
      <p>{{ result.notFoundMessage || 'Not Found' }}</p>
      <p class="muted-text">Try another word or phrase.</p>
    </article>
    <p v-if="result.found" class="token-row"><span>Derivatives</span> {{ result.derivatives.join(' · ') || 'None' }}</p>
  </section>
</template>

<script setup lang="ts">
import type { SearchResult } from '@/types/models';

withDefaults(defineProps<{
  result: SearchResult | null;
  showChinese: boolean;
  saving: boolean;
  allowSave?: boolean;
}>(), {
  allowSave: true,
});

defineEmits<{
  save: [];
  'toggle-translation': [];
  'play-audio': [text: string];
}>();
</script>
