import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useConfirmStore } from '@/stores/confirm';
import { useWritingStore } from '@/stores/writing';
import { renderMarkdown } from '@/utils/markdown';
const store = useWritingStore();
const confirm = useConfirmStore();
const SAVE_DELAY_MS = 700;
const newTitle = ref('');
const adding = ref(false);
const error = ref('');
const draft = ref('');
const savedNote = ref('');
const saving = ref(false);
const savedAt = ref(0);
const renaming = ref(false);
const titleDraft = ref('');
const titleInputRef = ref(null);
let saveTimer = null;
const selected = computed(() => store.selected);
const statusLabel = computed(() => {
    if (saving.value) {
        return 'Saving…';
    }
    if (draft.value !== savedNote.value) {
        return 'Unsaved changes';
    }
    return savedAt.value ? 'Saved' : '';
});
function previewOf(note) {
    const text = note.replace(/[#>*_`]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) {
        return 'Empty note';
    }
    return text.length > 60 ? `${text.slice(0, 59)}…` : text;
}
function loadSelected() {
    draft.value = selected.value?.note ?? '';
    savedNote.value = draft.value;
    savedAt.value = 0;
    renaming.value = false;
}
async function persist() {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    const topic = selected.value;
    if (!topic || draft.value === savedNote.value) {
        return;
    }
    const snapshot = draft.value;
    saving.value = true;
    try {
        await store.saveNote(topic.id, snapshot);
        if (draft.value === snapshot) {
            savedNote.value = snapshot;
        }
        savedAt.value = Date.now();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to save the note.';
    }
    finally {
        saving.value = false;
    }
}
// Debounced autosave while typing.
watch(draft, () => {
    if (saveTimer) {
        clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
        void persist();
    }, SAVE_DELAY_MS);
});
// Switching titles saves the previous note first, then loads the new one.
watch(() => selected.value?.id, async (_next, previous) => {
    if (previous) {
        await persist();
    }
    error.value = '';
    loadSelected();
});
async function handleAdd() {
    const title = newTitle.value.trim();
    if (!title || adding.value) {
        return;
    }
    error.value = '';
    adding.value = true;
    try {
        const result = await store.addTitle(title);
        newTitle.value = '';
        if (!result.created) {
            error.value = `"${result.topic.title}" already exists.`;
        }
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to add the title.';
    }
    finally {
        adding.value = false;
    }
}
async function startRename() {
    if (!selected.value) {
        return;
    }
    titleDraft.value = selected.value.title;
    renaming.value = true;
    await nextTick();
    titleInputRef.value?.focus();
    titleInputRef.value?.select();
}
function cancelRename() {
    renaming.value = false;
    titleDraft.value = '';
}
async function commitRename() {
    const topic = selected.value;
    const title = titleDraft.value.trim();
    renaming.value = false;
    if (!topic || !title || title === topic.title) {
        return;
    }
    error.value = '';
    try {
        await store.rename(topic.id, title);
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to rename the title.';
    }
}
async function handleDelete() {
    const topic = selected.value;
    if (!topic) {
        return;
    }
    const confirmed = await confirm.ask({
        title: `Delete "${topic.title}"?`,
        message: 'The note and its Markdown will be removed. This cannot be undone.',
        confirmLabel: 'Delete',
        tone: 'danger',
    });
    if (!confirmed) {
        return;
    }
    error.value = '';
    try {
        await store.remove(topic.id);
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete the title.';
    }
}
onMounted(async () => {
    try {
        await store.fetchTopics();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load notes.';
    }
    loadSelected();
});
onBeforeUnmount(() => {
    void persist();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "expression-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "expression-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "expression-tabs" },
    role: "tablist",
    'aria-label': "Note type",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.store.setKind('grammar');
        } },
    ...{ class: "expression-tab" },
    ...{ class: ({ active: __VLS_ctx.store.kind === 'grammar' }) },
    type: "button",
    role: "tab",
    'aria-selected': (__VLS_ctx.store.kind === 'grammar'),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.store.setKind('topic');
        } },
    ...{ class: "expression-tab" },
    ...{ class: ({ active: __VLS_ctx.store.kind === 'topic' }) },
    type: "button",
    role: "tab",
    'aria-selected': (__VLS_ctx.store.kind === 'topic'),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "expression-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "expression-list" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.handleAdd) },
    ...{ class: "expression-add" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.newTitle),
    type: "text",
    placeholder: (__VLS_ctx.store.kind === 'grammar' ? 'New grammar title' : 'New topic title'),
    disabled: (__VLS_ctx.adding),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "button button-primary button-tight" },
    type: "submit",
    disabled: (__VLS_ctx.adding || !__VLS_ctx.newTitle.trim()),
});
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error-text expression-error" },
    });
    (__VLS_ctx.error);
}
if (__VLS_ctx.store.loading && __VLS_ctx.store.items.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy" },
    });
}
else if (__VLS_ctx.store.items.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy" },
    });
    (__VLS_ctx.store.kind === 'grammar' ? 'No grammar notes yet.' : 'No topic notes yet.');
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "expression-titles" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.store.items))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            key: (item.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.store.loading && __VLS_ctx.store.items.length === 0))
                        return;
                    if (!!(__VLS_ctx.store.items.length === 0))
                        return;
                    __VLS_ctx.store.select(item.id);
                } },
            ...{ class: "expression-title" },
            ...{ class: ({ active: item.id === __VLS_ctx.store.selectedId }) },
            type: "button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "expression-title-text" },
        });
        (item.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "expression-title-preview" },
        });
        (__VLS_ctx.previewOf(item.note));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "expression-note" },
});
if (__VLS_ctx.selected) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "expression-note-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expression-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    (__VLS_ctx.store.kind === 'grammar' ? 'Grammar' : 'Topic');
    if (__VLS_ctx.renaming) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onKeydown: (__VLS_ctx.commitRename) },
            ...{ onKeydown: (__VLS_ctx.cancelRename) },
            ...{ onBlur: (__VLS_ctx.commitRename) },
            ref: "titleInputRef",
            value: (__VLS_ctx.titleDraft),
            ...{ class: "expression-title-input" },
            type: "text",
        });
        /** @type {typeof __VLS_ctx.titleInputRef} */ ;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.selected.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expression-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.startRename) },
        ...{ class: "button button-secondary button-tight" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleDelete) },
        ...{ class: "button button-secondary button-tight" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expression-split" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.draft),
        ...{ class: "expression-textarea" },
        spellcheck: "false",
        placeholder: "Write in Markdown — the preview updates as you type.",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expression-preview markdown-content" },
    });
    if (__VLS_ctx.draft.trim()) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({});
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderMarkdown(__VLS_ctx.draft)) }, null, null);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "empty-copy" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expression-foot" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "expression-status muted-text" },
    });
    (__VLS_ctx.statusLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "expression-practice" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "expression-practice-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "expression-practice-note" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expression-empty" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy" },
    });
}
/** @type {__VLS_StyleScopedClasses['expression-page']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-list']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-add']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['button-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-error']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-titles']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-title']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-title-text']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-title-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-note']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-note-head']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-title-input']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-split']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-content']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-status']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-practice']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-practice-label']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-practice-note']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            renderMarkdown: renderMarkdown,
            store: store,
            newTitle: newTitle,
            adding: adding,
            error: error,
            draft: draft,
            renaming: renaming,
            titleDraft: titleDraft,
            titleInputRef: titleInputRef,
            selected: selected,
            statusLabel: statusLabel,
            previewOf: previewOf,
            handleAdd: handleAdd,
            startRename: startRename,
            cancelRename: cancelRename,
            commitRename: commitRename,
            handleDelete: handleDelete,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
