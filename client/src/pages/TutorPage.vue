<template>
  <section class="tutor-page">
    <aside class="card tutor-sidebar">
      <div class="tutor-sidebar-head">
        <div>
          <p class="eyebrow">Tutor</p>
          <h2>Sessions</h2>
        </div>
        <button class="button button-primary button-tight" type="button" :disabled="sending" @click="startNewChat">
          <Plus :size="14" />
          New
        </button>
      </div>

      <p v-if="loadingSessions" class="empty-copy">Loading sessions...</p>
      <div v-else class="tutor-session-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="tutor-session"
          :class="{ active: session.id === activeId, disabled: sending }"
          role="button"
          :tabindex="sending ? -1 : 0"
          @click="selectSession(session.id)"
          @keydown.enter.prevent="selectSession(session.id)"
        >
          <span class="tutor-session-title">{{ session.title }}</span>
          <span class="tutor-session-meta">
            {{ formatDate(session.updatedAt) }} · {{ session.messageCount }} messages
          </span>
          <span v-if="session.preview" class="tutor-session-preview">{{ session.preview }}</span>
          <button
            class="tutor-session-delete"
            type="button"
            title="Delete session"
            :disabled="sending"
            @click.stop="deleteSession(session.id)"
          >&times;</button>
        </div>
        <p v-if="sessions.length === 0" class="empty-copy">No conversations yet. Start a new chat.</p>
      </div>

      <div class="tutor-memory">
        <button class="tutor-memory-toggle" type="button" @click="showMemory = !showMemory">
          <Brain :size="14" />
          <span>Memory</span>
          <span class="count-chip">{{ memories.length }}</span>
        </button>

        <div v-if="showMemory" class="tutor-memory-body">
          <form class="tutor-memory-form" @submit.prevent="addMemory">
            <input
              v-model="memoryDraft"
              type="text"
              maxlength="1000"
              placeholder="Add a durable note..."
              :disabled="savingMemory"
            />
            <button class="button button-secondary button-tight" type="submit" :disabled="savingMemory || !memoryDraft.trim()">
              Add
            </button>
          </form>

          <p v-if="memories.length === 0" class="empty-copy">
            Nothing saved yet. The tutor writes memories as it learns about you.
          </p>
          <ul v-else class="tutor-memory-list">
            <li v-for="memory in memories" :key="memory.id">
              <div class="tutor-memory-head">
                <span class="tutor-memory-kind">{{ memory.kind }}</span>
                <span class="tutor-memory-date">{{ formatDate(memory.createdAt) }}</span>
                <button class="tutor-memory-delete" type="button" title="Delete memory" @click="deleteMemory(memory.id)">
                  &times;
                </button>
              </div>
              <p>{{ memory.content }}</p>
            </li>
          </ul>
        </div>
      </div>
    </aside>

    <section class="card tutor-chat">
      <header class="tutor-chat-head">
        <div>
          <p class="eyebrow">Agent chat</p>
          <h2>{{ activeSession?.title || 'New conversation' }}</h2>
          <p class="subtle-copy">Your tutor can read your notebook, add examples, start quizzes, and remember what matters.</p>
        </div>
      </header>

      <div ref="scrollRef" class="tutor-messages">
        <div v-if="messages.length === 0" class="tutor-empty">
          <p class="tutor-empty-title">Talk to your English tutor</p>
          <p class="subtle-copy">
            Ask a question, review your weakest words, add an example sentence to a listening topic, or have a quiz generated.
          </p>
          <div class="tutor-suggestions">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              class="tutor-suggestion"
              type="button"
              @click="draft = suggestion"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>

        <div v-for="message in messages" :key="message.id" class="tutor-msg" :class="message.role">
          <div class="tutor-avatar" aria-hidden="true">{{ message.role === 'user' ? 'Me' : 'T' }}</div>
          <div class="tutor-msg-column">
            <span class="chat-role">{{ message.role === 'user' ? 'You' : 'Tutor' }}</span>
            <div class="tutor-bubble">
              <div v-if="message.toolCalls?.length" class="tutor-tool-traces">
                <span
                  v-for="(trace, index) in message.toolCalls"
                  :key="`${trace.name}-${index}`"
                  class="tutor-tool-chip"
                  :class="{ 'is-error': !trace.ok, 'is-pending': trace.pending }"
                >
                  <Wrench :size="12" />
                  <span class="tutor-tool-label">{{ trace.label }}</span>
                  <span v-if="trace.pending || trace.summary" class="tutor-tool-summary">
                    {{ trace.pending ? 'working...' : trace.summary }}
                  </span>
                </span>
              </div>

              <div v-if="message.content" class="chat-content" v-html="renderMarkdown(message.content)" />
              <span v-if="message.id === streamingId" class="tutor-caret" />
            </div>
          </div>
        </div>

        <p v-if="showThinking" class="muted-text tutor-thinking">Tutor is thinking...</p>
        <p v-if="error" class="error-text">{{ error }}</p>
      </div>

      <form class="tutor-composer" @submit.prevent="handleSend">
        <textarea
          v-model="draft"
          rows="3"
          placeholder="Ask anything, or tell your tutor what to add..."
          :disabled="sending"
          @keydown.enter.exact.prevent="handleSend"
        />
        <div class="tutor-composer-actions">
          <span class="subtle-copy">Enter to send · Shift+Enter for a new line</span>
          <button class="button button-primary" type="submit" :disabled="sending || !draft.trim()">
            {{ sending ? 'Replying...' : 'Send' }}
          </button>
        </div>
      </form>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { Brain, Plus, Wrench } from 'lucide-vue-next';
