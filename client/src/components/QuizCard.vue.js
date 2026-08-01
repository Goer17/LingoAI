import { computed, nextTick, ref, watch } from 'vue';
import { Check, Volume2, X } from 'lucide-vue-next';
const model = defineModel({ required: true });
const props = defineProps();
const emit = defineEmits();
const maskedSentence = computed(() => {
    if (!props.question) {
        return '';
    }
    if (props.question.maskedSentence) {
        if (props.question.maskedSentence.includes('[BLANK]')) {
            return props.question.maskedSentence.replace('[BLANK]', '_'.repeat(Math.max(6, props.question.answer.length)));
        }
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
const showInlineListeningBlanks = computed(() => (props.question?.type === 'listening'
    && Array.isArray(props.question.blanks)
    && props.question.blanks.length > 0));
const listeningAnswers = ref([]);
const blankRefs = ref([]);
const displayListeningAnswers = computed(() => {
    if (props.awaitingNext && props.submittedListeningAnswers.length > 0) {
        return props.submittedListeningAnswers;
    }
    return listeningAnswers.value;
});
const showListeningCorrection = computed(() => (props.awaitingNext
    && props.question?.type === 'listening'
    && !props.feedbackIsCorrect));
const showFillBlankWithInlineAnswer = computed(() => (props.awaitingNext
    && props.question?.type === 'fill_blank'
    && !props.feedbackIsCorrect
    && props.sourceType !== 'listening_task'
    && Boolean(props.question.maskedSentence?.includes('[BLANK]'))));
const fillBlankSegments = computed(() => {
    const question = props.question;
    if (!question?.maskedSentence?.includes('[BLANK]')) {
        return [{ key: 'raw', type: 'text', text: maskedSentence.value }];
    }
    const [before, ...rest] = question.maskedSentence.split('[BLANK]');
    const after = rest.join('[BLANK]');
    return [
        { key: 'before', type: 'text', text: before },
        { key: 'blank', type: 'blank' },
        { key: 'after', type: 'text', text: after },
    ];
});
const listeningSegments = computed(() => {
    const question = props.question;
    if (!question || !showInlineListeningBlanks.value || !question.blanks) {
        return [];
    }
    const blanks = question.blanks.slice().sort((a, b) => a.start - b.start);
    const output = [];
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
const editableInput = ref(null);
const readonlyInput = ref(null);
const submitButton = ref(null);
watch(() => props.awaitingNext, async (value) => {
    await nextTick();
    if (showInlineListeningBlanks.value) {
        if (value) {
            submitButton.value?.focus();
        }
        else {
            blankRefs.value[0]?.focus();
        }
        return;
    }
    if (value) {
        readonlyInput.value?.focus();
        return;
    }
    editableInput.value?.focus();
}, { immediate: true });
watch(() => props.question?.id, (nextId, prevId) => {
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
}, { immediate: true });
function setBlankRef(el, index) {
    blankRefs.value[index] = el instanceof HTMLInputElement ? el : null;
}
function handleBlankKeydown(event, index) {
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
function getBlankWidth(answer) {
    return `${Math.max(6, answer.length + 3)}ch`;
}
function isIncorrectBlank(index) {
    if (!showListeningCorrection.value || !props.question?.blanks?.[index]) {
        return false;
    }
    return normalizeComparison(displayListeningAnswers.value[index] ?? '')
        !== normalizeComparison(props.question.blanks[index].answer);
}
function normalizeComparison(value) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
function getBlankReviewClass(index) {
    if (!props.awaitingNext || props.question?.type !== 'listening') {
        return '';
    }
    return isIncorrectBlank(index) ? 'inline-blank-review-wrong' : 'inline-blank-review-correct';
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_defaults = {};
const __VLS_modelEmit = defineEmits();
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.question) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "quiz-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.index + 1);
    (__VLS_ctx.total);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.question.type === 'fill_blank' ? 'Fill in the Blank' : 'Listening');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "quiz-instruction" },
    });
    if (__VLS_ctx.question.type === 'fill_blank') {
    }
    else {
    }
    if (__VLS_ctx.question.type === 'listening') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "audio-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.question))
                        return;
                    if (!(__VLS_ctx.question.type === 'listening'))
                        return;
                    __VLS_ctx.$emit('play-audio');
                } },
            ...{ class: "icon-button" },
            type: "button",
            'aria-label': "Play audio",
            title: "Play audio",
        });
        const __VLS_0 = {}.Volume2;
        /** @type {[typeof __VLS_components.Volume2, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            size: (18),
        }));
        const __VLS_2 = __VLS_1({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleSubmit) },
        ...{ class: "quiz-form" },
    });
    if (__VLS_ctx.showInlineListeningBlanks) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "sentence-box sentence-box-inline" },
        });
        for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.listeningSegments))) {
            (segment.key);
            if (segment.type === 'text') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (segment.text);
            }
            else {
                if (!__VLS_ctx.awaitingNext) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                        ...{ onKeydown: (...[$event]) => {
                                if (!(__VLS_ctx.question))
                                    return;
                                if (!(__VLS_ctx.showInlineListeningBlanks))
                                    return;
                                if (!!(segment.type === 'text'))
                                    return;
                                if (!(!__VLS_ctx.awaitingNext))
                                    return;
                                __VLS_ctx.handleBlankKeydown($event, segment.blankIndex);
                            } },
                        ...{ onKeydown: (__VLS_ctx.handleSubmit) },
                        ref: ((el) => __VLS_ctx.setBlankRef(el, segment.blankIndex)),
                        value: (__VLS_ctx.listeningAnswers[segment.blankIndex]),
                        type: "text",
                        ...{ class: "inline-blank-input" },
                        ...{ style: ({ width: __VLS_ctx.getBlankWidth(segment.blank.answer) }) },
                        'aria-label': (`Blank ${segment.blankIndex + 1}`),
                    });
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "inline-blank-input inline-blank-readonly" },
                        ...{ class: (__VLS_ctx.getBlankReviewClass(segment.blankIndex)) },
                        ...{ style: ({ width: __VLS_ctx.getBlankWidth(segment.blank.answer) }) },
                    });
                    if (__VLS_ctx.showListeningCorrection && __VLS_ctx.isIncorrectBlank(segment.blankIndex)) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.del, __VLS_intrinsicElements.del)({});
                        (__VLS_ctx.displayListeningAnswers[segment.blankIndex] ?? '');
                    }
                    else {
                        (__VLS_ctx.displayListeningAnswers[segment.blankIndex] ?? '');
                    }
                }
                if (__VLS_ctx.showListeningCorrection && __VLS_ctx.isIncorrectBlank(segment.blankIndex)) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "inline-blank-correct inline-blank-correct-success" },
                    });
                    (segment.blank.answer);
                }
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "sentence-box" },
        });
        if (__VLS_ctx.question.type === 'fill_blank' && __VLS_ctx.showFillBlankWithInlineAnswer) {
            for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.fillBlankSegments))) {
                (segment.key);
                if (segment.type === 'text') {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (segment.text);
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "inline-blank-input inline-blank-readonly inline-blank-review-wrong fill-blank-inline-answer" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.del, __VLS_intrinsicElements.del)({});
                    (__VLS_ctx.submittedAnswer);
                }
                if (segment.type === 'blank') {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "inline-blank-correct inline-blank-correct-success" },
                    });
                    (__VLS_ctx.question.answer);
                }
            }
        }
        else {
            (__VLS_ctx.maskedSentence);
            if (__VLS_ctx.awaitingNext && !__VLS_ctx.feedbackIsCorrect && __VLS_ctx.question.type === 'fill_blank') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "inline-blank-correct inline-blank-correct-success" },
                });
                (__VLS_ctx.question.answer);
            }
        }
    }
    if (!__VLS_ctx.showInlineListeningBlanks && !__VLS_ctx.awaitingNext) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ref: "editableInput",
            value: (__VLS_ctx.model),
            type: "text",
            placeholder: "Type your answer and press Enter",
        });
        /** @type {typeof __VLS_ctx.editableInput} */ ;
    }
    if (!__VLS_ctx.showInlineListeningBlanks && __VLS_ctx.awaitingNext) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ref: "readonlyInput",
            value: (__VLS_ctx.submittedAnswer),
            type: "text",
            readonly: true,
            'aria-label': "Submitted answer",
        });
        /** @type {typeof __VLS_ctx.readonlyInput} */ ;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ref: "submitButton",
        ...{ class: "button button-primary" },
        type: "submit",
        disabled: (__VLS_ctx.submitDisabled),
    });
    /** @type {typeof __VLS_ctx.submitButton} */ ;
    (__VLS_ctx.submitLabel);
    if (__VLS_ctx.awaitingNext && __VLS_ctx.question) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "quiz-answer-reveal" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.question.answer);
    }
    if (__VLS_ctx.feedback) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: (__VLS_ctx.feedbackIsCorrect ? 'success-text quiz-inline-feedback' : 'error-text quiz-inline-feedback') },
        });
        if (__VLS_ctx.feedbackIsCorrect) {
            const __VLS_4 = {}.Check;
            /** @type {[typeof __VLS_components.Check, ]} */ ;
            // @ts-ignore
            const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
                size: (14),
                ...{ class: "feedback-icon" },
            }));
            const __VLS_6 = __VLS_5({
                size: (14),
                ...{ class: "feedback-icon" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_5));
        }
        else {
            const __VLS_8 = {}.X;
            /** @type {[typeof __VLS_components.X, ]} */ ;
            // @ts-ignore
            const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
                size: (14),
                ...{ class: "feedback-icon" },
            }));
            const __VLS_10 = __VLS_9({
                size: (14),
                ...{ class: "feedback-icon" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        }
        (__VLS_ctx.feedback);
    }
}
/** @type {__VLS_StyleScopedClasses['quiz-card']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-instruction']} */ ;
/** @type {__VLS_StyleScopedClasses['audio-box']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-form']} */ ;
/** @type {__VLS_StyleScopedClasses['sentence-box']} */ ;
/** @type {__VLS_StyleScopedClasses['sentence-box-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-input']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-input']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-readonly']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-correct']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-correct-success']} */ ;
/** @type {__VLS_StyleScopedClasses['sentence-box']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-input']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-readonly']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-review-wrong']} */ ;
/** @type {__VLS_StyleScopedClasses['fill-blank-inline-answer']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-correct']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-correct-success']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-correct']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-blank-correct-success']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-answer-reveal']} */ ;
/** @type {__VLS_StyleScopedClasses['feedback-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['feedback-icon']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Check: Check,
            Volume2: Volume2,
            X: X,
            model: model,
            maskedSentence: maskedSentence,
            showInlineListeningBlanks: showInlineListeningBlanks,
            listeningAnswers: listeningAnswers,
            displayListeningAnswers: displayListeningAnswers,
            showListeningCorrection: showListeningCorrection,
            showFillBlankWithInlineAnswer: showFillBlankWithInlineAnswer,
            fillBlankSegments: fillBlankSegments,
            listeningSegments: listeningSegments,
            submitLabel: submitLabel,
            submitDisabled: submitDisabled,
            editableInput: editableInput,
            readonlyInput: readonlyInput,
            submitButton: submitButton,
            setBlankRef: setBlankRef,
            handleBlankKeydown: handleBlankKeydown,
            handleSubmit: handleSubmit,
            getBlankWidth: getBlankWidth,
            isIncorrectBlank: isIncorrectBlank,
            getBlankReviewClass: getBlankReviewClass,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
