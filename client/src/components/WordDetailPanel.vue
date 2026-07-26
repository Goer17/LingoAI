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
            aria-label="Regenerate audio"
            title="Regenerate audio"
            @click="$emit('regenerate-audio')"
          >
            🔄
          </button>
          <button
            class="icon-button"
            type="button"
            aria-label="Play pronunciation"
            title="Play pronunciation"
            @click="$emit('play-audio')"
          >
            🔊
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
import { nextTick, ref, watch } from 'vue';
import type { VocabularyEntry } from '@/types/models';

const draft = ref('');
const chatHistoryRef = ref<HTMLElement | null>(null);
const props = defineProps<{
  word: VocabularyEntry | null;
  showChinese: boolean;
  loading: boolean;
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

watch(
  () => props.word?.id,
  () => {
    deleteConfirm.value = false;
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
</script>
