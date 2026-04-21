<template>
  <section class="card detail-card">
    <div v-if="word" class="detail-content">
      <div class="detail-head">
        <div>
          <p class="eyebrow">Details</p>
          <h2>{{ word.text }}</h2>
          <p class="subtle-copy">{{ word.type }} · familiarity {{ word.familiarity }} · {{ word.pronunciation }}</p>
        </div>
        <div class="result-actions">
          <button
            class="icon-button"
            type="button"
            aria-label="Play pronunciation"
            title="Play pronunciation"
            @click="$emit('play-audio', word.ttsText)"
          >
            🔊
          </button>
          <button class="button button-secondary" type="button" @click="$emit('toggle-translation')">
            {{ showChinese ? 'Hide Chinese' : 'Show Chinese' }}
          </button>
        </div>
      </div>

      <div class="meaning-grid detail-grid">
        <article v-for="(meaning, index) in word.meanings" :key="`${meaning.partOfSpeech}-${index}`" class="meaning-card">
          <strong>{{ meaning.partOfSpeech }}</strong>
          <p>{{ meaning.englishMeaning }}</p>
          <p v-if="showChinese" class="muted-text">{{ meaning.chineseMeaning }}</p>
          <p class="example-text">{{ meaning.example }}</p>
          <p v-if="showChinese" class="muted-text">{{ meaning.exampleTranslation }}</p>
        </article>
      </div>

      <p class="token-row"><span>Derivatives</span> {{ word.derivatives.join(' · ') || 'None' }}</p>

      <label class="field">
        <span>Note</span>
        <textarea :value="word.note" rows="5" placeholder="Add your own note..." @change="handleNoteChange" />
      </label>

      <div class="chat-shell">
        <div class="section-heading inline-heading">
          <div>
            <p class="eyebrow">Tutor Chat</p>
            <h3>Ask About This Word</h3>
          </div>
          <button
            class="button button-secondary"
            type="button"
            :disabled="loading || word.chatHistory.length === 0"
            @click="$emit('clear-chat')"
          >
            Clear
          </button>
        </div>
        <div class="chat-history">
          <div v-for="message in word.chatHistory" :key="message.id" class="chat-bubble" :class="message.role">
            <span class="chat-role">{{ message.role }}</span>
            <p>{{ message.content }}</p>
          </div>
          <p v-if="word.chatHistory.length === 0" class="empty-copy">No discussion yet.</p>
        </div>
        <form class="chat-form" @submit.prevent="submit">
          <textarea v-model="draft" rows="3" placeholder="Ask about collocations, tone, or common mistakes..." />
          <button class="button button-primary" type="submit" :disabled="loading || !draft.trim()">
            {{ loading ? 'Sending...' : 'Send' }}
          </button>
        </form>
      </div>
    </div>

    <div v-else class="placeholder-panel">
      <p class="eyebrow">Details</p>
      <h2>Select a word</h2>
      <p class="subtle-copy">The right panel will show meanings, notes, audio, and tutor chat.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { VocabularyEntry } from '@/types/models';

const draft = ref('');
const props = defineProps<{
  word: VocabularyEntry | null;
  showChinese: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  'toggle-translation': [];
  'play-audio': [text: string];
  'save-note': [note: string];
  'send-chat': [message: string];
  'clear-chat': [];
}>();

function submit() {
  if (!draft.value.trim() || !props.word) {
    return;
  }

  emit('send-chat', draft.value.trim());
  draft.value = '';
}

function handleNoteChange(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }

  emit('save-note', target.value);
}
</script>
