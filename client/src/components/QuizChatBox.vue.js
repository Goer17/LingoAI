import { nextTick, ref, watch } from 'vue';
import { Check, X } from 'lucide-vue-next';
import { api } from '@/services/api';
const props = defineProps();
const draft = ref('');
const loading = ref(false);
const chatMessages = ref([]);
const chatHistoryRef = ref(null);
const error = ref('');
watch(() => props.questionIndex, () => {
    chatMessages.value = [];
    draft.value = '';
    error.value = '';
});
watch(() => chatMessages.value.length, async () => {
    await nextTick();
    if (!chatHistoryRef.value) {
        return;
    }
    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
});
async function handleSend() {
    const text = draft.value.trim();
    if (!text || loading.value) {
        return;
    }
    draft.value = '';
    const userMsg = { role: 'user', content: text };
    chatMessages.value = [...chatMessages.value, userMsg];
    loading.value = true;
    error.value = '';
    try {
        let streamedContent = '';
        const assistantMsg = { role: 'assistant', content: '' };
        chatMessages.value = [...chatMessages.value, assistantMsg];
        const assistantIndex = chatMessages.value.length - 1;
        await api.streamQuizQuestionChat({
            messages: chatMessages.value.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
            word: props.word,
            sentence: props.sentence,
            type: props.type,
            answer: props.answer,
            userResponse: props.userResponse,
            isCorrect: props.isCorrect,
            newMessage: text,
        }, (chunk) => {
            streamedContent += chunk;
            chatMessages.value[assistantIndex] = { ...assistantMsg, content: streamedContent };
        });
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Chat failed.';
        // Remove the empty assistant bubble on error.
        chatMessages.value = chatMessages.value.filter((m) => m.content !== '');
    }
    finally {
        loading.value = false;
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
    ...{ class: "card quiz-chat-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "detail-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "quiz-chat-context" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
(__VLS_ctx.questionIndex + 1);
(__VLS_ctx.questionTotal);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "quiz-chat-word" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.word);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "muted-text quiz-chat-sentence" },
});
(__VLS_ctx.sentence);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "quiz-chat-outcome" },
    ...{ class: (__VLS_ctx.isCorrect ? 'success-text' : 'error-text') },
});
if (__VLS_ctx.isCorrect) {
    const __VLS_0 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: (14),
        ...{ class: "feedback-icon" },
    }));
    const __VLS_2 = __VLS_1({
        size: (14),
        ...{ class: "feedback-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else {
    const __VLS_4 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
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
(__VLS_ctx.isCorrect ? 'Correct!' : `Your answer: "${__VLS_ctx.userResponse}" → Correct: "${__VLS_ctx.answer}"`);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "chatHistoryRef",
    ...{ class: "chat-history quiz-chat-history" },
});
/** @type {typeof __VLS_ctx.chatHistoryRef} */ ;
for (const [msg, index] of __VLS_getVForSourceType((__VLS_ctx.chatMessages))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (index),
        ...{ class: "chat-bubble" },
        ...{ class: (msg.role) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "chat-role" },
    });
    (msg.role === 'user' ? 'You' : 'Tutor');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "chat-content markdown-content" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderMarkdown(msg.content)) }, null, null);
}
if (__VLS_ctx.chatMessages.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.handleSend) },
    ...{ class: "chat-form" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
    ...{ onKeydown: (__VLS_ctx.handleSend) },
    value: (__VLS_ctx.draft),
    rows: "2",
    placeholder: "Why is this the answer? Explain the grammar...",
    disabled: (__VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "button button-primary" },
    type: "submit",
    disabled: (__VLS_ctx.loading || !__VLS_ctx.draft.trim()),
});
(__VLS_ctx.loading ? 'Thinking...' : 'Ask');
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-chat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-content']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-chat-context']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-chat-word']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-chat-sentence']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-chat-outcome']} */ ;
/** @type {__VLS_StyleScopedClasses['feedback-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['feedback-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-history']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-chat-history']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-role']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-content']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-content']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-form']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Check: Check,
            X: X,
            draft: draft,
            loading: loading,
            chatMessages: chatMessages,
            chatHistoryRef: chatHistoryRef,
            handleSend: handleSend,
            renderMarkdown: renderMarkdown,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
