import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useVocabularyStore } from '@/stores/vocabulary';
const store = useVocabularyStore();
const router = useRouter();
const error = ref('');
const message = ref('');
const startingTaskId = ref('');
const clearingTaskId = ref('');
const startingMistakeReview = ref(false);
let pollTimer = null;
const pendingProgressTick = ref(Date.now());
onMounted(async () => {
    await refresh();
    pollTimer = window.setInterval(() => {
        pendingProgressTick.value = Date.now();
        if (store.tasks.some((item) => item.status === 'pending')) {
            void refresh();
        }
    }, 3000);
});
onUnmounted(() => {
    if (pollTimer !== null) {
        window.clearInterval(pollTimer);
    }
});
function formatDate(value) {
    return new Date(value).toLocaleString();
}
function formatTaskType(type) {
    return type
        .split('_')
        .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
        .join(' ');
}
function formatStatusLabel(status) {
    return status.toUpperCase();
}
function truncateText(value, maxLength) {
    if (value.length <= maxLength) {
        return value;
    }
    return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}
async function refresh() {
    error.value = '';
    try {
        await store.fetchTasks();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load tasks.';
    }
}
async function startTask(taskId) {
    error.value = '';
    startingTaskId.value = taskId;
    try {
        const task = store.tasks.find((item) => item.id === taskId);
        if (!task) {
            throw new Error('Task not found.');
        }
        if (task.type === 'writing') {
            await router.push(`/writing-task/${task.id}`);
            return;
        }
        const sessionId = await store.startTask(taskId);
        await router.push(`/quiz/${sessionId}`);
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to start task.';
    }
    finally {
        startingTaskId.value = '';
    }
}
function pendingProgressPercent(taskId) {
    const task = store.tasks.find((item) => item.id === taskId);
    if (!task || task.status !== 'pending') {
        return 0;
    }
    const elapsedMs = Math.max(0, pendingProgressTick.value - new Date(task.createdAt).getTime());
    const maxMs = 12000;
    const ratio = Math.min(0.95, elapsedMs / maxMs);
    return Math.max(5, Math.round(ratio * 100));
}
function pendingStageText(taskId) {
    const progress = pendingProgressPercent(taskId);
    if (progress < 35) {
        return 'Collecting learning items';
    }
    if (progress < 70) {
        return 'Generating quiz questions';
    }
    return 'Finalizing task';
}
async function clearFailedTask(taskId) {
    error.value = '';
    message.value = '';
    clearingTaskId.value = taskId;
    try {
        await store.clearTask(taskId);
        message.value = 'Failed task removed.';
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to clear task.';
    }
    finally {
        clearingTaskId.value = '';
    }
}
async function startMistakeReview() {
    error.value = '';
    startingMistakeReview.value = true;
    try {
        const sessionId = await store.startMistakeReview();
        await router.push(`/quiz/${sessionId}`);
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to start mistake review.';
    }
    finally {
        startingMistakeReview.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "tasks-page" },
});
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tasks-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card tasks-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tasks-head" },
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
    ...{ onClick: (__VLS_ctx.refresh) },
    ...{ class: "button button-secondary" },
    type: "button",
    disabled: (__VLS_ctx.store.tasksLoading),
});
if (__VLS_ctx.store.tasks.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-scroller" },
    });
    for (const [task] of __VLS_getVForSourceType((__VLS_ctx.store.tasks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (task.id),
            ...{ class: "task-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "task-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "inline-heading" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatTaskType(task.type));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "task-status" },
            ...{ class: (`status-${task.status}`) },
        });
        (__VLS_ctx.formatStatusLabel(task.status));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted-text" },
        });
        (__VLS_ctx.formatDate(task.createdAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted-text" },
        });
        (task.type === 'writing' ? 'Exercise: short essay' : `Questions: ${task.questionCount || '-'}`);
        if (task.type === 'writing' && task.payload?.exercise) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted-text" },
            });
            (task.payload.exercise.topicTitle);
        }
        if (task.status === 'pending') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "task-progress" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "task-progress-track" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "task-progress-fill" },
                ...{ style: ({ width: `${__VLS_ctx.pendingProgressPercent(task.id)}%` }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted-text task-progress-copy" },
            });
            (__VLS_ctx.pendingProgressPercent(task.id));
            (__VLS_ctx.pendingStageText(task.id));
        }
        if (task.error) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "error-text" },
            });
            (task.error);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "task-actions" },
        });
        if (task.status === 'failed') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.store.tasks.length === 0))
                            return;
                        if (!(task.status === 'failed'))
                            return;
                        __VLS_ctx.clearFailedTask(task.id);
                    } },
                ...{ class: "button button-secondary" },
                type: "button",
                disabled: (__VLS_ctx.clearingTaskId === task.id),
            });
            (__VLS_ctx.clearingTaskId === task.id ? 'Clearing...' : 'Clear');
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.store.tasks.length === 0))
                        return;
                    __VLS_ctx.startTask(task.id);
                } },
            ...{ class: "button button-primary" },
            type: "button",
            disabled: (task.status !== 'ready' || __VLS_ctx.startingTaskId === task.id),
        });
        (__VLS_ctx.startingTaskId === task.id ? 'Opening...' : 'Start');
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card tasks-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tasks-head" },
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
    ...{ onClick: (__VLS_ctx.startMistakeReview) },
    ...{ class: "button button-primary" },
    type: "button",
    disabled: (__VLS_ctx.store.mistakes.length === 0 || __VLS_ctx.startingMistakeReview),
});
(__VLS_ctx.startingMistakeReview ? 'Opening...' : 'Start');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "muted-text" },
});
(__VLS_ctx.store.mistakes.length);
if (__VLS_ctx.store.mistakes.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-scroller" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.store.mistakes))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
            ...{ class: "task-row mistake-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "count-chip mistake-type-chip" },
        });
        (item.type === 'fill_blank' ? 'fill' : 'listening');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "task-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "inline-heading" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
            title: (item.word),
        });
        (__VLS_ctx.truncateText(item.word, 36));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted-text" },
            title: (item.answer),
        });
        (__VLS_ctx.truncateText(item.answer, 56));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted-text" },
        });
        (__VLS_ctx.formatDate(item.updatedAt));
    }
}
/** @type {__VLS_StyleScopedClasses['tasks-page']} */ ;
/** @type {__VLS_StyleScopedClasses['success-text']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['tasks-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['tasks-card']} */ ;
/** @type {__VLS_StyleScopedClasses['tasks-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['list-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['task-row']} */ ;
/** @type {__VLS_StyleScopedClasses['task-main']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['task-status']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['task-progress']} */ ;
/** @type {__VLS_StyleScopedClasses['task-progress-track']} */ ;
/** @type {__VLS_StyleScopedClasses['task-progress-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['task-progress-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['task-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['tasks-card']} */ ;
/** @type {__VLS_StyleScopedClasses['tasks-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['list-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['task-row']} */ ;
/** @type {__VLS_StyleScopedClasses['mistake-row']} */ ;
/** @type {__VLS_StyleScopedClasses['count-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['mistake-type-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['task-main']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            store: store,
            error: error,
            message: message,
            startingTaskId: startingTaskId,
            clearingTaskId: clearingTaskId,
            startingMistakeReview: startingMistakeReview,
            formatDate: formatDate,
            formatTaskType: formatTaskType,
            formatStatusLabel: formatStatusLabel,
            truncateText: truncateText,
            refresh: refresh,
            startTask: startTask,
            pendingProgressPercent: pendingProgressPercent,
            pendingStageText: pendingStageText,
            clearFailedTask: clearFailedTask,
            startMistakeReview: startMistakeReview,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
