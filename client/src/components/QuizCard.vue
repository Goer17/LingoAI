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
        Listen to the sentence and type the missing part.
      </template>
    </p>
    <div v-if="question.type === 'listening'" class="audio-box">
      <button class="icon-button" type="button" aria-label="Play audio" title="Play audio" @click="$emit('play-audio')">
        🔊
      </button>
    </div>
    <form class="quiz-form" @submit.prevent="handleSubmit">
      <div v-if="showInlineListeningBlanks" class="sentence-box sentence-box-inline">
        <template v-for="segment in listeningSegments" :key="segment.key">
          <span v-if="segment.type === 'text'">{{ segment.text }}</span>
          <template v-else>
            <input
              v-if="!awaitingNext"
              :ref="(el) => setBlankRef(el, segment.blankIndex)"
              v-model="listeningAnswers[segment.blankIndex]"
              type="text"
              class="inline-blank-input"
              :style="{ width: getBlankWidth(segment.blank.answer) }"
              :aria-label="`Blank ${segment.blankIndex + 1}`"
              @keydown="handleBlankKeydown($event, segment.blankIndex)"
              @keydown.enter.prevent="handleSubmit"
            />
            <span
              v-else
              class="inline-blank-input inline-blank-readonly"
              :class="getBlankReviewClass(segment.blankIndex)"
              :style="{ width: getBlankWidth(segment.blank.answer) }"
            >
              <template v-if="showListeningCorrection && isIncorrectBlank(segment.blankIndex)">
                <del>{{ displayListeningAnswers[segment.blankIndex] ?? '' }}</del>
              </template>
              <template v-else>
                {{ displayListeningAnswers[segment.blankIndex] ?? '' }}
              </template>
            </span>
            <span
              v-if="showListeningCorrection && isIncorrectBlank(segment.blankIndex)"
              class="inline-blank-correct"
            >
              ({{ segment.blank.answer }})
            </span>
          </template>
        </template>
      </div>
      <div v-else class="sentence-box">
        {{ maskedSentence }}
      </div>
      <input
        v-if="!showInlineListeningBlanks && !awaitingNext"
        ref="editableInput"
        v-model="model"
        type="text"
        placeholder="Type your answer and press Enter"
      />
      <input
        v-if="!showInlineListeningBlanks && awaitingNext"
        ref="readonlyInput"
        :value="submittedAnswer"
        type="text"
        readonly
        aria-label="Submitted answer"
      />
      <button ref="submitButton" class="button button-primary" type="submit" :disabled="submitDisabled">
        {{ submitLabel }}
      </button>
    </form>
    <p
      v-if="feedback"
      :class="feedbackIsCorrect ? 'success-text quiz-inline-feedback' : 'error-text quiz-inline-feedback'"
    >
      {{ feedback }}
    </p>
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
  submittedListeningAnswers: string[];
}>();

const emit = defineEmits<{
  submit: [payload?: { response: string; blankAnswers: string[] }];
  'play-audio': [];
}>();

const maskedSentence = computed(() => {
  if (!props.question) {
    return '';
  }

  if (props.question.maskedSentence) {
    return props.question.maskedSentence;
  }

  const answer = props.question.answer;
  const source = props.question.sentence;
  const index = source.toLowerCase().indexOf(answer.toLowerCase());
  if (index < 0) {
    return source;
  }

  const mask = '_'.repeat(Math.max(6, answer.length));
  return `${source.slice(0, index)}${mask}${source.slice(index + answer.length)}`;
});

const showInlineListeningBlanks = computed(() => (
  props.question?.type === 'listening'
  && Array.isArray(props.question.blanks)
  && props.question.blanks.length > 0
));

const listeningAnswers = ref<string[]>([]);
const blankRefs = ref<Array<HTMLInputElement | null>>([]);
const displayListeningAnswers = computed(() => {
  if (props.awaitingNext && props.submittedListeningAnswers.length > 0) {
    return props.submittedListeningAnswers;
  }

  return listeningAnswers.value;
});
const showListeningCorrection = computed(() => (
  props.awaitingNext
  && props.question?.type === 'listening'
  && !props.feedbackIsCorrect
));

