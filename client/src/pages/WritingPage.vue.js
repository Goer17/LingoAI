import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useVocabularyStore } from '@/stores/vocabulary';
const store = useVocabularyStore();
const router = useRouter();
const error = ref('');
const message = ref('');
const topicInput = ref('');
const topicRenameInput = ref('');
const creatingTopic = ref(false);
const updatingTopicTitle = ref(false);
const creatingPoint = ref(false);
const savingPoint = ref(false);
const startingTask = ref(false);
const chatLoading = ref(false);
const isRenamingTopic = ref(false);
const isAddingPoint = ref(false);
const isEditingPoint = ref(false);
const newPointTitle = ref('');
const newPointContent = ref('');
const pointEditTitle = ref('');
const pointEditContent = ref('');
const chatDraft = ref('');
const chatHistoryRef = ref(null);
const selectedTopic = computed(() => store.selectedWritingTopic);
const selectedPoint = computed(() => store.selectedWritingPoint);
onMounted(async () => {
    try {
        await store.fetchWritingTopics();
        syncTopicEditState();
        syncPointEditState();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load writing topics.';
    }
});
watch(() => selectedTopic.value?.id, () => {
    syncTopicEditState();
    syncPointEditState();
});
watch(() => selectedPoint.value?.id, () => {
    syncPointEditState();
});
watch(() => {
    const history = selectedPoint.value?.chatHistory ?? [];
    const last = history[history.length - 1];
    return `${history.length}:${last?.id ?? ''}:${last?.content.length ?? 0}`;
}, async () => {
    await nextTick();
    if (!chatHistoryRef.value) {
        return;
    }
    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
});
function syncTopicEditState() {
    topicRenameInput.value = selectedTopic.value?.title ?? '';
    isRenamingTopic.value = false;
    isAddingPoint.value = false;
    newPointTitle.value = '';
    newPointContent.value = '';
}
function syncPointEditState() {
    pointEditTitle.value = selectedPoint.value?.title ?? '';
    pointEditContent.value = selectedPoint.value?.content ?? '';
    isEditingPoint.value = false;
}
function handleStartTopicRename() {
    if (!selectedTopic.value) {
        return;
    }
    topicRenameInput.value = selectedTopic.value.title;
    isRenamingTopic.value = true;
}
function handleCancelTopicRename() {
    topicRenameInput.value = selectedTopic.value?.title ?? '';
    isRenamingTopic.value = false;
}
function handleStartAddPoint() {
    if (!selectedTopic.value) {
        return;
    }
    newPointTitle.value = '';
    newPointContent.value = '';
    isAddingPoint.value = true;
}
function handleCancelAddPoint() {
    newPointTitle.value = '';
    newPointContent.value = '';
    isAddingPoint.value = false;
}
function handleStartPointEdit() {
    if (!selectedPoint.value) {
        return;
    }
    syncPointEditState();
    isEditingPoint.value = true;
}
function handleCancelPointEdit() {
    syncPointEditState();
}
async function handleAddTopic() {
    const title = topicInput.value.trim();
    if (!title) {
        return;
    }
    error.value = '';
    message.value = '';
    creatingTopic.value = true;
    try {
        const result = await store.addWritingTopic(title);
        message.value = result.created ? 'Topic added.' : 'Topic already exists.';
        topicInput.value = '';
        syncTopicEditState();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to add topic.';
    }
    finally {
        creatingTopic.value = false;
    }
}
async function handleRenameTopic() {
    const topic = selectedTopic.value;
    if (!topic) {
        return;
    }
    error.value = '';
    message.value = '';
    updatingTopicTitle.value = true;
    try {
        await store.updateWritingTopicTitle(topic.id, topicRenameInput.value.trim());
        message.value = 'Topic updated.';
        isRenamingTopic.value = false;
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to update topic.';
    }
    finally {
        updatingTopicTitle.value = false;
    }
}
async function handleDeleteTopic() {
    const topic = selectedTopic.value;
    if (!topic) {
        return;
    }
    error.value = '';
    message.value = '';
    try {
        await store.deleteWritingTopic(topic.id);
        message.value = 'Topic deleted.';
        syncTopicEditState();
        syncPointEditState();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete topic.';
    }
}
async function handleAddPoint() {
    const topic = selectedTopic.value;
    if (!topic) {
        return;
    }
    error.value = '';
    message.value = '';
    creatingPoint.value = true;
    try {
        await store.addWritingKnowledgePoint(topic.id, {
            title: newPointTitle.value.trim(),
            content: newPointContent.value,
        });
        message.value = 'Knowledge point added.';
        newPointTitle.value = '';
        newPointContent.value = '';
        isAddingPoint.value = false;
        syncPointEditState();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to add knowledge point.';
    }
    finally {
        creatingPoint.value = false;
    }
}
async function handleSavePoint() {
    const topic = selectedTopic.value;
    const point = selectedPoint.value;
    if (!topic || !point) {
        return;
    }
    error.value = '';
    message.value = '';
    savingPoint.value = true;
    try {
        await store.updateWritingKnowledgePoint(topic.id, point.id, {
            title: pointEditTitle.value.trim(),
            content: pointEditContent.value,
        });
        message.value = 'Knowledge point saved.';
        syncPointEditState();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to save knowledge point.';
    }
    finally {
        savingPoint.value = false;
    }
}
async function handleDeletePoint() {
    const topic = selectedTopic.value;
    const point = selectedPoint.value;
    if (!topic || !point) {
        return;
    }
    error.value = '';
    message.value = '';
    try {
        await store.deleteWritingKnowledgePoint(topic.id, point.id);
        message.value = 'Knowledge point deleted.';
        syncPointEditState();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete knowledge point.';
    }
}
async function handleSendChat() {
    const topic = selectedTopic.value;
    const point = selectedPoint.value;
    const draft = chatDraft.value.trim();
    if (!topic || !point || !draft) {
        return;
    }
    error.value = '';
    chatLoading.value = true;
    try {
        await store.sendWritingKnowledgePointChatMessage(topic.id, point.id, draft);
        chatDraft.value = '';
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Chat failed.';
    }
    finally {
        chatLoading.value = false;
    }
}
async function handleClearChat() {
    const topic = selectedTopic.value;
    const point = selectedPoint.value;
    if (!topic || !point) {
        return;
    }
    error.value = '';
    try {
        await store.clearWritingKnowledgePointChat(topic.id, point.id);
        message.value = 'Tutor chat cleared.';
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to clear chat.';
    }
}
async function startLearning() {
    const topic = selectedTopic.value;
    if (!topic) {
        return;
    }
    error.value = '';
    startingTask.value = true;
    try {
        await store.createExpressionTask(topic.id);
        await router.push('/tasks');
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to create expression task.';
    }
    finally {
        startingTask.value = false;
    }
}
function renderMarkdown(content) {
    const normalized = escapeHtml(content).replace(/\r\n/g, '\n');
    const codeBlocks = [];
    const withCodeTokens = normalized.replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_match, lang, block) => {
        const token = `@@CODEBLOCK_${codeBlocks.length}@@`;
        const langAttr = lang ? ` data-lang="${lang}"` : '';
        codeBlocks.push(`<pre class="md-pre"${langAttr}><code>${block}</code></pre>`);
        return token;
    });
    const lines = withCodeTokens.split('\n');
    const parts = [];
    let listType = null;
    function closeListIfNeeded() {
        if (!listType) {
            return;
        }
        parts.push(`</${listType}>`);
        listType = null;
    }
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            closeListIfNeeded();
            continue;
        }
        if (/^@@CODEBLOCK_\d+@@$/.test(trimmed)) {
            closeListIfNeeded();
            parts.push(trimmed);
            continue;
        }
        const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            closeListIfNeeded();
            const level = heading[1].length;
            parts.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
            continue;
        }
        const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
        if (unordered) {
            if (listType !== 'ul') {
                closeListIfNeeded();
                listType = 'ul';
                parts.push('<ul>');
            }
            parts.push(`<li>${renderInlineMarkdown(unordered[1])}</li>`);
            continue;
        }
        const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
        if (ordered) {
            if (listType !== 'ol') {
                closeListIfNeeded();
                listType = 'ol';
                parts.push('<ol>');
            }
            parts.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
            continue;
        }
        const quote = trimmed.match(/^>\s?(.+)$/);
        if (quote) {
            closeListIfNeeded();
            parts.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
            continue;
        }
        closeListIfNeeded();
        parts.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    }
    closeListIfNeeded();
    return parts.join('').replace(/@@CODEBLOCK_(\d+)@@/g, (_match, index) => codeBlocks[Number(index)] ?? '');
}
function renderInlineMarkdown(text) {
    return text
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/~~([^~]+)~~/g, '<del>$1</del>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#39;');
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "writing-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card writing-topic-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "subtle-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.handleAddTopic) },
    ...{ class: "writing-topic-form" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.topicInput),
    type: "text",
    placeholder: "Create a new topic (e.g., Environmental Protection)",
    disabled: (__VLS_ctx.creatingTopic),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "button button-primary" },
    type: "submit",
    disabled: (__VLS_ctx.creatingTopic || !__VLS_ctx.topicInput.trim()),
});
(__VLS_ctx.creatingTopic ? 'Adding...' : 'Add Topic');
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card writing-workspace-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "workspace-grid writing-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card list-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inline-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "muted-text" },
});
(__VLS_ctx.store.writingTopics.length);
if (__VLS_ctx.store.writingTopics.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-scroller" },
    });
    for (const [topic] of __VLS_getVForSourceType((__VLS_ctx.store.writingTopics))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.store.writingTopics.length === 0))
                        return;
                    __VLS_ctx.store.selectWritingTopic(topic.id);
                } },
            key: (topic.id),
            ...{ class: "word-row writing-topic-row" },
            ...{ class: ({ active: __VLS_ctx.store.selectedWritingTopicId === topic.id }) },
            type: "button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "task-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "writing-topic-title" },
        });
        (topic.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted-text" },
        });
        (topic.knowledgePoints.length);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card detail-card" },
});
if (__VLS_ctx.selectedTopic) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-content writing-detail-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.selectedTopic.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtle-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-actions" },
    });
    if (__VLS_ctx.isRenamingTopic) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleCancelTopicRename) },
            ...{ class: "button button-secondary" },
            type: "button",
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleStartTopicRename) },
            ...{ class: "button button-secondary" },
            type: "button",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleDeleteTopic) },
        ...{ class: "button button-secondary" },
        type: "button",
        disabled: (__VLS_ctx.startingTask),
    });
    if (__VLS_ctx.isRenamingTopic) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.handleRenameTopic) },
            ...{ class: "writing-topic-form" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.topicRenameInput),
            type: "text",
            placeholder: "Rename current topic",
            disabled: (__VLS_ctx.updatingTopicTitle),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "button button-primary" },
            type: "submit",
            disabled: (__VLS_ctx.updatingTopicTitle || !__VLS_ctx.topicRenameInput.trim() || __VLS_ctx.topicRenameInput.trim() === __VLS_ctx.selectedTopic.title),
        });
        (__VLS_ctx.updatingTopicTitle ? 'Saving...' : 'Save');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "writing-points-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "card writing-points-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inline-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "muted-text" },
    });
    (__VLS_ctx.selectedTopic.knowledgePoints.length);
    if (__VLS_ctx.isAddingPoint) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleCancelAddPoint) },
            ...{ class: "button button-secondary" },
            type: "button",
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleStartAddPoint) },
            ...{ class: "button button-secondary" },
            type: "button",
        });
    }
    if (__VLS_ctx.isAddingPoint) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.handleAddPoint) },
            ...{ class: "chat-form" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.newPointTitle),
            type: "text",
            placeholder: "Point title (e.g., cause-effect paragraph pattern)",
            disabled: (__VLS_ctx.creatingPoint),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.newPointContent),
            rows: "4",
            placeholder: "Point content in Markdown...",
            disabled: (__VLS_ctx.creatingPoint),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "button button-primary" },
            type: "submit",
            disabled: (__VLS_ctx.creatingPoint || !__VLS_ctx.newPointTitle.trim()),
        });
        (__VLS_ctx.creatingPoint ? 'Adding...' : 'Add Point');
    }
    if (__VLS_ctx.selectedTopic.knowledgePoints.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "empty-copy" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "list-scroller" },
        });
        for (const [point] of __VLS_getVForSourceType((__VLS_ctx.selectedTopic.knowledgePoints))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.selectedTopic))
                            return;
                        if (!!(__VLS_ctx.selectedTopic.knowledgePoints.length === 0))
                            return;
                        __VLS_ctx.store.selectWritingPoint(point.id);
                    } },
                key: (point.id),
                ...{ class: "word-row writing-point-row" },
                ...{ class: ({ active: __VLS_ctx.store.selectedWritingPointId === point.id }) },
                type: "button",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "task-main" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "writing-point-title" },
            });
            (point.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted-text writing-point-preview" },
            });
            (point.content || 'No content yet.');
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "card writing-point-detail-card" },
    });
    if (__VLS_ctx.selectedPoint) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "inline-heading" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "eyebrow" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.isEditingPoint ? 'Edit Point' : __VLS_ctx.selectedPoint.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "result-actions" },
        });
        if (__VLS_ctx.isEditingPoint) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.handleCancelPointEdit) },
                ...{ class: "button button-secondary" },
                type: "button",
            });
        }
        if (__VLS_ctx.isEditingPoint) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.handleSavePoint) },
                ...{ class: "button button-primary" },
                type: "button",
                disabled: (__VLS_ctx.savingPoint || !__VLS_ctx.pointEditTitle.trim()),
            });
            (__VLS_ctx.savingPoint ? 'Saving...' : 'Save');
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.handleStartPointEdit) },
                ...{ class: "button button-secondary" },
                type: "button",
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleDeletePoint) },
            ...{ class: "button button-secondary" },
            type: "button",
        });
        if (__VLS_ctx.isEditingPoint) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chat-form" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                value: (__VLS_ctx.pointEditTitle),
                type: "text",
                placeholder: "Point title",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
                value: (__VLS_ctx.pointEditContent),
                rows: "8",
                placeholder: "Write Markdown content here...",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "writing-markdown-preview" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "eyebrow" },
            });
            if (__VLS_ctx.selectedPoint.content.trim()) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                    ...{ class: "chat-content markdown-content" },
                });
                __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderMarkdown(__VLS_ctx.selectedPoint.content)) }, null, null);
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "empty-copy" },
                });
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chat-shell" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-heading inline-heading" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "eyebrow" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleClearChat) },
            ...{ class: "button button-secondary" },
            type: "button",
            disabled: (__VLS_ctx.chatLoading || __VLS_ctx.selectedPoint.chatHistory.length === 0),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ref: "chatHistoryRef",
            ...{ class: "chat-history" },
        });
        /** @type {typeof __VLS_ctx.chatHistoryRef} */ ;
        for (const [chat] of __VLS_getVForSourceType((__VLS_ctx.selectedPoint.chatHistory))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (chat.id),
                ...{ class: "chat-bubble" },
                ...{ class: (chat.role) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "chat-role" },
            });
            (chat.role);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ...{ class: "chat-content markdown-content" },
            });
            __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderMarkdown(chat.content)) }, null, null);
        }
        if (__VLS_ctx.selectedPoint.chatHistory.length === 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "empty-copy" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.handleSendChat) },
            ...{ class: "chat-form" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
            ...{ onKeydown: (__VLS_ctx.handleSendChat) },
            value: (__VLS_ctx.chatDraft),
            rows: "3",
            placeholder: "Ask about grammar, topic ideas, organization, or better expressions...",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "button button-primary" },
            type: "submit",
            disabled: (__VLS_ctx.chatLoading || !__VLS_ctx.chatDraft.trim()),
        });
        (__VLS_ctx.chatLoading ? 'Sending...' : 'Send');
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "placeholder-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "eyebrow" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "subtle-copy" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "learning-bar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtle-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.startLearning) },
        ...{ class: "button button-primary" },
        type: "button",
        disabled: (__VLS_ctx.startingTask || __VLS_ctx.selectedTopic.knowledgePoints.length === 0),
    });
    (__VLS_ctx.startingTask ? 'Preparing...' : 'Learning');
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "placeholder-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtle-copy" },
    });
}
/** @type {__VLS_StyleScopedClasses['writing-page']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-topic-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-topic-form']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['success-text']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['list-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['list-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['word-row']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-topic-row']} */ ;
/** @type {__VLS_StyleScopedClasses['task-main']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-topic-title']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-content']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-detail-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['result-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-topic-form']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-points-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-points-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['result-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-form']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['list-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['word-row']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-point-row']} */ ;
/** @type {__VLS_StyleScopedClasses['task-main']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-point-title']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-point-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-point-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-content']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['result-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-form']} */ ;
/** @type {__VLS_StyleScopedClasses['writing-markdown-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-content']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-content']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-history']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-role']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-content']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-content']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-form']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['learning-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            store: store,
            error: error,
            message: message,
            topicInput: topicInput,
            topicRenameInput: topicRenameInput,
            creatingTopic: creatingTopic,
            updatingTopicTitle: updatingTopicTitle,
            creatingPoint: creatingPoint,
            savingPoint: savingPoint,
            startingTask: startingTask,
            chatLoading: chatLoading,
            isRenamingTopic: isRenamingTopic,
            isAddingPoint: isAddingPoint,
            isEditingPoint: isEditingPoint,
            newPointTitle: newPointTitle,
            newPointContent: newPointContent,
            pointEditTitle: pointEditTitle,
            pointEditContent: pointEditContent,
            chatDraft: chatDraft,
            chatHistoryRef: chatHistoryRef,
            selectedTopic: selectedTopic,
            selectedPoint: selectedPoint,
            handleStartTopicRename: handleStartTopicRename,
            handleCancelTopicRename: handleCancelTopicRename,
            handleStartAddPoint: handleStartAddPoint,
            handleCancelAddPoint: handleCancelAddPoint,
            handleStartPointEdit: handleStartPointEdit,
            handleCancelPointEdit: handleCancelPointEdit,
            handleAddTopic: handleAddTopic,
            handleRenameTopic: handleRenameTopic,
            handleDeleteTopic: handleDeleteTopic,
            handleAddPoint: handleAddPoint,
            handleSavePoint: handleSavePoint,
            handleDeletePoint: handleDeletePoint,
            handleSendChat: handleSendChat,
            handleClearChat: handleClearChat,
            startLearning: startLearning,
            renderMarkdown: renderMarkdown,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
