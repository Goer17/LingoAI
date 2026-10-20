import { computed, nextTick, onMounted, ref } from 'vue';
import { Brain, Plus, Wrench } from 'lucide-vue-next';
import { api } from '@/services/api';
import { renderMarkdown } from '@/utils/markdown';
const suggestions = [
    'Quiz me on my weakest words',
    'Review my vocabulary notebook and tell me what to focus on',
    'Add a sentence about airports to my Travel listening group',
    'What mistakes keep coming up in my quizzes?',
];
const sessions = ref([]);
const activeId = ref(null);
const messages = ref([]);
const memories = ref([]);
const draft = ref('');
const memoryDraft = ref('');
const sending = ref(false);
const loadingSessions = ref(true);
const savingMemory = ref(false);
const showMemory = ref(false);
const error = ref('');
const streamingId = ref(null);
const scrollRef = ref(null);
const activeSession = computed(() => sessions.value.find((session) => session.id === activeId.value) ?? null);
const showThinking = computed(() => {
    if (!sending.value) {
        return false;
    }
    const last = messages.value[messages.value.length - 1];
    return Boolean(last && last.role === 'assistant' && !last.content && !(last.toolCalls?.length));
});
function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
async function scrollToBottom() {
    await nextTick();
    const element = scrollRef.value;
    if (element) {
        element.scrollTop = element.scrollHeight;
    }
}
async function loadSessions() {
    loadingSessions.value = true;
    try {
        sessions.value = await api.listTutorSessions();
        if (sessions.value.length > 0) {
            await selectSession(sessions.value[0].id);
        }
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load tutor sessions.';
    }
    finally {
        loadingSessions.value = false;
    }
}
async function loadMemories() {
    try {
        memories.value = await api.listTutorMemories();
    }
    catch {
        // The memory panel is auxiliary; a failed load should not break chat.
    }
}
async function selectSession(id) {
    if (sending.value || id === activeId.value) {
        return;
    }
    activeId.value = id;
    messages.value = [];
    error.value = '';
    try {
        const detail = await api.getTutorSession(id);
        messages.value = detail.messages;
        await scrollToBottom();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load the session.';
    }
}
async function startNewChat() {
    if (sending.value) {
        return;
    }
    activeId.value = null;
    messages.value = [];
    draft.value = '';
    error.value = '';
}
async function deleteSession(id) {
    if (sending.value) {
        return;
    }
    if (!window.confirm('Delete this tutor conversation?')) {
        return;
    }
    try {
        await api.deleteTutorSession(id);
        sessions.value = sessions.value.filter((session) => session.id !== id);
        if (activeId.value === id) {
            startNewChat();
        }
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete the session.';
    }
}
async function addMemory() {
    const content = memoryDraft.value.trim();
    if (!content || savingMemory.value) {
        return;
    }
    savingMemory.value = true;
    try {
        const memory = await api.addTutorMemory(content, 'note');
        memories.value = [...memories.value, memory];
        memoryDraft.value = '';
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to save the memory.';
    }
    finally {
        savingMemory.value = false;
    }
}
async function deleteMemory(id) {
    try {
        await api.deleteTutorMemory(id);
        memories.value = memories.value.filter((memory) => memory.id !== id);
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete the memory.';
    }
}
function applyToolEvent(message, event) {
    if (!message.toolCalls) {
        message.toolCalls = [];
    }
    if (event.status === 'start') {
        message.toolCalls.push({
            name: event.name,
            label: event.label,
            ok: true,
            pending: true,
        });
        return;
    }
    for (let index = message.toolCalls.length - 1; index >= 0; index -= 1) {
        const trace = message.toolCalls[index];
        if (trace.name === event.name && trace.pending) {
            trace.ok = event.ok ?? true;
            trace.summary = event.summary;
            trace.pending = false;
            return;
        }
    }
    message.toolCalls.push({
        name: event.name,
        label: event.label,
        ok: event.ok ?? true,
        summary: event.summary,
        pending: false,
    });
}
async function handleSend() {
    const text = draft.value.trim();
    if (!text || sending.value) {
        return;
    }
    error.value = '';
    draft.value = '';
    sending.value = true;
    const now = new Date().toISOString();
    const userMessage = {
        id: `local-user-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: now,
    };
    const assistantMessage = {
        id: `local-assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        createdAt: now,
        toolCalls: [],
    };
    messages.value.push(userMessage, assistantMessage);
    streamingId.value = assistantMessage.id;
    await scrollToBottom();
    try {
        let sessionId = activeId.value;
        if (!sessionId) {
            const created = await api.createTutorSession();
            sessions.value = [created, ...sessions.value];
            activeId.value = created.id;
            sessionId = created.id;
        }
        const result = await api.streamTutorChat(sessionId, text, {
            onDelta: (chunk) => {
                assistantMessage.content += chunk;
                void scrollToBottom();
            },
            onTool: (event) => {
                applyToolEvent(assistantMessage, event);
                void scrollToBottom();
            },
        });
        messages.value = messages.value.map((message) => (message.id === assistantMessage.id
            ? { ...result.message, toolCalls: result.message.toolCalls ?? [] }
            : message));
        sessions.value = [
            result.session,
            ...sessions.value.filter((session) => session.id !== result.session.id),
        ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        void loadMemories();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Tutor chat failed.';
        messages.value = messages.value.filter((message) => (message.id !== assistantMessage.id
            || message.content.trim() !== ''
            || (message.toolCalls?.length ?? 0) > 0));
    }
    finally {
        streamingId.value = null;
        sending.value = false;
        await scrollToBottom();
    }
}
onMounted(async () => {
    await Promise.all([loadSessions(), loadMemories()]);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "tutor-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "card tutor-sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tutor-sidebar-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.startNewChat) },
    ...{ class: "button button-primary button-tight" },
    type: "button",
    disabled: (__VLS_ctx.sending),
});
const __VLS_0 = {}.Plus;
/** @type {[typeof __VLS_components.Plus, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
if (__VLS_ctx.loadingSessions) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tutor-session-list" },
    });
    for (const [session] of __VLS_getVForSourceType((__VLS_ctx.sessions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingSessions))
                        return;
                    __VLS_ctx.selectSession(session.id);
                } },
            ...{ onKeydown: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingSessions))
                        return;
                    __VLS_ctx.selectSession(session.id);
                } },
            key: (session.id),
            ...{ class: "tutor-session" },
            ...{ class: ({ active: session.id === __VLS_ctx.activeId, disabled: __VLS_ctx.sending }) },
            role: "button",
            tabindex: (__VLS_ctx.sending ? -1 : 0),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tutor-session-title" },
        });
        (session.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tutor-session-meta" },
        });
        (__VLS_ctx.formatDate(session.updatedAt));
        (session.messageCount);
        if (session.preview) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "tutor-session-preview" },
            });
            (session.preview);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingSessions))
                        return;
                    __VLS_ctx.deleteSession(session.id);
                } },
            ...{ class: "tutor-session-delete" },
            type: "button",
            title: "Delete session",
            disabled: (__VLS_ctx.sending),
        });
    }
    if (__VLS_ctx.sessions.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "empty-copy" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tutor-memory" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showMemory = !__VLS_ctx.showMemory;
        } },
    ...{ class: "tutor-memory-toggle" },
    type: "button",
});
const __VLS_4 = {}.Brain;
/** @type {[typeof __VLS_components.Brain, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (14),
}));
const __VLS_6 = __VLS_5({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "count-chip" },
});
(__VLS_ctx.memories.length);
if (__VLS_ctx.showMemory) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tutor-memory-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.addMemory) },
        ...{ class: "tutor-memory-form" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.memoryDraft),
        type: "text",
        maxlength: "1000",
        placeholder: "Add a durable note...",
        disabled: (__VLS_ctx.savingMemory),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "button button-secondary button-tight" },
        type: "submit",
        disabled: (__VLS_ctx.savingMemory || !__VLS_ctx.memoryDraft.trim()),
    });
    if (__VLS_ctx.memories.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "empty-copy" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "tutor-memory-list" },
        });
        for (const [memory] of __VLS_getVForSourceType((__VLS_ctx.memories))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (memory.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "tutor-memory-head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "tutor-memory-kind" },
            });
            (memory.kind);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "tutor-memory-date" },
            });
            (__VLS_ctx.formatDate(memory.createdAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.showMemory))
                            return;
                        if (!!(__VLS_ctx.memories.length === 0))
                            return;
                        __VLS_ctx.deleteMemory(memory.id);
                    } },
                ...{ class: "tutor-memory-delete" },
                type: "button",
                title: "Delete memory",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (memory.content);
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card tutor-chat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "tutor-chat-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.activeSession?.title || 'New conversation');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "subtle-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "scrollRef",
    ...{ class: "tutor-messages" },
});
/** @type {typeof __VLS_ctx.scrollRef} */ ;
if (__VLS_ctx.messages.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tutor-empty" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "tutor-empty-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtle-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tutor-suggestions" },
    });
    for (const [suggestion] of __VLS_getVForSourceType((__VLS_ctx.suggestions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.messages.length === 0))
                        return;
                    __VLS_ctx.draft = suggestion;
                } },
            key: (suggestion),
            ...{ class: "tutor-suggestion" },
            type: "button",
        });
        (suggestion);
    }
}
for (const [message] of __VLS_getVForSourceType((__VLS_ctx.messages))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (message.id),
        ...{ class: "tutor-msg" },
        ...{ class: (message.role) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tutor-avatar" },
        'aria-hidden': "true",
    });
    (message.role === 'user' ? 'Me' : 'T');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tutor-msg-column" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "chat-role" },
    });
    (message.role === 'user' ? 'You' : 'Tutor');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tutor-bubble" },
    });
    if (message.toolCalls?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tutor-tool-traces" },
        });
        for (const [trace, index] of __VLS_getVForSourceType((message.toolCalls))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (`${trace.name}-${index}`),
                ...{ class: "tutor-tool-chip" },
                ...{ class: ({ 'is-error': !trace.ok, 'is-pending': trace.pending }) },
            });
            const __VLS_8 = {}.Wrench;
            /** @type {[typeof __VLS_components.Wrench, ]} */ ;
            // @ts-ignore
            const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
                size: (12),
            }));
            const __VLS_10 = __VLS_9({
                size: (12),
            }, ...__VLS_functionalComponentArgsRest(__VLS_9));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "tutor-tool-label" },
            });
            (trace.label);
            if (trace.pending || trace.summary) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "tutor-tool-summary" },
                });
                (trace.pending ? 'working...' : trace.summary);
            }
        }
    }
    if (message.content) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "chat-content" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderMarkdown(message.content)) }, null, null);
    }
    if (message.id === __VLS_ctx.streamingId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "tutor-caret" },
        });
    }
}
if (__VLS_ctx.showThinking) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "muted-text tutor-thinking" },
    });
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error-text" },
    });
    (__VLS_ctx.error);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.handleSend) },
    ...{ class: "tutor-composer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
    ...{ onKeydown: (__VLS_ctx.handleSend) },
    value: (__VLS_ctx.draft),
    rows: "3",
    placeholder: "Ask anything, or tell your tutor what to add...",
    disabled: (__VLS_ctx.sending),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tutor-composer-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "subtle-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "button button-primary" },
    type: "submit",
    disabled: (__VLS_ctx.sending || !__VLS_ctx.draft.trim()),
});
(__VLS_ctx.sending ? 'Replying...' : 'Send');
/** @type {__VLS_StyleScopedClasses['tutor-page']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-sidebar-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['button-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-session-list']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-session']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-session-title']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-session-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-session-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-session-delete']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-memory']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-memory-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['count-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-memory-body']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-memory-form']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-memory-list']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-memory-head']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-memory-kind']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-memory-date']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-memory-delete']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-chat']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-chat-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-messages']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-empty-title']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-suggestions']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-suggestion']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-msg-column']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-role']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-tool-traces']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-tool-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-tool-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-tool-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-caret']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-thinking']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-composer']} */ ;
/** @type {__VLS_StyleScopedClasses['tutor-composer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Brain: Brain,
            Plus: Plus,
            Wrench: Wrench,
            renderMarkdown: renderMarkdown,
            suggestions: suggestions,
            sessions: sessions,
            activeId: activeId,
            messages: messages,
            memories: memories,
            draft: draft,
            memoryDraft: memoryDraft,
            sending: sending,
            loadingSessions: loadingSessions,
            savingMemory: savingMemory,
            showMemory: showMemory,
            error: error,
            streamingId: streamingId,
            scrollRef: scrollRef,
            activeSession: activeSession,
            showThinking: showThinking,
            formatDate: formatDate,
            selectSession: selectSession,
            startNewChat: startNewChat,
            deleteSession: deleteSession,
            addMemory: addMemory,
            deleteMemory: deleteMemory,
            handleSend: handleSend,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
