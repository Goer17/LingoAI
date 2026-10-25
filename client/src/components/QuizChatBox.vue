<template>
  <section class="card quiz-chat-card quiz-chat-float">
    <div class="quiz-chat-float-head">
      <button
        v-if="canAppeal && !appealAccepted"
        class="button button-secondary button-tight quiz-chat-appeal"
        type="button"
        :disabled="appealing || loading"
        title="Ask the tutor to re-judge this answer"
        @click="handleAppeal"
      >
        <Scale :size="14" />
        {{ appealing ? 'Reviewing...' : 'Appeal' }}
      </button>
      <span class="quiz-chat-float-title">Tutor</span>
    </div>
    <div class="detail-content">
      <div class="quiz-chat-context">
        <p class="eyebrow">Question {{ questionIndex + 1 }} / {{ questionTotal }}</p>
        <p class="quiz-chat-word"><strong>{{ word }}</strong></p>
        <p class="muted-text quiz-chat-sentence">"{{ sentence }}"</p>
        <p class="quiz-chat-outcome" :class="isCorrect ? 'success-text' : 'error-text'">
          <Check v-if="isCorrect" :size="14" class="feedback-icon" />
          <X v-else :size="14" class="feedback-icon" />
          {{ isCorrect ? 'Correct!' : `Your answer: "${userResponse}" → Correct: "${answer}"` }}
        </p>
      </div>

      <div ref="chatHistoryRef" class="chat-history quiz-chat-history">
        <div
          v-for="(msg, index) in chatMessages"
          :key="index"
          class="chat-bubble"
          :class="msg.role"
        >
          <span class="chat-role">{{ msg.role === 'user' ? 'You' : 'Tutor' }}</span>
          <div class="chat-content markdown-content" v-html="renderMarkdown(msg.content)" />
        </div>
        <p v-if="chatMessages.length === 0" class="empty-copy">
          Ask the tutor about this question.
        </p>
        <p v-if="error" class="error-text">{{ error }}</p>
      </div>

      <form class="chat-form" @submit.prevent="handleSend">
        <textarea
          v-model="draft"
          rows="2"
          placeholder="Why is this the answer? Explain the grammar..."
          :disabled="loading"
          @keydown.enter.exact.prevent="handleSend"
        />
        <button class="button button-primary" type="submit" :disabled="loading || !draft.trim()">
          {{ loading ? 'Thinking...' : 'Ask' }}
        </button>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { Check, Scale, X } from 'lucide-vue-next';
import { api } from '@/services/api';
import type { QuizSession } from '@/types/models';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const props = defineProps<{
  sessionId: string;
  questionId: string;
  word: string;
  sentence: string;
  type: 'fill_blank' | 'listening';
  answer: string;
  userResponse: string;
  isCorrect: boolean;
  canAppeal: boolean;
  questionIndex: number;
  questionTotal: number;
}>();

const emit = defineEmits<{
  'appeal-resolved': [payload: { session: QuizSession; accepted: boolean }];
}>();

const draft = ref('');
const loading = ref(false);
const appealing = ref(false);
const appealAccepted = ref(false);
const chatMessages = ref<ChatMsg[]>([]);
const chatHistoryRef = ref<HTMLElement | null>(null);
const error = ref('');

watch(
  () => props.questionIndex,
  () => {
    chatMessages.value = [];
    draft.value = '';
    error.value = '';
    appealAccepted.value = false;
    appealing.value = false;
  },
);

watch(
  () => chatMessages.value.length,
  async () => {
    await nextTick();
    if (!chatHistoryRef.value) {
      return;
    }

    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
  },
);

async function handleAppeal() {
  if (appealing.value || loading.value) {
    return;
  }

  appealing.value = true;
  error.value = '';
  chatMessages.value = [
    ...chatMessages.value,
    {
      role: 'user',
      content: 'Appeal: I believe my answer should be accepted. Please re-judge it and explain your reasoning.',
    },
  ];

  try {
    const result = await api.appealQuizAnswer(props.sessionId, props.questionId);
    const verdictLine = result.accepted
      ? '**Re-judged: Correct.**'
      : '**Re-judged: Still incorrect.**';
    chatMessages.value = [
      ...chatMessages.value,
      {
        role: 'assistant',
        content: `${verdictLine}\n\n${result.reason}`,
      },
    ];

    if (result.accepted) {
      appealAccepted.value = true;
    }

    emit('appeal-resolved', {
      session: result.session,
      accepted: result.accepted,
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Appeal failed.';
  } finally {
    appealing.value = false;
  }
}

async function handleSend() {
  const text = draft.value.trim();
  if (!text || loading.value) {
    return;
  }

  draft.value = '';
  const userMsg: ChatMsg = { role: 'user', content: text };
  chatMessages.value = [...chatMessages.value, userMsg];

  loading.value = true;
  error.value = '';

  try {
    let streamedContent = '';
    const assistantMsg: ChatMsg = { role: 'assistant', content: '' };
    chatMessages.value = [...chatMessages.value, assistantMsg];
    const assistantIndex = chatMessages.value.length - 1;

    await api.streamQuizQuestionChat(
      {
        messages: chatMessages.value.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        word: props.word,
        sentence: props.sentence,
        type: props.type,
        answer: props.answer,
        userResponse: props.userResponse,
        isCorrect: props.isCorrect,
        newMessage: text,
      },
      (chunk) => {
        streamedContent += chunk;
        chatMessages.value[assistantIndex] = { ...assistantMsg, content: streamedContent };
      },
    );
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Chat failed.';
    // Remove the empty assistant bubble on error.
    chatMessages.value = chatMessages.value.filter((m) => m.content !== '');
  } finally {
    loading.value = false;
  }
}

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
