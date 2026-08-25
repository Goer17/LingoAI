import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import QuizCard from '@/components/QuizCard.vue';
import QuizChatBox from '@/components/QuizChatBox.vue';
import SearchResultCard from '@/components/SearchResultCard.vue';
import { api } from '@/services/api';
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
const frozenQuestion = ref(null);
const submittedAnswer = ref('');
const submittedListeningAnswers = ref([]);
const lastAutoPlayedQuestionId = ref('');
const autoPlayArmed = ref(true);
const showChinese = ref(false);
const answerCommonUrl = ref(null);
onMounted(async () => {
    try {
        await store.loadQuiz(String(route.params.id));
        if (store.items.length === 0) {
            await store.fetchVocabulary().catch(() => undefined);
        }
    }
    catch (err) {
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
const answerWordResult = computed(() => {
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
async function submit(payload) {
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
            feedback.value = nextHint;
        }
        else {
            feedbackIsCorrect.value = false;
            feedback.value = nextHint;
        }
    }
    catch (err) {
        frozenQuestion.value = null;
        submittedListeningAnswers.value = [];
        error.value = err instanceof Error ? err.message : 'Failed to submit answer.';
    }
    finally {
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
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Audio playback failed.';
    }
}
async function playAnswerWordAudio(input) {
    error.value = '';
    try {
        // Prefer the real dictionary recording when available; fall back to TTS.
        const audioUrl = answerCommonUrl.value ?? await getAudioUrl(input);
        const audio = new Audio(audioUrl);
        await audio.play();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Audio playback failed.';
    }
}
watch(() => answerWordResult.value?.text ?? '', async (text) => {
    if (!text) {
        answerCommonUrl.value = null;
        return;
    }
    try {
        const { audioUrl } = await api.hasCommonAudio(text);
        answerCommonUrl.value = audioUrl;
    }
    catch {
        answerCommonUrl.value = null;
    }
}, { immediate: true });
watch(() => [displayQuestion.value?.id, awaitingNext.value], async ([questionId, waiting]) => {
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
    }
    catch {
        // Browser autoplay policies can block playback.
    }
}, { immediate: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "quiz-page" },
});
if (__VLS_ctx.showSummary) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "quiz-summary card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    (__VLS_ctx.score);
    (__VLS_ctx.total);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtle-copy" },
    });
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ class: "button button-primary" },
        to: (__VLS_ctx.summaryBackTo),
    }));
    const __VLS_2 = __VLS_1({
        ...{ class: "button button-primary" },
        to: (__VLS_ctx.summaryBackTo),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    (__VLS_ctx.summaryLabel);
    var __VLS_3;
}
else {
    /** @type {[typeof QuizCard, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(QuizCard, new QuizCard({
        ...{ 'onSubmit': {} },
        ...{ 'onPlayAudio': {} },
        modelValue: (__VLS_ctx.answer),
        submittedAnswer: (__VLS_ctx.submittedAnswer),
        submittedListeningAnswers: (__VLS_ctx.submittedListeningAnswers),
        feedback: (__VLS_ctx.feedback),
        feedbackIsCorrect: (__VLS_ctx.feedbackIsCorrect),
        question: (__VLS_ctx.displayQuestion),
        index: (__VLS_ctx.displayIndex),
        total: (__VLS_ctx.total),
        submitting: (__VLS_ctx.submitting),
        awaitingNext: (__VLS_ctx.awaitingNext),
        sourceType: (__VLS_ctx.store.quizSession?.sourceType ?? 'vocabulary_task'),
    }));
    const __VLS_5 = __VLS_4({
        ...{ 'onSubmit': {} },
        ...{ 'onPlayAudio': {} },
        modelValue: (__VLS_ctx.answer),
        submittedAnswer: (__VLS_ctx.submittedAnswer),
        submittedListeningAnswers: (__VLS_ctx.submittedListeningAnswers),
        feedback: (__VLS_ctx.feedback),
        feedbackIsCorrect: (__VLS_ctx.feedbackIsCorrect),
        question: (__VLS_ctx.displayQuestion),
        index: (__VLS_ctx.displayIndex),
        total: (__VLS_ctx.total),
        submitting: (__VLS_ctx.submitting),
        awaitingNext: (__VLS_ctx.awaitingNext),
        sourceType: (__VLS_ctx.store.quizSession?.sourceType ?? 'vocabulary_task'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
    let __VLS_7;
    let __VLS_8;
    let __VLS_9;
    const __VLS_10 = {
        onSubmit: (__VLS_ctx.submit)
    };
    const __VLS_11 = {
        onPlayAudio: (__VLS_ctx.playAudio)
    };
    var __VLS_6;
    if (__VLS_ctx.answerWordResult && !__VLS_ctx.awaitingNext) {
        /** @type {[typeof SearchResultCard, ]} */ ;
        // @ts-ignore
        const __VLS_12 = __VLS_asFunctionalComponent(SearchResultCard, new SearchResultCard({
            ...{ 'onToggleTranslation': {} },
            ...{ 'onPlayAudio': {} },
            ...{ class: "quiz-answer-card" },
            result: (__VLS_ctx.answerWordResult),
            showChinese: (__VLS_ctx.showChinese),
            saving: (false),
            allowSave: (false),
            showHeaderLabel: (false),
            hasCommonAudio: (!!__VLS_ctx.answerCommonUrl),
        }));
        const __VLS_13 = __VLS_12({
            ...{ 'onToggleTranslation': {} },
            ...{ 'onPlayAudio': {} },
            ...{ class: "quiz-answer-card" },
            result: (__VLS_ctx.answerWordResult),
            showChinese: (__VLS_ctx.showChinese),
            saving: (false),
            allowSave: (false),
            showHeaderLabel: (false),
            hasCommonAudio: (!!__VLS_ctx.answerCommonUrl),
        }, ...__VLS_functionalComponentArgsRest(__VLS_12));
        let __VLS_15;
        let __VLS_16;
        let __VLS_17;
        const __VLS_18 = {
            onToggleTranslation: (...[$event]) => {
                if (!!(__VLS_ctx.showSummary))
                    return;
                if (!(__VLS_ctx.answerWordResult && !__VLS_ctx.awaitingNext))
                    return;
                __VLS_ctx.showChinese = !__VLS_ctx.showChinese;
            }
        };
        const __VLS_19 = {
            onPlayAudio: (__VLS_ctx.playAnswerWordAudio)
        };
        var __VLS_14;
    }
    if (__VLS_ctx.awaitingNext && __VLS_ctx.displayQuestion) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "quiz-connected-stack" },
        });
        if (__VLS_ctx.answerWordResult) {
            /** @type {[typeof SearchResultCard, ]} */ ;
            // @ts-ignore
            const __VLS_20 = __VLS_asFunctionalComponent(SearchResultCard, new SearchResultCard({
                ...{ 'onToggleTranslation': {} },
                ...{ 'onPlayAudio': {} },
                result: (__VLS_ctx.answerWordResult),
                showChinese: (__VLS_ctx.showChinese),
                saving: (false),
                allowSave: (false),
                showHeaderLabel: (false),
                hasCommonAudio: (!!__VLS_ctx.answerCommonUrl),
            }));
            const __VLS_21 = __VLS_20({
                ...{ 'onToggleTranslation': {} },
                ...{ 'onPlayAudio': {} },
                result: (__VLS_ctx.answerWordResult),
                showChinese: (__VLS_ctx.showChinese),
                saving: (false),
                allowSave: (false),
                showHeaderLabel: (false),
                hasCommonAudio: (!!__VLS_ctx.answerCommonUrl),
            }, ...__VLS_functionalComponentArgsRest(__VLS_20));
            let __VLS_23;
            let __VLS_24;
            let __VLS_25;
            const __VLS_26 = {
                onToggleTranslation: (...[$event]) => {
                    if (!!(__VLS_ctx.showSummary))
                        return;
                    if (!(__VLS_ctx.awaitingNext && __VLS_ctx.displayQuestion))
                        return;
                    if (!(__VLS_ctx.answerWordResult))
                        return;
                    __VLS_ctx.showChinese = !__VLS_ctx.showChinese;
                }
            };
            const __VLS_27 = {
                onPlayAudio: (__VLS_ctx.playAnswerWordAudio)
            };
            var __VLS_22;
        }
        /** @type {[typeof QuizChatBox, ]} */ ;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent(QuizChatBox, new QuizChatBox({
            word: (__VLS_ctx.displayQuestion.word),
            sentence: (__VLS_ctx.displayQuestion.sentence),
            type: (__VLS_ctx.displayQuestion.type),
            answer: (__VLS_ctx.displayQuestion.answer),
            userResponse: (__VLS_ctx.submittedAnswer),
            isCorrect: (__VLS_ctx.feedbackIsCorrect),
            questionIndex: (__VLS_ctx.displayIndex),
            questionTotal: (__VLS_ctx.total),
        }));
        const __VLS_29 = __VLS_28({
            word: (__VLS_ctx.displayQuestion.word),
            sentence: (__VLS_ctx.displayQuestion.sentence),
            type: (__VLS_ctx.displayQuestion.type),
            answer: (__VLS_ctx.displayQuestion.answer),
            userResponse: (__VLS_ctx.submittedAnswer),
            isCorrect: (__VLS_ctx.feedbackIsCorrect),
            questionIndex: (__VLS_ctx.displayIndex),
            questionTotal: (__VLS_ctx.total),
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    }
    if (__VLS_ctx.error) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "error-text quiz-error" },
        });
        (__VLS_ctx.error);
    }
}
/** @type {__VLS_StyleScopedClasses['quiz-page']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-answer-card']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-connected-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-error']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            QuizCard: QuizCard,
            QuizChatBox: QuizChatBox,
            SearchResultCard: SearchResultCard,
            store: store,
            answer: answer,
            error: error,
            submitting: submitting,
            feedback: feedback,
            feedbackIsCorrect: feedbackIsCorrect,
            awaitingNext: awaitingNext,
            submittedAnswer: submittedAnswer,
            submittedListeningAnswers: submittedListeningAnswers,
            showChinese: showChinese,
            answerCommonUrl: answerCommonUrl,
            total: total,
            showSummary: showSummary,
            score: score,
            displayQuestion: displayQuestion,
            summaryBackTo: summaryBackTo,
            summaryLabel: summaryLabel,
            displayIndex: displayIndex,
            answerWordResult: answerWordResult,
            submit: submit,
            playAudio: playAudio,
            playAnswerWordAudio: playAnswerWordAudio,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
