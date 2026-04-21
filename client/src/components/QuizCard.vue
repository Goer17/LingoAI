<template>
  <section v-if="question" class="quiz-card">
    <div class="quiz-meta">
      <span>Question {{ index + 1 }} / {{ total }}</span>
      <span>{{ question.type === 'fill_blank' ? 'Fill in the Blank' : 'Listening' }}</span>
    </div>
    <p class="quiz-instruction">
      <template v-if="question.type === 'fill_blank'">
        Complete the missing word. Keep the original spelling.
      </template>
      <template v-else>
        Listen to the sentence and type the missing word.
      </template>
    </p>
    <div v-if="question.type === 'listening'" class="audio-box">
      <button class="icon-button" type="button" aria-label="Play audio" title="Play audio" @click="$emit('play-audio')">
        🔊
      </button>
    </div>
    <div class="sentence-box">
      {{ maskedSentence }}
    </div>
    <p
      v-if="feedback"
      :class="feedbackIsCorrect ? 'success-text quiz-inline-feedback' : 'error-text quiz-inline-feedback'"
    >
      {{ feedback }}
    </p>
    <form class="quiz-form" @submit.prevent="$emit('submit')">
      <input
        v-if="!awaitingNext"
        ref="editableInput"
        v-model="model"
        type="text"
        placeholder="Type your answer and press Enter"
      />
      <input
        v-else
        ref="readonlyInput"
        :value="submittedAnswer"
        type="text"
        readonly
        aria-label="Submitted answer"
      />
      <button class="button button-primary" type="submit" :disabled="submitting || (!awaitingNext && !model.trim())">
        {{ submitLabel }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { QuizQuestion } from '@/types/models';

const model = defineModel<string>({ required: true });

const props = defineProps<{
  question: QuizQuestion | null;
  submittedAnswer: string;
  feedback: string;
  feedbackIsCorrect: boolean;
  index: number;
  total: number;
  submitting: boolean;
  awaitingNext: boolean;
}>();

defineEmits<{
  submit: [];
  'play-audio': [];
}>();

const maskedSentence = computed(() => {
  if (!props.question) {
    return '';
  }

  const answer = props.question.answer;
  const pattern = new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
  return props.question.sentence.replace(pattern, '______');
});

const submitLabel = computed(() => {
  if (props.submitting) {
    return 'Checking...';
  }

  if (props.awaitingNext) {
    return props.index + 1 === props.total ? 'Finish' : 'Next';
  }

  return 'Check';
});

const editableInput = ref<HTMLInputElement | null>(null);
const readonlyInput = ref<HTMLInputElement | null>(null);

watch(
  () => props.awaitingNext,
  async (value) => {
    await nextTick();
    if (value) {
      readonlyInput.value?.focus();
      return;
    }

    editableInput.value?.focus();
  },
  { immediate: true },
);
</script>
