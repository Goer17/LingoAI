<template>
  <section class="writing-task-page">
    <p v-if="message" class="success-text">{{ message }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <div v-if="task" class="writing-task-grid">
      <section class="card writing-task-card">
        <p class="eyebrow">Writing Task</p>
        <h2>{{ task.payload?.exercise?.topicTitle || 'Topic' }}</h2>
        <p class="subtle-copy">
          Target length: {{ task.payload?.exercise?.targetWordCount || 150 }} words
        </p>

        <div class="writing-task-requirement">
          <h3>Requirement</h3>
          <p>{{ task.payload?.exercise?.requirement }}</p>
        </div>

        <div class="writing-task-requirement">
          <h3>Key Points</h3>
          <ul>
            <li v-for="(point, index) in task.payload?.exercise?.keyPoints || []" :key="`kp-${index}`">
              {{ point }}
            </li>
          </ul>
        </div>

        <form v-if="!evaluation" class="chat-form" @submit.prevent="handleEvaluate">
          <label class="field">
            <span>Your Essay</span>
            <textarea
              v-model="essay"
              rows="12"
              placeholder="Write your essay here. Keep it aligned with the requirement and key points."
              :disabled="submitting"
            />
          </label>
          <div class="inline-heading">
            <p class="muted-text">Current word count: {{ wordCount }}</p>
            <button class="button button-primary" type="submit" :disabled="submitting || !essay.trim()">
              {{ submitting ? 'Evaluating...' : 'Submit For Scoring' }}
            </button>
          </div>
        </form>
        <div v-else class="writing-complete-banner">
          <p class="success-text">Scored. This task is closed.</p>
          <p class="muted-text">You can return to Tasks and start a new writing task.</p>
        </div>
      </section>

      <section class="card writing-score-card">
        <template v-if="evaluation">
          <p class="eyebrow">Evaluation</p>
          <h2>{{ evaluation.score.toFixed(1) }} / 10</h2>
          <p class="subtle-copy">{{ evaluation.topicAlignment }}</p>
          <button class="button button-primary writing-return-button" type="button" @click="backToTasks">
            Back to Tasks
          </button>

          <div class="writing-feedback-block">
            <h3>Summary</h3>
            <p>{{ evaluation.summary }}</p>
          </div>

          <div class="writing-feedback-block">
            <h3>Strengths</h3>
            <ul>
              <li v-for="(item, index) in evaluation.strengths" :key="`st-${index}`">{{ item }}</li>
            </ul>
          </div>

          <div class="writing-feedback-block">
            <h3>Grammar Corrections</h3>
            <ul>
              <li v-for="(item, index) in evaluation.grammarCorrections" :key="`gc-${index}`">{{ item }}</li>
            </ul>
          </div>

          <div class="writing-feedback-block">
            <h3>Expression Polish</h3>
            <ul>
              <li v-for="(item, index) in evaluation.expressionPolish" :key="`ep-${index}`">{{ item }}</li>
            </ul>
          </div>

          <div class="writing-feedback-block">
            <h3>Improved Essay</h3>
            <div class="writing-improved-box">
              <p>{{ evaluation.improvedEssay }}</p>
            </div>
          </div>
        </template>

        <template v-else>
          <p class="eyebrow">Evaluation</p>
          <h2>Waiting For Submission</h2>
          <p class="subtle-copy">Submit your essay to get a score, grammar correction, and polished version.</p>
        </template>
      </section>
    </div>

    <section v-else class="card writing-task-card">
      <p class="eyebrow">Writing Task</p>
      <h2>Task Not Found</h2>
      <p class="subtle-copy">Return to Tasks and open a valid writing task.</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { LearningTask, WritingEvaluation } from '@/types/models';
import { useVocabularyStore } from '@/stores/vocabulary';

const route = useRoute();
const router = useRouter();
const store = useVocabularyStore();
const error = ref('');
const message = ref('');
const submitting = ref(false);
const essay = ref('');
const task = ref<LearningTask | null>(null);
const evaluation = ref<WritingEvaluation | null>(null);

const wordCount = computed(() => {
  const trimmed = essay.value.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).filter(Boolean).length;
});

onMounted(async () => {
  try {
    await store.fetchTasks();
    const taskId = String(route.params.id);
    const current = store.tasks.find((item) => item.id === taskId && item.type === 'writing') ?? null;
    task.value = current;
    if (current?.payload?.submission) {
      essay.value = current.payload.submission;
    }
    evaluation.value = current?.payload?.evaluation ?? null;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load writing task.';
  }
});

async function handleEvaluate() {
  if (!task.value || evaluation.value) {
    return;
  }

  error.value = '';
  message.value = '';
  submitting.value = true;
  try {
    const result = await store.evaluateWritingTask(task.value.id, essay.value);
    task.value = result.task;
    evaluation.value = result.evaluation;
    message.value = 'Evaluation completed.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to evaluate writing.';
  } finally {
    submitting.value = false;
  }
}

async function backToTasks() {
  await store.fetchTasks();
  await router.push('/tasks');
}
</script>