import { api } from '@/services/api';
import { renderMarkdown } from '@/utils/markdown';
import type { TutorMemory, TutorMemoryKind, TutorMessage, TutorSession, TutorToolTrace } from '@/types/models';

type DisplayTrace = TutorToolTrace & { pending?: boolean };
type DisplayMessage = Omit<TutorMessage, 'toolCalls'> & { toolCalls?: DisplayTrace[] };

interface ToolEvent {
  status: 'start' | 'done';
  name: string;
  label: string;
  ok?: boolean;
  summary?: string;
}

const suggestions = [
  'Quiz me on my weakest words',
  'Review my vocabulary notebook and tell me what to focus on',
  'Add a sentence about airports to my Travel listening group',
  'What mistakes keep coming up in my quizzes?',
];

const sessions = ref<TutorSession[]>([]);
const activeId = ref<string | null>(null);
const messages = ref<DisplayMessage[]>([]);
const memories = ref<TutorMemory[]>([]);
const draft = ref('');
const memoryDraft = ref('');
const sending = ref(false);
const loadingSessions = ref(true);
const savingMemory = ref(false);
const showMemory = ref(false);
const error = ref('');
const streamingId = ref<string | null>(null);
const scrollRef = ref<HTMLElement | null>(null);

const activeSession = computed(() => sessions.value.find((session) => session.id === activeId.value) ?? null);
const showThinking = computed(() => {
  if (!sending.value) {
    return false;
  }

  const last = messages.value[messages.value.length - 1];
  return Boolean(last && last.role === 'assistant' && !last.content && !(last.toolCalls?.length));
});

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function scrollToBottom() {
  await nextTick();
  const element = scrollRef.value;
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
}

