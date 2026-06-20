import { onMounted, reactive, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { api } from '@/services/api';
const settings = useSettingsStore();
const message = ref('');
const error = ref('');
const testingId = ref(null);
const testResults = reactive({});
const LANGUAGE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h10"/><path d="M9 3v2"/><path d="M5 5c0 4 2.5 7 6 8"/><path d="M13 5c0 3-3 6-7 8"/><path d="M13 20l4-10 4 10"/><path d="M14.5 17h5"/></svg>`;
const AUDIO_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M9 21h6"/></svg>`;
const IMAGE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-8 9"/></svg>`;
const categoryGroups = [
    {
        key: 'language',
        title: 'Language Model',
        shortLabel: 'language',
        description: 'Powers search, tutoring chat, quiz generation, and writing scenarios.',
        modelPlaceholder: 'e.g. gpt-5.4',
        icon: LANGUAGE_ICON,
    },
    {
        key: 'audio',
        title: 'Audio Model',
        shortLabel: 'audio',
        description: 'Text-to-speech model used for pronunciation and listening drills.',
        modelPlaceholder: 'e.g. tts-1-hd',
        icon: AUDIO_ICON,
    },
    {
        key: 'image',
        title: 'Image Generation Model',
        shortLabel: 'image',
        description: 'Reserved for upcoming image-generation features. Configure now to keep settings ready.',
        modelPlaceholder: 'e.g. dall-e-3',
        icon: IMAGE_ICON,
    },
];
const expanded = reactive({
    language: false,
    audio: false,
    image: false,
});
const editing = ref(null);
const editingDraft = ref(null);
const editingGroup = ref(null);
onMounted(async () => {
    try {
        await settings.fetchSettings();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load settings.';
    }
});
function getCategory(key) {
    return settings.form.models[key];
}
function activeEntry(key) {
    const category = getCategory(key);
    return category.entries.find((entry) => entry.id === category.activeId) ?? null;
}
function toggleExpanded(key) {
    expanded[key] = !expanded[key];
}
function createEntryId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `mdl-${crypto.randomUUID()}`;
    }
    return `mdl-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
function addEntry(key) {
    const category = getCategory(key);
    const entry = {
        id: createEntryId(),
        baseUrl: '',
        apiKey: '',
        model: '',
    };
    category.entries.push(entry);
    if (!category.activeId) {
        category.activeId = entry.id;
    }
    expanded[key] = true;
    openEdit(key, entry.id);
    message.value = '';
}
function removeEntry(key, id) {
    const category = getCategory(key);
    const index = category.entries.findIndex((entry) => entry.id === id);
    if (index === -1) {
        return;
    }
    category.entries.splice(index, 1);
    if (category.activeId === id) {
        category.activeId = category.entries[0]?.id ?? null;
    }
}
function setActive(key, id) {
    getCategory(key).activeId = id;
}
function clearMaskedKey(entry) {
    if (entry.apiKey === '********') {
        entry.apiKey = '';
    }
}
function openEdit(key, id) {
    const entry = getCategory(key).entries.find((item) => item.id === id);
    if (!entry) {
        return;
    }
    editing.value = { key, id };
    editingDraft.value = { ...entry };
    editingGroup.value = categoryGroups.find((g) => g.key === key) ?? null;
}
function closeEdit() {
    editing.value = null;
    editingDraft.value = null;
    editingGroup.value = null;
}
function applyEdit() {
    if (!editing.value || !editingDraft.value) {
        return;
    }
    const { key, id } = editing.value;
    const entry = getCategory(key).entries.find((item) => item.id === id);
    if (!entry) {
        closeEdit();
        return;
    }
    entry.baseUrl = editingDraft.value.baseUrl;
    entry.apiKey = editingDraft.value.apiKey;
    entry.model = editingDraft.value.model;
    closeEdit();
}
async function save() {
    message.value = '';
    error.value = '';
    try {
        await settings.saveSettings();
        message.value = 'Settings saved.';
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to save settings.';
    }
}
function formatDate(value) {
    return new Date(value).toLocaleString();
}
async function runTest(key, id) {
    if (testingId.value) {
        return;
    }
    const entry = getCategory(key).entries.find((item) => item.id === id);
    if (!entry) {
        return;
    }
    if (!entry.baseUrl || !entry.model) {
        testResults[id] = { ok: false, latencyMs: 0, error: 'Fill in Base URL and Model first.' };
        return;
    }
    try {
        await settings.saveSettings();
    }
    catch (err) {
        testResults[id] = {
            ok: false,
            latencyMs: 0,
            error: err instanceof Error ? err.message : 'Save failed before test.',
        };
        return;
    }
    testingId.value = id;
    try {
        const result = await api.testModelEntry(key, id);
        testResults[id] = result;
    }
    catch (err) {
        testResults[id] = {
            ok: false,
            latencyMs: 0,
            error: err instanceof Error ? err.message : 'Test failed.',
        };
    }
    finally {
        testingId.value = null;
    }
}
function testStatusClass(id) {
    const result = testResults[id];
    if (!result) {
        return '';
    }
    return result.ok ? 'is-ok' : 'is-fail';
}
function testStatusLabel(id) {
    const result = testResults[id];
    if (!result) {
        return '';
    }
    if (result.ok) {
        return `OK · ${result.latencyMs} ms${result.sample ? ` · ${result.sample}` : ''}`;
    }
    return `Fail · ${result.error ?? 'unknown error'}`;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-page stack" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "settings-hero card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "subtle-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-meta" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "settings-meta-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "settings-meta-value" },
});
(__VLS_ctx.settings.form.updatedAt ? __VLS_ctx.formatDate(__VLS_ctx.settings.form.updatedAt) : 'Not saved yet');
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "success-text" },
    });
    (__VLS_ctx.message);
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error-text" },
    });
    (__VLS_ctx.error);
}
for (const [group] of __VLS_getVForSourceType((__VLS_ctx.categoryGroups))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (group.key),
        ...{ class: "card model-category" },
        ...{ class: ({ 'is-collapsed': !__VLS_ctx.expanded[group.key] }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleExpanded(group.key);
            } },
        type: "button",
        ...{ class: "model-category-head" },
        'aria-expanded': (__VLS_ctx.expanded[group.key]),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "model-category-icon" },
        'aria-hidden': "true",
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (group.icon) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "model-category-head-main" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (group.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtle-copy" },
    });
    if (__VLS_ctx.activeEntry(group.key)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.activeEntry(group.key)?.model || 'Untitled model');
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "model-category-divider" },
    });
    (__VLS_ctx.getCategory(group.key).entries.length);
    (__VLS_ctx.getCategory(group.key).entries.length === 1 ? 'entry' : 'entries');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "model-category-chevron" },
        'aria-hidden': "true",
    });
    (__VLS_ctx.expanded[group.key] ? '−' : '+');
    if (__VLS_ctx.expanded[group.key]) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "model-category-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "model-category-toolbar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted-text" },
        });
        (group.description);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.expanded[group.key]))
                        return;
                    __VLS_ctx.addEntry(group.key);
                } },
            ...{ class: "button button-secondary" },
            type: "button",
        });
        if (__VLS_ctx.getCategory(group.key).entries.length === 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "model-empty" },
            });
            (group.shortLabel);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: "model-entry-list" },
            });
            for (const [entry, index] of __VLS_getVForSourceType((__VLS_ctx.getCategory(group.key).entries))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (entry.id),
                    ...{ class: "model-entry" },
                    ...{ class: ({ 'model-entry-active': __VLS_ctx.getCategory(group.key).activeId === entry.id }) },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "model-radio" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    ...{ onChange: (...[$event]) => {
                            if (!(__VLS_ctx.expanded[group.key]))
                                return;
                            if (!!(__VLS_ctx.getCategory(group.key).entries.length === 0))
                                return;
                            __VLS_ctx.setActive(group.key, entry.id);
                        } },
                    type: "radio",
                    name: (`active-${group.key}`),
                    value: (entry.id),
                    checked: (__VLS_ctx.getCategory(group.key).activeId === entry.id),
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "model-radio-indicator" },
                    'aria-hidden': "true",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "model-radio-label" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "model-entry-title" },
                });
                (entry.model || `Untitled model #${index + 1}`);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "model-entry-sub" },
                });
                (entry.baseUrl || 'No Base URL');
                if (__VLS_ctx.testResults[entry.id]) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "model-entry-test" },
                        ...{ class: (__VLS_ctx.testStatusClass(entry.id)) },
                    });
                    (__VLS_ctx.testStatusLabel(entry.id));
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "model-entry-status" },
                });
                (__VLS_ctx.getCategory(group.key).activeId === entry.id ? 'Active' : 'Inactive');
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "model-entry-actions" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.expanded[group.key]))
                                return;
                            if (!!(__VLS_ctx.getCategory(group.key).entries.length === 0))
                                return;
                            __VLS_ctx.runTest(group.key, entry.id);
                        } },
                    ...{ class: "button button-secondary button-tight" },
                    type: "button",
                    disabled: (__VLS_ctx.testingId === entry.id),
                });
                (__VLS_ctx.testingId === entry.id ? 'Testing...' : 'Test');
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.expanded[group.key]))
                                return;
                            if (!!(__VLS_ctx.getCategory(group.key).entries.length === 0))
                                return;
                            __VLS_ctx.openEdit(group.key, entry.id);
                        } },
                    ...{ class: "button button-secondary button-tight" },
                    type: "button",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.expanded[group.key]))
                                return;
                            if (!!(__VLS_ctx.getCategory(group.key).entries.length === 0))
                                return;
                            __VLS_ctx.removeEntry(group.key, entry.id);
                        } },
                    ...{ class: "icon-button danger" },
                    type: "button",
                    title: (`Remove ${group.shortLabel} model`),
                });
            }
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "settings-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "subtle-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.save) },
    ...{ class: "button button-primary" },
    type: "button",
    disabled: (__VLS_ctx.settings.saving),
});
(__VLS_ctx.settings.saving ? 'Saving...' : 'Save Settings');
if (__VLS_ctx.editing && __VLS_ctx.editingDraft) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeEdit) },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-panel card" },
        role: "dialog",
        'aria-modal': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "modal-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "modal-head-icon" },
        'aria-hidden': "true",
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.editingGroup?.icon ?? '') }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-head-text" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.editingGroup?.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtle-copy" },
    });
    (__VLS_ctx.editingGroup?.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "url",
        placeholder: "https://api.example.com/v1",
    });
    (__VLS_ctx.editingDraft.baseUrl);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onFocus: (...[$event]) => {
                if (!(__VLS_ctx.editing && __VLS_ctx.editingDraft))
                    return;
                __VLS_ctx.clearMaskedKey(__VLS_ctx.editingDraft);
            } },
        type: "password",
        autocomplete: "off",
        placeholder: "sk-...",
    });
    (__VLS_ctx.editingDraft.apiKey);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.editingDraft.model),
        type: "text",
        placeholder: (__VLS_ctx.editingGroup?.modelPlaceholder),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
        ...{ class: "modal-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeEdit) },
        ...{ class: "button button-secondary" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.applyEdit) },
        ...{ class: "button button-primary" },
        type: "button",
    });
}
/** @type {__VLS_StyleScopedClasses['settings-page']} */ ;
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-meta-label']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-meta-value']} */ ;
/** @type {__VLS_StyleScopedClasses['success-text']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['model-category']} */ ;
/** @type {__VLS_StyleScopedClasses['model-category-head']} */ ;
/** @type {__VLS_StyleScopedClasses['model-category-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['model-category-head-main']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['model-category-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['model-category-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['model-category-body']} */ ;
/** @type {__VLS_StyleScopedClasses['model-category-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['model-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['model-entry-list']} */ ;
/** @type {__VLS_StyleScopedClasses['model-entry']} */ ;
/** @type {__VLS_StyleScopedClasses['model-radio']} */ ;
/** @type {__VLS_StyleScopedClasses['model-radio-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['model-radio-label']} */ ;
/** @type {__VLS_StyleScopedClasses['model-entry-title']} */ ;
/** @type {__VLS_StyleScopedClasses['model-entry-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['model-entry-test']} */ ;
/** @type {__VLS_StyleScopedClasses['model-entry-status']} */ ;
/** @type {__VLS_StyleScopedClasses['model-entry-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head-text']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            settings: settings,
            message: message,
            error: error,
            testingId: testingId,
            testResults: testResults,
            categoryGroups: categoryGroups,
            expanded: expanded,
            editing: editing,
            editingDraft: editingDraft,
            editingGroup: editingGroup,
            getCategory: getCategory,
            activeEntry: activeEntry,
            toggleExpanded: toggleExpanded,
            addEntry: addEntry,
            removeEntry: removeEntry,
            setActive: setActive,
            clearMaskedKey: clearMaskedKey,
            openEdit: openEdit,
            closeEdit: closeEdit,
            applyEdit: applyEdit,
            save: save,
            formatDate: formatDate,
            runTest: runTest,
            testStatusClass: testStatusClass,
            testStatusLabel: testStatusLabel,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
