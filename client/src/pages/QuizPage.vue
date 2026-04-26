<template>
  <div class="quiz-page">
    <section v-if="showSummary" class="quiz-summary card">
      <p class="eyebrow">Session Complete</p>
      <h1>[{{ score }} / {{ total }}]</h1>
      <p class="subtle-copy">Familiarity has been updated based on your answers.</p>
      <RouterLink class="button button-primary" :to="summaryBackTo">{{ summaryLabel }}</RouterLink>
    </section>

    <QuizCard
      v-else
      v-model="answer"
      :submitted-answer="submittedAnswer"
      :submitted-listening-answers="submittedListeningAnswers"
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
    <SearchResultCard
      v-if="answerWordResult"
      class="quiz-answer-card"
      :result="answerWordResult"
      :show-chinese="showChinese"
      :saving="false"
      :allow-save="false"
      @toggle-translation="showChinese = !showChinese"
      @play-audio="playAnswerWordAudio"
    />

    <p v-if="error" class="error-text quiz-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { QuizQuestion, SearchResult } from '@/types/models';
import { RouterLink, useRoute } from 'vue-router';
import QuizCard from '@/components/QuizCard.vue';
import SearchResultCard from '@/components/SearchResultCard.vue';
import { useVocabularyStore } from '@/stores/vocabulary';
import { getAudioUrl } from '@/utils/audioCache';

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
const submittedListeningAnswers = ref<string[]>([]);
const lastAutoPlayedQuestionId = ref('');
const autoPlayArmed = ref(true);
const showChinese = ref(false);

onMounted(async () => {
  try {
    await store.loadQuiz(String(route.params.id));
    if (store.items.length === 0) {
      await store.fetchVocabulary().catch(() => undefined);
    }
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
const displayQuestion = computed(() => {
  if (awaitingNext.value || submitting.value) {
    return frozenQuestion.value ?? currentQuestion.value;
  }

  return currentQuestion.value;
});
const summaryBackTo = computed(() => store.quizSession?.sourceType ? '/tasks' : '/vocabulary');
const summaryLabel = computed(() => store.quizSession?.sourceType ? 'Back to Tasks' : 'Back to Vocabulary');
const displayIndex = computed(() => {
  if (!awaitingNext.value) {
    return currentIndex.value;
  }

  return Math.max(currentIndex.value - 1, 0);
});
const answerWordResult = computed<SearchResult | null>(() => {
  if (!awaitingNext.value || !displayQuestion.value?.word) {
    return null;
  }

  const target = displayQuestion.value.word.trim().toLowerCase();
  if (!target) {
    return null;
  }

  const entry = store.items.find((item) => item.text.trim().toLowerCase() === target);
  if (!entry) {
    return null;
  }

  return {
    text: entry.text,
    type: entry.type,
    found: true,
    pronunciation: entry.pronunciation,
    meanings: entry.meanings,
    derivatives: entry.derivatives,
    ttsText: entry.ttsText,
  };
});

async function submit(payload?: { response: string; blankAnswers: string[] }) {
  if (submitting.value) {
    return;
  }

  if (awaitingNext.value) {
    autoPlayArmed.value = true;
    awaitingNext.value = false;
    frozenQuestion.value = null;
    submittedAnswer.value = '';
    submittedListeningAnswers.value = [];
    feedback.value = '';
    answer.value = '';
    return;
  }

  const question = currentQuestion.value;
  const response = question?.type === 'listening' && payload?.response
    ? payload.response.trim()
    : answer.value.trim();
  if (!question || !response) {
    return;
  }

  error.value = '';
  feedback.value = '';
  submitting.value = true;
  autoPlayArmed.value = false;
  frozenQuestion.value = question;
  try {
    const data = await store.submitQuizAnswer(question.id, response);
    const answerRecord = data.session.answers.find((item) => item.questionId === question.id);
    submittedAnswer.value = response;
    submittedListeningAnswers.value = payload?.blankAnswers ? [...payload.blankAnswers] : [];
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
    frozenQuestion.value = null;
    submittedListeningAnswers.value = [];
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

async function playAnswerWordAudio(input: string) {
  error.value = '';
  try {
    const audioUrl = await getAudioUrl(input);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Audio playback failed.';
  }
}

watch(
  () => [displayQuestion.value?.id, awaitingNext.value] as const,
  async ([questionId, waiting]) => {
    const question = displayQuestion.value;
    if (!questionId || !question || waiting || !autoPlayArmed.value || question.type !== 'listening' || !question.audioUrl) {
      return;
    }

    if (lastAutoPlayedQuestionId.value === questionId) {
      return;
    }

    lastAutoPlayedQuestionId.value = questionId;
    try {
      const audio = new Audio(question.audioUrl);
      await audio.play();
    } catch {
      // Browser autoplay policies can block playback.
    }
  },
  { immediate: true },
);
</script>
