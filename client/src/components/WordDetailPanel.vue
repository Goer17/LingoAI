<template>
  <section class="card detail-card">
    <div v-if="word" class="detail-content">
      <div class="detail-head">
        <div>
          <p class="eyebrow">Details</p>
          <h2>{{ word.text }}</h2>
          <p class="subtle-copy">{{ word.type }} · familiarity {{ word.familiarity }}{{ word.known ? ' · known' : '' }} · {{ word.pronunciation }}</p>
        </div>
        <div class="result-actions">
          <button
            v-if="!hasCommonAudio"
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
          <button
            class="icon-button"
            type="button"
            aria-label="Play pronunciation"
            title="Play pronunciation"
            @click="$emit('play-audio')"
          >
            <Volume2 :size="18" />
          </button>
          <button class="button button-secondary" type="button" @click="$emit('toggle-translation')">
            {{ showChinese ? 'Hide Chinese' : 'Show Chinese' }}
          </button>
          <button
            class="button button-secondary delete-action"
            type="button"
            :class="{ confirm: deleteConfirm }"
            @click="handleDeleteClick"
          >
            {{ deleteConfirm ? 'Confirm' : 'Delete' }}
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
          <div class="example-image-row">
            <button
              class="icon-button example-image-btn"
              type="button"
              :disabled="store.isExampleImageLoading(meaning.example)"
              :title="store.exampleImageButtonTitle(meaning.example)"
              :aria-label="store.exampleImageButtonTitle(meaning.example)"
              @click="handleExampleImage(meaning.example)"
            >
              <Image v-if="!store.exampleImageState(meaning.example)" :size="14" />
              <RefreshCw v-else-if="!store.isExampleImageLoading(meaning.example)" :size="14" />
              <Loader2 v-else class="example-image-spin" :size="14" />
            </button>
            <span class="muted-text example-image-label">{{ store.exampleImageLabel(meaning.example) }}</span>
            <span v-if="store.exampleImageError(meaning.example)" class="error-text example-image-error">
              {{ store.exampleImageError(meaning.example) }}
            </span>
          </div>
          <img
            v-if="store.exampleImageUrl(meaning.example)"
            :src="store.exampleImageUrl(meaning.example)"
            class="example-image"
            alt="Illustration for this example sentence"
          />
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
        <div ref="chatHistoryRef" class="chat-history">
          <div v-for="message in word.chatHistory" :key="message.id" class="chat-bubble" :class="message.role">
            <span class="chat-role">{{ message.role }}</span>
            <div class="chat-content markdown-content" v-html="renderMarkdown(message.content)" />
          </div>
          <p v-if="word.chatHistory.length === 0" class="empty-copy">No discussion yet.</p>
        </div>
        <form class="chat-form" @submit.prevent="submit">
          <textarea
            v-model="draft"
            rows="3"
            placeholder="Ask about collocations, tone, or common mistakes..."
            @keydown.enter.exact.prevent="submit"
          />
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
import { nextTick, ref, watch } from 'vue';
import { Check, Image, Loader2, RefreshCw, Volume2 } from 'lucide-vue-next';
import type { VocabularyEntry } from '@/types/models';
import { api } from '@/services/api';
import { useVocabularyStore } from '@/stores/vocabulary';

const store = useVocabularyStore();

const draft = ref('');
const chatHistoryRef = ref<HTMLElement | null>(null);
const props = defineProps<{
  word: VocabularyEntry | null;
  showChinese: boolean;
  loading: boolean;
  hasCommonAudio?: boolean;
}>();

const emit = defineEmits<{
  'toggle-translation': [];
  'play-audio': [];
  'regenerate-audio': [];
  'save-note': [note: string];
  'send-chat': [message: string];
  'clear-chat': [];
  delete: [id: string];
}>();

const deleteConfirm = ref(false);
const regenerateConfirm = ref(false);

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

function handleDeleteClick() {
  if (deleteConfirm.value) {
    emit('delete', props.word?.id ?? '');
    deleteConfirm.value = false;
    return;
  }

  deleteConfirm.value = true;
}

function handleRegenerateClick() {
  if (regenerateConfirm.value) {
    emit('regenerate-audio');
    regenerateConfirm.value = false;
    return;
  }

  regenerateConfirm.value = true;
}

watch(
  () => props.word?.id,
  () => {
    deleteConfirm.value = false;
    regenerateConfirm.value = false;
  },
);

watch(
  () => {
    const history = props.word?.chatHistory ?? [];
    const last = history[history.length - 1];
    return `${history.length}:${last?.id ?? ''}:${last?.content.length ?? 0}`;
  },
  async () => {
    await nextTick();
    if (!chatHistoryRef.value) {
      return;
    }

    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
  },
);

function renderMarkdown(content: string) {
  const normalized = escapeHtml(content).replace(/\r\n/g, '\n');
  const codeBlocks: string[] = [];
  const withCodeTokens = normalized.replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_match, lang, block) => {
    const token = `@@CODEBLOCK_${codeBlocks.length}@@`;
    const langAttr = lang ? ` data-lang="${lang}"` : '';
    codeBlocks.push(`<pre class="md-pre"${langAttr}><code>${block}</code></pre>`);
    return token;
  });

  const lines = withCodeTokens.split('\n');
  const parts: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  function closeListIfNeeded() {
    if (!listType) {
      return;
    }

    parts.push(`</${listType}>`);
    listType = null;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeListIfNeeded();
      continue;
    }

    if (/^@@CODEBLOCK_\d+@@$/.test(trimmed)) {
      closeListIfNeeded();
      parts.push(trimmed);
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeListIfNeeded();
      const level = heading[1].length;
      parts.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      if (listType !== 'ul') {
        closeListIfNeeded();
        listType = 'ul';
        parts.push('<ul>');
      }
      parts.push(`<li>${renderInlineMarkdown(unordered[1])}</li>`);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (listType !== 'ol') {
        closeListIfNeeded();
        listType = 'ol';
        parts.push('<ol>');
      }
      parts.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) {
      closeListIfNeeded();
      parts.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    closeListIfNeeded();
    parts.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  }

  closeListIfNeeded();
  return parts.join('').replace(/@@CODEBLOCK_(\d+)@@/g, (_match, index) => codeBlocks[Number(index)] ?? '');
}

function renderInlineMarkdown(text: string) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');
}

function handleExampleImage(example: string) {
  const state = store.exampleImageState(example);
  void store.generateExampleImage(example, props.word?.text ?? undefined, Boolean(state?.url));
}

watch(
  () => props.word?.id,
  async (id) => {
    if (!id) {
      return;
    }

    const word = props.word;
    if (!word) {
      return;
    }

    const examples = [...new Set(
      word.meanings.map((meaning) => meaning.example.trim()).filter(Boolean),
    )];
    if (examples.length === 0) {
      return;
    }

    // Re-check every time this card is opened: cached example images may have
    // been generated in the background (Auto Generation) after a previous visit.
    for (const example of examples) {
      await store.checkExampleImage(example);
    }
    // Keep resolving pending (auto/manual) generations while this card is open;
    // the shared store keeps the state intact across page switches regardless.
    store.startExampleImagePolling();
  },
  { immediate: true },
);
</script>

<style scoped>
.example-image-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.example-image-btn {
  width: 24px;
  height: 24px;
}

.example-image-label {
  font-size: 0.75rem;
}

.example-image-error {
  font-size: 0.75rem;
  flex: 1;
}

.example-image-spin {
  animation: example-image-rotate 1s linear infinite;
}

.example-image {
  display: block;
  max-width: 100%;
  margin-top: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e2e2);
}

@keyframes example-image-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
