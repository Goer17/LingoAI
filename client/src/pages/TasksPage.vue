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
            <p class="subtle-copy">Vocabulary, listening, and expression tasks are generated in the background. Start when ready.</p>
          </div>
          <div class="result-actions">
            <button class="button button-secondary" type="button" :disabled="store.tasksLoading" @click="refresh">
              Refresh
            </button>
            <button
              v-if="store.tasks.length > 0"
              class="button button-secondary"
              type="button"
              @click="toggleDeleteMode"
            >
              {{ deleteMode ? 'Cancel' : 'Delete' }}
            </button>
          </div>
        </div>

        <p v-if="store.tasks.length === 0" class="empty-copy">No learning tasks yet.</p>

        <div v-else class="list-scroller" :class="{ 'delete-mode': deleteMode }">
          <article v-for="task in store.tasks" :key="task.id" class="task-row">
            <button
              v-if="deleteMode"
              class="task-delete-btn"
              type="button"
              :disabled="deletingTaskId === task.id"
              @click="deleteTask(task.id)"
            >
              &times;
            </button>
            <div class="task-main">
              <div class="inline-heading">
                <strong>{{ formatTaskType(task.type) }}</strong>
                <span class="task-status" :class="`status-${task.status}`">{{ formatStatusLabel(task.status) }}</span>
              </div>
              <p class="muted-text">Generated: {{ formatDate(task.createdAt) }}</p>
              <p class="muted-text">{{ task.type === 'expression' ? `Objectives: ${task.questionCount || '-'}` : `Questions: ${task.questionCount || '-'}` }}</p>
              <p v-if="task.groupName" class="muted-text">Topic: {{ task.groupName }}</p>
              <p v-if="task.type === 'expression' && task.scenario" class="muted-text">
                Topic: {{ task.scenario.topicTitle }}
              </p>
              <div v-if="task.status === 'pending'" class="task-progress">
                <div class="task-progress-track">
                  <span class="task-progress-fill" :style="{ width: `${pendingProgressPercent(task.id)}%` }"></span>
                </div>
                <p class="muted-text task-progress-copy">
                  {{ pendingProgressPercent(task.id) }}% · {{ pendingStageText(task.id) }}
                </p>
              </div>
              <p v-if="task.error" class="error-text">{{ task.error }}</p>
            </div>
            <div v-if="!deleteMode" class="task-actions">
              <button
                v-if="task.status === 'failed'"
                class="button button-secondary"
                type="button"
                :disabled="retryingTaskId === task.id"
                @click="retryTask(task.id)"
              >
                {{ retryingTaskId === task.id ? 'Retrying...' : 'Retry' }}
              </button>
              <button
                v-else
                class="button button-primary"
                type="button"
                :disabled="task.status !== 'ready' || startingTaskId === task.id"
                @click="startTask(task.id)"
              >
                {{ startingTaskId === task.id ? 'Opening...' : 'Start' }}
              </button>
            </div>
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
const retryingTaskId = ref('');
const deletingTaskId = ref('');
const deleteMode = ref(false);
const startingMistakeReview = ref(false);
let pollTimer: number | null = null;
const pendingProgressTick = ref(Date.now());

onMounted(async () => {
  await refresh();
  pollTimer = window.setInterval(() => {
    pendingProgressTick.value = Date.now();
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

function formatStatusLabel(status: string) {
  return status.toUpperCase();
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
    const task = store.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error('Task not found.');
    }

    if (task.type === 'expression') {
      await router.push(`/expression-practice/${task.id}`);
      return;
    }

    const sessionId = await store.startTask(taskId);
    await router.push(`/quiz/${sessionId}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start task.';
  } finally {
    startingTaskId.value = '';
  }
}

async function retryTask(taskId: string) {
  error.value = '';
  message.value = '';
  retryingTaskId.value = taskId;
  try {
    await store.retryTask(taskId);
    message.value = 'Regenerating the failed questions — already generated ones are kept. This page updates automatically.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to retry task.';
  } finally {
    retryingTaskId.value = '';
  }
}

function pendingProgressPercent(taskId: string) {
  const task = store.tasks.find((item) => item.id === taskId);
  if (!task || task.status !== 'pending') {
    return 0;
  }
  const elapsedMs = Math.max(0, pendingProgressTick.value - new Date(task.createdAt).getTime());
  const maxMs = 12000;
  const ratio = Math.min(0.95, elapsedMs / maxMs);
  return Math.max(5, Math.round(ratio * 100));
}

function pendingStageText(taskId: string) {
  const progress = pendingProgressPercent(taskId);
  if (progress < 35) {
    return 'Collecting learning items';
  }
  if (progress < 70) {
    return 'Generating quiz questions';
  }
  return 'Finalizing task';
}

function toggleDeleteMode() {
  deleteMode.value = !deleteMode.value;
}

async function deleteTask(taskId: string) {
  error.value = '';
  message.value = '';
  deletingTaskId.value = taskId;
  try {
    await store.clearTask(taskId);
    message.value = 'Task removed.';
    if (store.tasks.length === 0) {
      deleteMode.value = false;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to remove task.';
  } finally {
    deletingTaskId.value = '';
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