async function loadSessions() {
  loadingSessions.value = true;
  try {
    sessions.value = await api.listTutorSessions();
    if (sessions.value.length > 0) {
      await selectSession(sessions.value[0].id);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load tutor sessions.';
  } finally {
    loadingSessions.value = false;
  }
}

async function loadMemories() {
  try {
    memories.value = await api.listTutorMemories();
  } catch {
    // The memory panel is auxiliary; a failed load should not break chat.
  }
}

async function selectSession(id: string) {
  if (sending.value || id === activeId.value) {
    return;
  }

  activeId.value = id;
  messages.value = [];
  error.value = '';

  try {
    const detail = await api.getTutorSession(id);
    messages.value = detail.messages;
    await scrollToBottom();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load the session.';
  }
}

async function startNewChat() {
  if (sending.value) {
    return;
  }

  activeId.value = null;
  messages.value = [];
  draft.value = '';
  error.value = '';
}

async function deleteSession(id: string) {
  if (sending.value) {
    return;
  }

  if (!window.confirm('Delete this tutor conversation?')) {
    return;
  }

  try {
    await api.deleteTutorSession(id);
    sessions.value = sessions.value.filter((session) => session.id !== id);
    if (activeId.value === id) {
      startNewChat();
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete the session.';
  }
}

async function addMemory() {
  const content = memoryDraft.value.trim();
  if (!content || savingMemory.value) {
    return;
  }

  savingMemory.value = true;
  try {
    const memory = await api.addTutorMemory(content, 'note' as TutorMemoryKind);
    memories.value = [...memories.value, memory];
    memoryDraft.value = '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save the memory.';
  } finally {
    savingMemory.value = false;
  }
}

async function deleteMemory(id: string) {
  try {
    await api.deleteTutorMemory(id);
    memories.value = memories.value.filter((memory) => memory.id !== id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete the memory.';
  }
}

function applyToolEvent(message: DisplayMessage, event: ToolEvent) {
  if (!message.toolCalls) {
    message.toolCalls = [];
  }

  if (event.status === 'start') {
    message.toolCalls.push({
      name: event.name,
      label: event.label,
      ok: true,
      pending: true,
    });
    return;
  }

  for (let index = message.toolCalls.length - 1; index >= 0; index -= 1) {
    const trace = message.toolCalls[index];
    if (trace.name === event.name && trace.pending) {
      trace.ok = event.ok ?? true;
      trace.summary = event.summary;
      trace.pending = false;
      return;
    }
  }

  message.toolCalls.push({
    name: event.name,
    label: event.label,
    ok: event.ok ?? true,
    summary: event.summary,
    pending: false,
  });
}

async function handleSend() {
  const text = draft.value.trim();
  if (!text || sending.value) {
    return;
  }

  error.value = '';
  draft.value = '';
  sending.value = true;

  const now = new Date().toISOString();
  const userMessage: DisplayMessage = {
    id: `local-user-${Date.now()}`,
    role: 'user',
    content: text,
    createdAt: now,
  };
  const assistantMessage: DisplayMessage = {
    id: `local-assistant-${Date.now()}`,
    role: 'assistant',
    content: '',
    createdAt: now,
    toolCalls: [],
  };

  messages.value.push(userMessage, assistantMessage);
  streamingId.value = assistantMessage.id;
  await scrollToBottom();

  try {
    let sessionId = activeId.value;
    if (!sessionId) {
      const created = await api.createTutorSession();
      sessions.value = [created, ...sessions.value];
      activeId.value = created.id;
      sessionId = created.id;
    }

    const result = await api.streamTutorChat(sessionId, text, {
      onDelta: (chunk) => {
        assistantMessage.content += chunk;
        void scrollToBottom();
      },
      onTool: (event) => {
        applyToolEvent(assistantMessage, event);
        void scrollToBottom();
      },
    });

    messages.value = messages.value.map((message) => (
      message.id === assistantMessage.id
        ? { ...result.message, toolCalls: result.message.toolCalls ?? [] }
        : message
    ));
    sessions.value = [
      result.session,
      ...sessions.value.filter((session) => session.id !== result.session.id),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    void loadMemories();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Tutor chat failed.';
    messages.value = messages.value.filter((message) => (
      message.id !== assistantMessage.id
      || message.content.trim() !== ''
      || (message.toolCalls?.length ?? 0) > 0
    ));
  } finally {
    streamingId.value = null;
    sending.value = false;
    await scrollToBottom();
  }
}

onMounted(async () => {
  await Promise.all([loadSessions(), loadMemories()]);
});
</script>
