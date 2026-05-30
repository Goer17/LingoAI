import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/services/api';
import { useVocabularyStore } from '@/stores/vocabulary';
const route = useRoute();
const router = useRouter();
const store = useVocabularyStore();
const loading = ref(true);
const error = ref('');
const sending = ref(false);
const summarizing = ref(false);
const ended = ref(false);
const draft = ref('');
const chatRef = ref(null);
const taskId = ref('');
const scenario = ref(null);
const chatHistory = ref([]);
const completedIds = ref(new Set());
const summary = ref(null);
const objectiveStatuses = computed(() => {
    if (!scenario.value) {
        return [];
    }
    return scenario.value.objectives.map((obj) => ({
        ...obj,
        completed: completedIds.value.has(obj.id),
    }));
});
const completedCount = computed(() => completedIds.value.size);
const allCompleted = computed(() => {
    if (!scenario.value) {
        return false;
    }
    return completedIds.value.size >= scenario.value.objectives.length;
});
onMounted(async () => {
    taskId.value = String(route.params.taskId);
    try {
        await store.fetchTasks();
        const task = store.tasks.find((item) => item.id === taskId.value);
        if (!task || task.type !== 'expression') {
            error.value = 'Expression task not found.';
            return;
        }
        if (!task.scenario) {
            error.value = 'Scenario data not available.';
            return;
        }
        scenario.value = task.scenario;
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load scenario.';
    }
    finally {
        loading.value = false;
    }
});
async function scrollToBottom() {
    await nextTick();
    if (chatRef.value) {
        chatRef.value.scrollTop = chatRef.value.scrollHeight;
    }
}
async function handleSend() {
    const message = draft.value.trim();
    if (!message || !scenario.value || sending.value) {
        return;
    }
    error.value = '';
    sending.value = true;
    draft.value = '';
    chatHistory.value.push({ role: 'user', content: message });
    chatHistory.value.push({ role: 'assistant', content: '' });
    const assistantIndex = chatHistory.value.length - 1;
    await scrollToBottom();
    try {
        const historyForApi = chatHistory.value.slice(0, -1).filter((m) => m.content);
        await api.streamScenarioChat(scenario.value, historyForApi, message, (chunk) => {
            chatHistory.value[assistantIndex].content += chunk;
            void scrollToBottom();
        });
        void checkObjectivesInBackground();
    }
    catch (err) {
        chatHistory.value[assistantIndex].content = err instanceof Error ? err.message : 'Chat failed.';
        error.value = err instanceof Error ? err.message : 'Chat failed.';
    }
    finally {
        sending.value = false;
        await scrollToBottom();
    }
}
async function checkObjectivesInBackground() {
    if (!scenario.value || ended.value) {
        return;
    }
    try {
        const validHistory = chatHistory.value.filter((m) => m.content);
        const result = await api.checkObjectives(scenario.value, validHistory);
        for (const id of result.completedObjectiveIds) {
            completedIds.value.add(id);
        }
    }
    catch {
        // silently ignore objective check failures
    }
}
async function handleEnd() {
    if (!scenario.value || summarizing.value) {
        return;
    }
    error.value = '';
    summarizing.value = true;
    ended.value = true;
    try {
        const validHistory = chatHistory.value.filter((m) => m.content);
        summary.value = await api.summarizeScenario(scenario.value, validHistory);
        if (taskId.value) {
            await store.clearTask(taskId.value).catch(() => { });
        }
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to generate summary.';
    }
    finally {
        summarizing.value = false;
    }
}
async function backToTopics() {
    await router.push('/writing');
}
function renderSimpleMarkdown(text) {
    return escapeHtml(text)
        .replace(/\n/g, '<br>')
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
    ...{ class: "expression-practice-page" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card expression-loading-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtle-copy" },
    });
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error-text" },
    });
    (__VLS_ctx.error);
}
if (__VLS_ctx.scenario && !__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expression-practice-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "card expression-chat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expression-scenario-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    (__VLS_ctx.scenario.topicTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.scenario.assistantRole);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtle-copy" },
    });
    (__VLS_ctx.scenario.setting);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "muted-text" },
    });
    (__VLS_ctx.scenario.userRole);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "chatRef",
        ...{ class: "expression-chat-history" },
    });
    /** @type {typeof __VLS_ctx.chatRef} */ ;
    for (const [msg, index] of __VLS_getVForSourceType((__VLS_ctx.chatHistory))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (index),
            ...{ class: "chat-bubble" },
            ...{ class: (msg.role) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "chat-role" },
        });
        (msg.role === 'user' ? 'You' : __VLS_ctx.scenario.assistantRole);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "chat-content" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderSimpleMarkdown(msg.content)) }, null, null);
    }
    if (__VLS_ctx.chatHistory.length === 0 && !__VLS_ctx.ended) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "empty-copy" },
        });
    }
    if (!__VLS_ctx.ended) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.handleSend) },
            ...{ class: "chat-form" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
            ...{ onKeydown: (__VLS_ctx.handleSend) },
            value: (__VLS_ctx.draft),
            rows: "2",
            placeholder: "Type your message...",
            disabled: (__VLS_ctx.sending),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "button button-primary" },
            type: "submit",
            disabled: (__VLS_ctx.sending || !__VLS_ctx.draft.trim()),
        });
        (__VLS_ctx.sending ? 'Sending...' : 'Send');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "card expression-objectives-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "expression-objective-list" },
    });
    for (const [obj] of __VLS_getVForSourceType((__VLS_ctx.objectiveStatuses))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (obj.id),
            ...{ class: "expression-objective-item" },
            ...{ class: ({ completed: obj.completed }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "expression-objective-check" },
        });
        (obj.completed ? '✓' : '○');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (obj.description);
    }
    if (!__VLS_ctx.ended) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "expression-end-bar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted-text" },
        });
        (__VLS_ctx.completedCount);
        (__VLS_ctx.objectiveStatuses.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleEnd) },
            ...{ class: "button button-primary" },
            type: "button",
            disabled: (!__VLS_ctx.allCompleted || __VLS_ctx.summarizing),
        });
        (__VLS_ctx.summarizing ? 'Summarizing...' : 'End Practice');
    }
    if (__VLS_ctx.summary) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "expression-summary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "eyebrow" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "expression-summary-block" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.summary.overallAssessment);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "expression-summary-block" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        for (const [result, index] of __VLS_getVForSourceType((__VLS_ctx.summary.objectiveResults))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (`obj-${index}`),
                ...{ class: "expression-objective-feedback" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (result.objective);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (result.feedback);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "expression-summary-block" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({});
        for (const [suggestion, index] of __VLS_getVForSourceType((__VLS_ctx.summary.expressionSuggestions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (`sug-${index}`),
            });
            (suggestion);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "expression-summary-block expression-encouragement" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.summary.encouragement);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.backToTopics) },
            ...{ class: "button button-primary" },
            type: "button",
        });
    }
}
/** @type {__VLS_StyleScopedClasses['expression-practice-page']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-loading-card']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-practice-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-chat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-scenario-header']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-chat-history']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-role']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-content']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-form']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-objectives-card']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-objective-list']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-objective-item']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-objective-check']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-end-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-summary-block']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-summary-block']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-objective-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-summary-block']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-summary-block']} */ ;
/** @type {__VLS_StyleScopedClasses['expression-encouragement']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            error: error,
            sending: sending,
            summarizing: summarizing,
            ended: ended,
            draft: draft,
            chatRef: chatRef,
            scenario: scenario,
            chatHistory: chatHistory,
            summary: summary,
            objectiveStatuses: objectiveStatuses,
            completedCount: completedCount,
            allCompleted: allCompleted,
            handleSend: handleSend,
            handleEnd: handleEnd,
            backToTopics: backToTopics,
            renderSimpleMarkdown: renderSimpleMarkdown,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