const listeningSegments = computed(() => {
  const question = props.question;
  if (!question || !showInlineListeningBlanks.value || !question.blanks) {
    return [];
  }

  const blanks = question.blanks.slice().sort((a, b) => a.start - b.start);
  const output: Array<
    { key: string; type: 'text'; text: string }
    | { key: string; type: 'blank'; blankIndex: number; blank: (typeof blanks)[number] }
  > = [];

  let cursor = 0;
  for (let i = 0; i < blanks.length; i += 1) {
    const blank = blanks[i];
    if (blank.start > cursor) {
      output.push({
        key: `text-${i}-${cursor}`,
        type: 'text',
        text: question.sentence.slice(cursor, blank.start),
      });
    }

    output.push({
      key: `blank-${i}-${blank.start}`,
      type: 'blank',
      blankIndex: i,
      blank,
    });

    cursor = blank.end;
  }

  if (cursor < question.sentence.length) {
    output.push({
      key: `text-tail-${cursor}`,
      type: 'text',
      text: question.sentence.slice(cursor),
    });
  }

  return output;
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

const submitDisabled = computed(() => {
  if (props.submitting) {
    return true;
  }

  if (props.awaitingNext) {
    return false;
  }

  if (showInlineListeningBlanks.value) {
    return listeningAnswers.value.some((item) => !item.trim());
  }

  return !model.value.trim();
});

const editableInput = ref<HTMLInputElement | null>(null);
const readonlyInput = ref<HTMLInputElement | null>(null);
const submitButton = ref<HTMLButtonElement | null>(null);

watch(
  () => props.awaitingNext,
  async (value) => {
    await nextTick();
    if (showInlineListeningBlanks.value) {
      if (value) {
        submitButton.value?.focus();
      } else {
        blankRefs.value[0]?.focus();
      }
      return;
    }

    if (value) {
      readonlyInput.value?.focus();
      return;
    }

    editableInput.value?.focus();
  },
  { immediate: true },
);

watch(
  () => props.question?.id,
  (nextId, prevId) => {
    if (!nextId || nextId === prevId || props.submitting) {
      return;
    }

    if (props.awaitingNext) {
      return;
    }

    if (!showInlineListeningBlanks.value || !props.question?.blanks) {
      listeningAnswers.value = [];
      blankRefs.value = [];
      return;
    }

    listeningAnswers.value = props.question.blanks.map(() => '');
    blankRefs.value = props.question.blanks.map(() => null);
  },
  { immediate: true },
);

function setBlankRef(el: unknown, index: number) {
  blankRefs.value[index] = el instanceof HTMLInputElement ? el : null;
}

function handleBlankKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    blankRefs.value[Math.min(index + 1, blankRefs.value.length - 1)]?.focus();
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    blankRefs.value[Math.max(index - 1, 0)]?.focus();
  }
}

function buildListeningResponse() {
  const question = props.question;
  if (!question || !showInlineListeningBlanks.value || !question.blanks) {
    return '';
  }

  const blanks = question.blanks.slice().sort((a, b) => a.start - b.start);
  let cursor = 0;
  let output = '';
  for (let i = 0; i < blanks.length; i += 1) {
    const blank = blanks[i];
    output += question.sentence.slice(cursor, blank.start);
    output += listeningAnswers.value[i] ?? '';
    cursor = blank.end;
  }

  output += question.sentence.slice(cursor);
  return output;
}

function handleSubmit() {
  if (showInlineListeningBlanks.value && !props.awaitingNext) {
    emit('submit', {
      response: buildListeningResponse(),
      blankAnswers: [...listeningAnswers.value],
    });
    return;
  }

  emit('submit');
}

function getBlankWidth(answer: string) {
  return `${Math.max(6, answer.length + 3)}ch`;
}

function isIncorrectBlank(index: number) {
  if (!showListeningCorrection.value || !props.question?.blanks?.[index]) {
    return false;
  }

  return normalizeComparison(displayListeningAnswers.value[index] ?? '')
    !== normalizeComparison(props.question.blanks[index].answer);
}

function normalizeComparison(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getBlankReviewClass(index: number) {
  if (!props.awaitingNext || props.question?.type !== 'listening') {
    return '';
  }

  return isIncorrectBlank(index) ? 'inline-blank-review-wrong' : 'inline-blank-review-correct';
}
</script>
