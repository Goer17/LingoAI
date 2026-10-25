import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import QuizCard from '@/components/QuizCard.vue';
import QuizChatBox from '@/components/QuizChatBox.vue';
import SearchResultCard from '@/components/SearchResultCard.vue';
import { api } from '@/services/api';
import { useVocabularyStore } from '@/stores/vocabulary';
import { clearCachedAudioUrl, getAudioUrl } from '@/utils/audioCache';
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
const listeningEntries = ref([]);
const noteDraft = ref('');
const noteSaving = ref(false);
const noteError = ref('');
const regeneratingImage = ref(false);
onMounted(async () => {
    try {
        await store.loadQuiz(String(route.params.id));
        if (store.items.length === 0) {
            await store.fetchVocabulary().catch(() => undefined);
        }
        const needsListeningEntries = store.quizSession?.questions.some((question) => question.type === 'listening');
        if (needsListeningEntries) {
            if (store.listeningItems.length > 0) {
                listeningEntries.value = [...store.listeningItems];
            }
            else {
                listeningEntries.value = await api.getListening().catch(() => []);
            }
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
const answerWordEntry = computed(() => {
    if (!awaitingNext.value || displayQuestion.value?.type !== 'fill_blank' || !displayQuestion.value.word) {
        return null;
    }
    const target = displayQuestion.value.word.trim().toLowerCase();
    if (!target) {
        return null;
    }
    return store.items.find((item) => item.text.trim().toLowerCase() === target) ?? null;
});
const answerWordResult = computed(() => {
    const entry = answerWordEntry.value;
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
const answerSentenceEntry = computed(() => {
    const question = displayQuestion.value;
    if (!awaitingNext.value || question?.type !== 'listening') {
        return null;
    }
    const target = question.sentence.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!target) {
        return null;
    }
    const candidates = [
        ...listeningEntries.value,
        ...store.listeningItems,
    ];
    return candidates.find((item) => (item.sentence.trim().replace(/\s+/g, ' ').toLowerCase() === target)) ?? null;
});
const answerSentenceText = computed(() => (answerSentenceEntry.value?.sentence ?? displayQuestion.value?.sentence ?? ''));
const noteTarget = computed(() => {
    const word = answerWordEntry.value;
    if (word) {
        return { kind: 'word', id: word.id, note: word.note ?? '' };
    }
    const sentence = answerSentenceEntry.value;
    if (sentence) {
        return { kind: 'listening', id: sentence.id, note: sentence.note ?? '' };
    }
    return null;
});
const canAppeal = computed(() => (!feedbackIsCorrect.value
    && displayQuestion.value?.type === 'fill_blank'
    && Boolean(displayQuestion.value.imageUrl)));
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
async function saveNote() {
    const target = noteTarget.value;
    if (!target || noteSaving.value) {
        return;
    }
    if (noteDraft.value === (target.note ?? '')) {
        return;
    }
    noteSaving.value = true;
    noteError.value = '';
    try {
        if (target.kind === 'word') {
            await store.saveWordNoteById(target.id, noteDraft.value);
        }
        else {
            const entry = await store.saveListeningNoteById(target.id, noteDraft.value);
            listeningEntries.value = listeningEntries.value.map((item) => (item.id === entry.id ? entry : item));
        }
    }
    catch (err) {
        noteError.value = err instanceof Error ? err.message : 'Failed to save the note.';
        noteDraft.value = target.note ?? '';
    }
    finally {
        noteSaving.value = false;
    }
}
async function regenerateQuestionImage() {
    const question = displayQuestion.value;
    const session = store.quizSession;
    if (!question || !session || regeneratingImage.value) {
        return;
    }
    error.value = '';
    regeneratingImage.value = true;
    try {
        const data = await api.regenerateQuizQuestionImage(session.id, question.id);
        store.setQuizSession(data.session);
        if (frozenQuestion.value?.id === question.id) {
            frozenQuestion.value = { ...frozenQuestion.value, imageUrl: data.imageUrl };
        }
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Image regeneration failed.';
    }
    finally {
        regeneratingImage.value = false;
    }
}
function handleAppealResolved(payload) {
    store.setQuizSession(payload.session);
    if (payload.accepted) {
        feedbackIsCorrect.value = true;
        feedback.value = payload.session.completed
            ? 'Press Enter again to finish.'
            : 'Press Enter again for next question.';
    }
}
watch(() => `${noteTarget.value?.kind ?? ''}:${noteTarget.value?.id ?? ''}`, () => {
    noteDraft.value = noteTarget.value?.note ?? '';
    noteError.value = '';
}, { immediate: true });
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
async function regenerateAnswerWordAudio(input) {
    error.value = '';
    try {
        clearCachedAudioUrl(input);
        const { audioUrl } = await api.regenerateAudio(input);
        const audio = new Audio(audioUrl);
        await audio.play();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Audio regeneration failed.';
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
        ...{ 'onRegenerateImage': {} },
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
        regeneratingImage: (__VLS_ctx.regeneratingImage),
        sourceType: (__VLS_ctx.store.quizSession?.sourceType ?? 'vocabulary_task'),
    }));
    const __VLS_5 = __VLS_4({
        ...{ 'onSubmit': {} },
        ...{ 'onPlayAudio': {} },
        ...{ 'onRegenerateImage': {} },
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
        regeneratingImage: (__VLS_ctx.regeneratingImage),
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
    const __VLS_12 = {
        onRegenerateImage: (__VLS_ctx.regenerateQuestionImage)
    };
    var __VLS_6;
    if (__VLS_ctx.awaitingNext && __VLS_ctx.displayQuestion) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "quiz-answer-stack" },
        });
        if (__VLS_ctx.noteTarget) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "card quiz-note-card field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "eyebrow" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
                ...{ onChange: (__VLS_ctx.saveNote) },
                value: (__VLS_ctx.noteDraft),
                rows: "3",
                placeholder: "Add your own note...",
                disabled: (__VLS_ctx.noteSaving),
            });
            if (__VLS_ctx.noteSaving) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "subtle-copy quiz-note-status" },
                });
            }
            else if (__VLS_ctx.noteError) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "error-text quiz-note-status" },
                });
                (__VLS_ctx.noteError);
            }
        }
        if (__VLS_ctx.answerWordResult) {
            /** @type {[typeof SearchResultCard, ]} */ ;
            // @ts-ignore
            const __VLS_13 = __VLS_asFunctionalComponent(SearchResultCard, new SearchResultCard({
                ...{ 'onToggleTranslation': {} },
                ...{ 'onPlayAudio': {} },
                ...{ 'onRegenerateAudio': {} },
                result: (__VLS_ctx.answerWordResult),
                showChinese: (__VLS_ctx.showChinese),
                saving: (false),
                allowSave: (false),
                showHeaderLabel: (false),
                hasCommonAudio: (!!__VLS_ctx.answerCommonUrl),
            }));
            const __VLS_14 = __VLS_13({
                ...{ 'onToggleTranslation': {} },
                ...{ 'onPlayAudio': {} },
                ...{ 'onRegenerateAudio': {} },
                result: (__VLS_ctx.answerWordResult),
                showChinese: (__VLS_ctx.showChinese),
                saving: (false),
                allowSave: (false),
                showHeaderLabel: (false),
                hasCommonAudio: (!!__VLS_ctx.answerCommonUrl),
            }, ...__VLS_functionalComponentArgsRest(__VLS_13));
            let __VLS_16;
            let __VLS_17;
            let __VLS_18;
            const __VLS_19 = {
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
            const __VLS_20 = {
                onPlayAudio: (__VLS_ctx.playAnswerWordAudio)
            };
            const __VLS_21 = {
                onRegenerateAudio: (__VLS_ctx.regenerateAnswerWordAudio)
            };
            var __VLS_15;
        }
        else if (__VLS_ctx.displayQuestion.type === 'listening') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                ...{ class: "card quiz-sentence-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "eyebrow" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "quiz-sentence-text" },
            });
            (__VLS_ctx.answerSentenceText);
            if (__VLS_ctx.answerSentenceEntry) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "subtle-copy" },
                });
                (__VLS_ctx.answerSentenceEntry.familiarity);
                (__VLS_ctx.answerSentenceEntry.known ? ' · known' : '');
            }
        }
    }
    if (__VLS_ctx.awaitingNext && __VLS_ctx.displayQuestion) {
        /** @type {[typeof QuizChatBox, ]} */ ;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent(QuizChatBox, new QuizChatBox({
            ...{ 'onAppealResolved': {} },
            sessionId: (__VLS_ctx.store.quizSession?.id ?? ''),
            questionId: (__VLS_ctx.displayQuestion.id),
            word: (__VLS_ctx.displayQuestion.word),
            sentence: (__VLS_ctx.displayQuestion.sentence),
            type: (__VLS_ctx.displayQuestion.type),
            answer: (__VLS_ctx.displayQuestion.answer),
            userResponse: (__VLS_ctx.submittedAnswer),
            isCorrect: (__VLS_ctx.feedbackIsCorrect),
            canAppeal: (__VLS_ctx.canAppeal),
            questionIndex: (__VLS_ctx.displayIndex),
            questionTotal: (__VLS_ctx.total),
        }));
        const __VLS_23 = __VLS_22({
            ...{ 'onAppealResolved': {} },
            sessionId: (__VLS_ctx.store.quizSession?.id ?? ''),
            questionId: (__VLS_ctx.displayQuestion.id),
            word: (__VLS_ctx.displayQuestion.word),
            sentence: (__VLS_ctx.displayQuestion.sentence),
            type: (__VLS_ctx.displayQuestion.type),
            answer: (__VLS_ctx.displayQuestion.answer),
            userResponse: (__VLS_ctx.submittedAnswer),
            isCorrect: (__VLS_ctx.feedbackIsCorrect),
            canAppeal: (__VLS_ctx.canAppeal),
            questionIndex: (__VLS_ctx.displayIndex),
            questionTotal: (__VLS_ctx.total),
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        let __VLS_25;
        let __VLS_26;
        let __VLS_27;
        const __VLS_28 = {
            onAppealResolved: (__VLS_ctx.handleAppealResolved)
        };
        var __VLS_24;
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
/** @type {__VLS_StyleScopedClasses['quiz-answer-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-note-card']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-note-status']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-note-status']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-sentence-card']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-sentence-text']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
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
            noteDraft: noteDraft,
            noteSaving: noteSaving,
            noteError: noteError,
            regeneratingImage: regeneratingImage,
            total: total,
            showSummary: showSummary,
            score: score,
            displayQuestion: displayQuestion,
            summaryBackTo: summaryBackTo,
            summaryLabel: summaryLabel,
            displayIndex: displayIndex,
            answerWordResult: answerWordResult,
            answerSentenceEntry: answerSentenceEntry,
            answerSentenceText: answerSentenceText,
            noteTarget: noteTarget,
            canAppeal: canAppeal,
            submit: submit,
            saveNote: saveNote,
            regenerateQuestionImage: regenerateQuestionImage,
            handleAppealResolved: handleAppealResolved,
            playAudio: playAudio,
            playAnswerWordAudio: playAnswerWordAudio,
            regenerateAnswerWordAudio: regenerateAnswerWordAudio,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
