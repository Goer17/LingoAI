import { computed, nextTick, ref, watch } from 'vue';
const model = defineModel({ required: true });
const props = defineProps();
const __VLS_emit = defineEmits();
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
const editableInput = ref(null);
const readonlyInput = ref(null);
watch(() => props.awaitingNext, async (value) => {
    await nextTick();
    if (value) {
        readonlyInput.value?.focus();
        return;
    }
    editableInput.value?.focus();
}, { immediate: true });
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
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sentence-box" },
    });
    (__VLS_ctx.maskedSentence);
    if (__VLS_ctx.feedback) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: (__VLS_ctx.feedbackIsCorrect ? 'success-text quiz-inline-feedback' : 'error-text quiz-inline-feedback') },
        });
        (__VLS_ctx.feedback);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (...[$event]) => {
                if (!(__VLS_ctx.question))
                    return;
                __VLS_ctx.$emit('submit');
            } },
        ...{ class: "quiz-form" },
    });
    if (!__VLS_ctx.awaitingNext) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ref: "editableInput",
            value: (__VLS_ctx.model),
            type: "text",
            placeholder: "Type your answer and press Enter",
        });
        /** @type {typeof __VLS_ctx.editableInput} */ ;
    }
    else {
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
        ...{ class: "button button-primary" },
        type: "submit",
        disabled: (__VLS_ctx.submitting || (!__VLS_ctx.awaitingNext && !__VLS_ctx.model.trim())),
    });
    (__VLS_ctx.submitLabel);
}
/** @type {__VLS_StyleScopedClasses['quiz-card']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-instruction']} */ ;
/** @type {__VLS_StyleScopedClasses['audio-box']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['sentence-box']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-form']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            model: model,
            maskedSentence: maskedSentence,
            submitLabel: submitLabel,
            editableInput: editableInput,
            readonlyInput: readonlyInput,
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
