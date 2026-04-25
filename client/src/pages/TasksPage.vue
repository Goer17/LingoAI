<template>
  <section class="tasks-page">
    <p v-if="message" class="success-text">{{ message }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <div class="tasks-grid">
      <section class="card tasks-card">
        <div class="tasks-head">
          <div>
            <p class="eyebrow">Tasks</p>
            <h2>Learning Queue</h2>
            <p class="subtle-copy">Vocabulary quizzes are generated in the background. Start when ready.</p>
          </div>
          <button class="button button-secondary" type="button" :disabled="store.tasksLoading" @click="refresh">
            Refresh
          </button>
        </div>

        <p v-if="store.tasks.length === 0" class="empty-copy">No learning tasks yet.</p>

        <div v-else class="list-scroller">
          <article v-for="task in store.tasks" :key="task.id" class="task-row">
            <div class="task-main">
              <div class="inline-heading">
                <strong>{{ formatTaskType(task.type) }}</strong>
                <span class="task-status" :class="`status-${task.status}`">{{ task.status }}</span>
              </div>
              <p class="muted-text">Generated: {{ formatDate(task.createdAt) }}</p>
              <p class="muted-text">Questions: {{ task.questionCount || '-' }}</p>
              <p v-if="task.error" class="error-text">{{ task.error }}</p>
            </div>
            <button
              class="button button-primary"
              type="button"
              :disabled="task.status !== 'ready' || startingTaskId === task.id"
              @click="startTask(task.id)"
            >
              {{ startingTaskId === task.id ? 'Opening...' : 'Start' }}
            </button>
          </article>
        </div>
      </section>

      <section class="card tasks-card">
        <div class="tasks-head">
          <div>
            <p class="eyebrow">Review</p>
            <h2>Mistake Notebook</h2>
            <p class="subtle-copy">Solve mistakes correctly to remove them from the notebook.</p>
          </div>
          <button
            class="button button-primary"
            type="button"
            :disabled="store.mistakes.length === 0 || startingMistakeReview"
            @click="startMistakeReview"
          >
            {{ startingMistakeReview ? 'Opening...' : 'Start' }}
          </button>
        </div>

        <p class="muted-text">Total mistakes: {{ store.mistakes.length }}</p>
        <p v-if="store.mistakes.length === 0" class="empty-copy">No mistakes yet.</p>

        <div v-else class="list-scroller">
          <article v-for="item in store.mistakes" :key="item.id" class="task-row mistake-row">
            <span class="count-chip mistake-type-chip">{{ item.type === 'fill_blank' ? 'fill' : 'listening' }}</span>
            <div class="task-main">
              <div class="inline-heading">
                <strong :title="item.word">{{ truncateText(item.word, 36) }}</strong>
              </div>
              <p class="muted-text" :title="item.answer">Answer: {{ truncateText(item.answer, 56) }}</p>
              <p class="muted-text">Updated: {{ formatDate(item.updatedAt) }}</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useVocabularyStore } from '@/stores/vocabulary';

const store = useVocabularyStore();
const router = useRouter();
const error = ref('');
const message = ref('');
const startingTaskId = ref('');
const startingMistakeReview = ref(false);
let pollTimer: number | null = null;

onMounted(async () => {
  await refresh();
  pollTimer = window.setInterval(() => {
    if (store.tasks.some((item) => item.status === 'pending')) {
      void refresh();
    }
  }, 3000);
});

onUnmounted(() => {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
  }
});

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatTaskType(type: string) {
  return type
    .split('_')
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ');
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

async function refresh() {
  error.value = '';
  try {
    await store.fetchTasks();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load tasks.';
  }
}

async function startTask(taskId: string) {
  error.value = '';
  startingTaskId.value = taskId;
  try {
    const sessionId = await store.startTask(taskId);
    await router.push(`/quiz/${sessionId}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start task.';
  } finally {
    startingTaskId.value = '';
  }
}

async function startMistakeReview() {
  error.value = '';
  startingMistakeReview.value = true;
  try {
    const sessionId = await store.startMistakeReview();
    await router.push(`/quiz/${sessionId}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start mistake review.';
  } finally {
    startingMistakeReview.value = false;
  }
}
</script>
