import { nextTick, ref, watch } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
const props = defineProps();
const emit = defineEmits();
const inputRef = ref(null);
const editingIndex = ref(null);
const buffer = ref('');
const localBlocks = ref(splitBlocks(props.value));
/** Split on blank lines, but never inside a fenced code block. */
function splitBlocks(markdown) {
    const lines = markdown.split('\n');
    const result = [];
    let current = [];
    let inFence = false;
    for (const line of lines) {
        if (/^\s*(```|~~~)/.test(line)) {
            inFence = !inFence;
        }
        if (!inFence && line.trim() === '') {
            if (current.length) {
                result.push(current.join('\n'));
                current = [];
            }
            continue;
        }
        current.push(line);
    }
    if (current.length) {
        result.push(current.join('\n'));
    }
    return result.length ? result : [''];
}
function renderBlock(block) {
    return block.trim() ? renderMarkdown(block) : '';
}
function resize(el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
}
function emitBlocks() {
    emit('update:value', localBlocks.value.join('\n\n'));
}
// External changes (switching titles, reload) replace the block list.
watch(() => props.value, (value) => {
    if (editingIndex.value !== null) {
        return;
    }
    if (value !== localBlocks.value.join('\n\n')) {
        localBlocks.value = splitBlocks(value);
    }
});
async function startEditing(index) {
    editingIndex.value = index;
    buffer.value = localBlocks.value[index] ?? '';
    await nextTick();
    const el = Array.isArray(inputRef.value) ? inputRef.value[0] : inputRef.value;
    if (!el) {
        return;
    }
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    resize(el);
}
/**
 * Leaving a block clears the editing state. The index guard matters for Enter:
 * moving to the next block unmounts the textarea, and the blur that follows must
 * not cancel the block that is now being edited.
 */
function stopEditing(index) {
    if (index !== undefined && editingIndex.value !== index) {
        return;
    }
    editingIndex.value = null;
    buffer.value = '';
}
function handleInput(event) {
    const el = event.target;
    buffer.value = el.value;
    resize(el);
    const index = editingIndex.value;
    if (index === null) {
        return;
    }
    localBlocks.value[index] = el.value;
    emitBlocks();
}
/** Enter leaves the block instead of adding a line (Shift+Enter for a line). */
async function handleEnter() {
    const index = editingIndex.value;
    if (index === null) {
        return;
    }
    const nextIndex = index + 1;
    if (nextIndex >= localBlocks.value.length) {
        localBlocks.value.push('');
        emitBlocks();
    }
    // Drop the current editor first so its blur cannot overwrite the move.
    editingIndex.value = null;
    buffer.value = '';
    await nextTick();
    await startEditing(nextIndex);
}
async function appendBlock() {
    localBlocks.value.push('');
    emitBlocks();
    await nextTick();
    await startEditing(localBlocks.value.length - 1);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "note-editor" },
});
for (const [block, index] of __VLS_getVForSourceType((__VLS_ctx.localBlocks))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (`${index}-${__VLS_ctx.editingIndex === index ? 'edit' : 'view'}`),
        ...{ class: "note-block" },
    });
    if (__VLS_ctx.editingIndex === index) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
            ...{ onInput: (__VLS_ctx.handleInput) },
            ...{ onKeydown: (__VLS_ctx.handleEnter) },
            ...{ onKeydown: (...[$event]) => {
                    if (!(__VLS_ctx.editingIndex === index))
                        return;
                    __VLS_ctx.stopEditing(index);
                } },
            ...{ onBlur: (...[$event]) => {
                    if (!(__VLS_ctx.editingIndex === index))
                        return;
                    __VLS_ctx.stopEditing(index);
                } },
            ref: "inputRef",
            value: (__VLS_ctx.buffer),
            ...{ class: "note-block-input" },
            spellcheck: "false",
        });
        /** @type {typeof __VLS_ctx.inputRef} */ ;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.editingIndex === index))
                        return;
                    __VLS_ctx.startEditing(index);
                } },
            ...{ class: "note-block-view markdown-content" },
            ...{ class: ({ 'note-block-empty': !block.trim() }) },
            'data-placeholder': (index === 0 ? 'Start writing in Markdown…' : 'Empty block'),
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderBlock(block)) }, null, null);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.appendBlock) },
    ...{ class: "note-append" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['note-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['note-block']} */ ;
/** @type {__VLS_StyleScopedClasses['note-block-input']} */ ;
/** @type {__VLS_StyleScopedClasses['note-block-view']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-content']} */ ;
/** @type {__VLS_StyleScopedClasses['note-append']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            inputRef: inputRef,
            editingIndex: editingIndex,
            buffer: buffer,
            localBlocks: localBlocks,
            renderBlock: renderBlock,
            startEditing: startEditing,
            stopEditing: stopEditing,
            handleInput: handleInput,
            handleEnter: handleEnter,
            appendBlock: appendBlock,
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
