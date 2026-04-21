<template>
  <div class="quiz-page">
    <section v-if="showSummary" class="quiz-summary card">
      <p class="eyebrow">Session Complete</p>
      <h1>[{{ score }} / {{ total }}]</h1>
      <p class="subtle-copy">Familiarity has been updated based on your answers.</p>
      <RouterLink class="button button-primary" to="/vocabulary">Back to Vocabulary</RouterLink>
    </section>

    <QuizCard
      v-else
      v-model="answer"
      :submitted-answer="submittedAnswer"
      :feedback="feedback"
      :feedback-is-correct="feedbackIsCorrect"
      :question="displayQuestion"
      :index="displayIndex"
      :total="total"
      :submitting="submitting"
      :awaiting-next="awaitingNext"
      @submit="submit"
      @play-audio="playAudio"
    />

    <p v-if="error" class="error-text quiz-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { QuizQuestion } from '@/types/models';
import { RouterLink, useRoute } from 'vue-router';
import QuizCard from '@/components/QuizCard.vue';
import { useVocabularyStore } from '@/stores/vocabulary';

const route = useRoute();
const store = useVocabularyStore();
const answer = ref('');
const error = ref('');
const submitting = ref(false);
const feedback = ref('');
const feedbackIsCorrect = ref(false);
const awaitingNext = ref(false);
const frozenQuestion = ref<QuizQuestion | null>(null);
const submittedAnswer = ref('');

onMounted(async () => {
  try {
    await store.loadQuiz(String(route.params.id));
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load quiz.';
  }
});

const currentIndex = computed(() => store.quizSession?.currentIndex ?? 0);
const currentQuestion = computed(() => {
  if (!store.quizSession) {
    return null;
  }
  return store.quizSession.questions[currentIndex.value] ?? null;
});
const total = computed(() => store.quizSession?.questions.length ?? 0);
const completed = computed(() => Boolean(store.quizSession?.completed));
const showSummary = computed(() => completed.value && !awaitingNext.value);
const score = computed(() => store.quizSession?.answers.filter((item) => item.isCorrect).length ?? 0);
const displayQuestion = computed(() => awaitingNext.value ? frozenQuestion.value : currentQuestion.value);
const displayIndex = computed(() => {
  if (!awaitingNext.value) {
    return currentIndex.value;
  }

  return Math.max(currentIndex.value - 1, 0);
});

async function submit() {
  if (submitting.value) {
    return;
  }

  if (awaitingNext.value) {
    awaitingNext.value = false;
    frozenQuestion.value = null;
    submittedAnswer.value = '';
    feedback.value = '';
    answer.value = '';
    return;
  }

  const question = currentQuestion.value;
  const response = answer.value.trim();
  if (!question || !response) {
    return;
  }

  error.value = '';
  feedback.value = '';
  submitting.value = true;
  try {
    const data = await store.submitQuizAnswer(question.id, response);
    const answerRecord = data.session.answers.find((item) => item.questionId === question.id);
    frozenQuestion.value = question;
    submittedAnswer.value = response;
    awaitingNext.value = true;
    const nextHint = data.session.completed
      ? 'Press Enter again to finish.'
      : 'Press Enter again for next question.';

    if (answerRecord?.isCorrect) {
      feedbackIsCorrect.value = true;
      feedback.value = `Correct. ${nextHint}`;
    } else {
      feedbackIsCorrect.value = false;
      feedback.value = `Incorrect. Correct answer: ${question.answer}. ${nextHint}`;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to submit answer.';
  } finally {
    submitting.value = false;
  }
}

async function playAudio() {
  if (!displayQuestion.value?.audioUrl) {
    return;
  }

  const audio = new Audio(displayQuestion.value.audioUrl);
  try {
    await audio.play();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Audio playback failed.';
  }
}
</script>
