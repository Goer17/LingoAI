<template>
  <section v-if="result" class="card result-card">
    <div class="result-head">
      <div>
        <p v-if="showHeaderLabel" class="eyebrow">Search Result</p>
        <h2>{{ result.text }}</h2>
        <p v-if="result.found" class="subtle-copy">{{ result.type }} · {{ result.pronunciation }}</p>
        <p v-else class="subtle-copy">{{ result.type }} · Not Found</p>
      </div>
      <div v-if="result.found" class="result-actions">
        <button
          class="icon-button"
          type="button"
          :class="{ confirm: regenerateConfirm }"
          :aria-label="regenerateConfirm ? 'Confirm regenerate audio' : 'Regenerate audio'"
          :title="regenerateConfirm ? 'Click again to confirm' : 'Regenerate audio'"
          @click="handleRegenerateClick"
        >
          <RefreshCw v-if="!regenerateConfirm" :size="18" />
          <Check v-else :size="18" />
        </button>
        <button class="icon-button" type="button" aria-label="Play pronunciation" title="Play pronunciation" @click="$emit('play-audio', result.ttsText)">
          <Volume2 :size="18" />
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
import { ref } from 'vue';
import { Check, RefreshCw, Volume2 } from 'lucide-vue-next';
import type { SearchResult } from '@/types/models';

const props = withDefaults(defineProps<{
  result: SearchResult | null;
  showChinese: boolean;
  saving: boolean;
  allowSave?: boolean;
  showHeaderLabel?: boolean;
}>(), {
  allowSave: true,
  showHeaderLabel: true,
});

const emit = defineEmits<{
  save: [];
  'toggle-translation': [];
  'play-audio': [text: string];
  'regenerate-audio': [text: string];
}>();

const regenerateConfirm = ref(false);

function handleRegenerateClick() {
  if (regenerateConfirm.value) {
    emit('regenerate-audio', props.result?.ttsText ?? '');
    regenerateConfirm.value = false;
    return;
  }

  regenerateConfirm.value = true;
}
</script>
