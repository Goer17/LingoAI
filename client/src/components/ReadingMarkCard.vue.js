import { onBeforeUnmount, ref, watch } from 'vue';
const props = defineProps();
const emit = defineEmits();
const draft = ref(props.mark.note);
const saved = ref(props.mark.note);
const dragging = ref(false);
const savedLabel = ref('');
let timer;
watch(() => props.mark.note, (note) => {
    if (note !== saved.value) {
        draft.value = note;
        saved.value = note;
    }
});
function scheduleSave() {
    savedLabel.value = 'editing…';
    if (timer) {
        window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => flushSave(), 600);
}
function flushSave() {
    if (timer) {
        window.clearTimeout(timer);
        timer = undefined;
    }
    if (draft.value === saved.value) {
        return;
    }
    saved.value = draft.value;
    savedLabel.value = 'saved';
    emit('save-note', props.mark.id, draft.value);
}
function handleDragStart(event) {
    dragging.value = true;
    if (!event.dataTransfer) {
        return;
    }
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-reading-mark', props.mark.id);
    event.dataTransfer.setData('text/plain', props.mark.text);
}
function handleDelete() {
    if (window.confirm('Delete this mark and its note?')) {
        emit('delete', props.mark.id);
    }
}
onBeforeUnmount(() => {
    if (timer) {
        window.clearTimeout(timer);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onDragstart: (__VLS_ctx.handleDragStart) },
    ...{ onDragend: (...[$event]) => {
            __VLS_ctx.dragging = false;
        } },
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('focus', __VLS_ctx.mark.id);
        } },
    ...{ class: "reading-mark-card" },
    ...{ class: ({ active: __VLS_ctx.focused, dragging: __VLS_ctx.dragging }) },
    'data-mark-id': (__VLS_ctx.mark.id),
    draggable: "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reading-mark-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('jump', __VLS_ctx.mark);
        } },
    ...{ class: "reading-mark-jump" },
    type: "button",
});
(__VLS_ctx.mark.paragraphIndex);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "reading-mark-kind" },
});
(__VLS_ctx.mark.kind);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
    ...{ class: "reading-mark-spacer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('cite', __VLS_ctx.mark);
        } },
    ...{ class: "reading-mark-icon" },
    type: "button",
    title: "Quote in chat",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleDelete) },
    ...{ class: "reading-mark-icon" },
    type: "button",
    title: "Delete mark",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.blockquote, __VLS_intrinsicElements.blockquote)({
    ...{ class: "reading-mark-quote" },
});
(__VLS_ctx.mark.text);
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
    ...{ onClick: () => { } },
    ...{ onInput: (__VLS_ctx.scheduleSave) },
    ...{ onBlur: (__VLS_ctx.flushSave) },
    value: (__VLS_ctx.draft),
    ...{ class: "reading-mark-note" },
    rows: "2",
    placeholder: "Sticky note…",
    spellcheck: "false",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reading-mark-foot" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.savedLabel);
/** @type {__VLS_StyleScopedClasses['reading-mark-card']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mark-head']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mark-jump']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mark-kind']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mark-spacer']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mark-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mark-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mark-quote']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mark-note']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mark-foot']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            draft: draft,
            dragging: dragging,
            savedLabel: savedLabel,
            scheduleSave: scheduleSave,
            flushSave: flushSave,
            handleDragStart: handleDragStart,
            handleDelete: handleDelete,
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
