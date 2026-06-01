<template>
  <section class="expression-practice-page">
    <div v-if="loading" class="card expression-loading-card">
      <p class="eyebrow">Expression Practice</p>
      <h2>Loading Scenario...</h2>
      <p class="subtle-copy">Preparing your conversation scenario.</p>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <div v-if="scenario && !loading" class="expression-practice-grid">
      <section class="card expression-chat-card">
        <div class="expression-scenario-header">
          <p class="eyebrow">{{ scenario.topicTitle }}</p>
          <h2>{{ scenario.assistantRole }}</h2>
          <p class="subtle-copy">{{ scenario.setting }}</p>
          <p class="muted-text">You are: {{ scenario.userRole }}</p>
        </div>

        <div ref="chatRef" class="expression-chat-history">
          <template v-for="(msg, index) in chatHistory" :key="index">
            <div
              class="chat-bubble"
              :class="msg.role"
            >
              <span class="chat-role">{{ msg.role === 'user' ? 'You' : scenario.assistantRole }}</span>
              <div class="chat-content" v-html="renderSimpleMarkdown(msg.content)" />
            </div>
            <div
              v-if="ended && msg.role === 'user' && polishResults.has(index)"
              class="polish-feedback"
              :class="{ perfect: polishResults.get(index)!.isPerfect }"
            >
              <span v-if="polishResults.get(index)!.isPerfect" class="polish-text">✅ Perfect!</span>
              <span v-else class="polish-text">✏️ {{ polishResults.get(index)!.polished }}</span>
              <span
                v-if="!polishResults.get(index)!.isPerfect && polishResults.get(index)!.explanation"
                class="polish-tooltip"
              >{{ polishResults.get(index)!.explanation }}</span>
            </div>
          </template>
          <p v-if="chatHistory.length === 0 && !ended" class="empty-copy">Start the conversation. Say hello!</p>
        </div>

        <form v-if="!ended" class="chat-form" @submit.prevent="handleSend">
          <textarea
            v-model="draft"
            rows="2"
            placeholder="Type your message..."
            :disabled="sending"
            @keydown.enter.exact.prevent="handleSend"
          />
          <button class="button button-primary" type="submit" :disabled="sending || !draft.trim()">
            {{ sending ? 'Sending...' : 'Send' }}
          </button>
        </form>
      </section>

      <section class="card expression-objectives-card">
        <p class="eyebrow">Objectives</p>
        <h3>Goals to Complete</h3>

        <div class="expression-objective-list">
          <div
            v-for="obj in objectiveStatuses"
            :key="obj.id"
            class="expression-objective-item"
            :class="{ completed: obj.completed }"
          >
            <span class="expression-objective-check">{{ obj.completed ? '✓' : '○' }}</span>
            <span>{{ obj.description }}</span>
          </div>
        </div>

        <div v-if="!ended" class="expression-end-bar">
          <p class="muted-text">
            {{ completedCount }}/{{ objectiveStatuses.length }} completed
          </p>
          <button
            class="button button-primary"
            type="button"
            :disabled="!allCompleted || polishing"
            @click="handleEnd"
          >
            {{ polishing ? 'Reviewing...' : 'End Practice' }}
          </button>
        </div>

        <div v-if="ended" class="expression-end-bar">
          <button class="button button-primary" type="button" @click="backToTopics">
            Back to Topics
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/services/api';
import { useVocabularyStore } from '@/stores/vocabulary';
import type { PolishResult, ScenarioData } from '@/types/models';

const route = useRoute();
const router = useRouter();
const store = useVocabularyStore();
const loading = ref(true);
const error = ref('');
const sending = ref(false);
const polishing = ref(false);
const ended = ref(false);
const draft = ref('');
const chatRef = ref<HTMLElement | null>(null);
const taskId = ref('');

const scenario = ref<ScenarioData | null>(null);
const chatHistory = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
const completedIds = ref<Set<string>>(new Set());
const polishResults = ref<Map<number, PolishResult>>(new Map());

const objectiveStatuses = computed(() => {
  if (!scenario.value) {
    return [];
  }

  return scenario.value.objectives.map((obj) => ({
    ...obj,
    completed: completedIds.value.has(obj.id),
  }));
});

const completedCount = computed(() => completedIds.value.size);
const allCompleted = computed(() => {
  if (!scenario.value) {
    return false;
  }

  return completedIds.value.size >= scenario.value.objectives.length;
});

onMounted(async () => {
  taskId.value = String(route.params.taskId);
  try {
    await store.fetchTasks();
    const task = store.tasks.find((item) => item.id === taskId.value);
    if (!task || task.type !== 'expression') {
      error.value = 'Expression task not found.';
      return;
    }

    if (!task.scenario) {
      error.value = 'Scenario data not available.';
      return;
    }

    scenario.value = task.scenario;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load scenario.';
  } finally {
    loading.value = false;
  }
});

async function scrollToBottom() {
  await nextTick();
  if (chatRef.value) {
    chatRef.value.scrollTop = chatRef.value.scrollHeight;
  }
}

async function handleSend() {
  const message = draft.value.trim();
  if (!message || !scenario.value || sending.value) {
    return;
  }

  error.value = '';
  sending.value = true;
  draft.value = '';

  chatHistory.value.push({ role: 'user', content: message });
  chatHistory.value.push({ role: 'assistant', content: '' });
  const assistantIndex = chatHistory.value.length - 1;
  await scrollToBottom();

  try {
    const historyForApi = chatHistory.value.slice(0, -1).filter((m) => m.content);

    await api.streamScenarioChat(
      scenario.value,
      historyForApi,
      message,
      (chunk) => {
        chatHistory.value[assistantIndex].content += chunk;
        void scrollToBottom();
      },
    );

    void checkObjectivesInBackground();
  } catch (err) {
    chatHistory.value[assistantIndex].content = err instanceof Error ? err.message : 'Chat failed.';
    error.value = err instanceof Error ? err.message : 'Chat failed.';
  } finally {
    sending.value = false;
    await scrollToBottom();
  }
}

async function checkObjectivesInBackground() {
  if (!scenario.value || ended.value) {
    return;
  }

  try {
    const validHistory = chatHistory.value.filter((m) => m.content);
    const result = await api.checkObjectives(scenario.value, validHistory);
    for (const id of result.completedObjectiveIds) {
      completedIds.value.add(id);
    }
  } catch {
    // silently ignore objective check failures
  }
}

async function handleEnd() {
  if (!scenario.value || polishing.value) {
    return;
  }

  error.value = '';
  polishing.value = true;
  ended.value = true;

  try {
    const userMessages: string[] = [];
    const userIndices: number[] = [];
    chatHistory.value.forEach((msg, index) => {
      if (msg.role === 'user' && msg.content) {
        userMessages.push(msg.content);
        userIndices.push(index);
      }
    });

    if (userMessages.length > 0) {
      const { results } = await api.polishUserMessages(scenario.value, userMessages);
      const map = new Map<number, PolishResult>();
      for (const result of results) {
        const chatIndex = userIndices[result.index];
        if (chatIndex !== undefined) {
          map.set(chatIndex, result);
        }
      }
      polishResults.value = map;
    }

    if (taskId.value) {
      await store.clearTask(taskId.value).catch(() => {});
    }

    await scrollToBottom();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate feedback.';
  } finally {
    polishing.value = false;
  }
}

async function backToTopics() {
  await router.push('/writing');
}

function renderSimpleMarkdown(text: string) {
  return escapeHtml(text)
    .replace(/\n/g, '<br>')
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
