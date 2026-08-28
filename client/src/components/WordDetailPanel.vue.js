import { nextTick, ref, watch } from 'vue';
import { Check, Image, Loader2, RefreshCw, Volume2 } from 'lucide-vue-next';
import { api } from '@/services/api';
const draft = ref('');
const chatHistoryRef = ref(null);
const props = defineProps();
const emit = defineEmits();
const deleteConfirm = ref(false);
const regenerateConfirm = ref(false);
function submit() {
    if (!draft.value.trim() || !props.word) {
        return;
    }
    emit('send-chat', draft.value.trim());
    draft.value = '';
}
function handleNoteChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
        return;
    }
    emit('save-note', target.value);
}
function handleDeleteClick() {
    if (deleteConfirm.value) {
        emit('delete', props.word?.id ?? '');
        deleteConfirm.value = false;
        return;
    }
    deleteConfirm.value = true;
}
function handleRegenerateClick() {
    if (regenerateConfirm.value) {
        emit('regenerate-audio');
        regenerateConfirm.value = false;
        return;
    }
    regenerateConfirm.value = true;
}
watch(() => props.word?.id, () => {
    deleteConfirm.value = false;
    regenerateConfirm.value = false;
});
watch(() => {
    const history = props.word?.chatHistory ?? [];
    const last = history[history.length - 1];
    return `${history.length}:${last?.id ?? ''}:${last?.content.length ?? 0}`;
}, async () => {
    await nextTick();
    if (!chatHistoryRef.value) {
        return;
    }
    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
});
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
const exampleImages = ref({});
const checkedWords = ref(new Set());
function exampleImageState(example) {
    return exampleImages.value[example] ?? null;
}
function exampleImageUrl(example) {
    return exampleImages.value[example]?.url ?? '';
}
function isExampleImageLoading(example) {
    return Boolean(exampleImages.value[example]?.loading);
}
function exampleImageError(example) {
    return exampleImages.value[example]?.error ?? '';
}
function exampleImageLabel(example) {
    const state = exampleImages.value[example];
    if (!state) {
        return 'Generate image';
    }
    if (state.loading) {
        return 'Generating...';
    }
    return state.url ? 'Image ready' : 'Generate image';
}
function exampleImageButtonTitle(example) {
    const state = exampleImages.value[example];
    if (!state || !state.url) {
        return 'Generate an image for this sentence';
    }
    if (state.loading) {
        return 'Generating...';
    }
    return 'Regenerate image';
}
async function handleExampleImage(example) {
    const current = exampleImages.value[example];
    if (current?.loading) {
        return;
    }
    const force = Boolean(current?.url);
    exampleImages.value[example] = {
        url: current?.url ?? '',
        loading: true,
        error: '',
    };
    try {
        const result = await api.generateSentenceImage(example, force);
        exampleImages.value[example] = {
            url: result.imageUrl,
            loading: false,
            error: '',
        };
    }
    catch (err) {
        exampleImages.value[example] = {
            url: current?.url ?? '',
            loading: false,
            error: err instanceof Error ? err.message : 'Image generation failed.',
        };
    }
}
watch(() => props.word?.id, async (id) => {
    if (!id || checkedWords.value.has(id)) {
        return;
    }
    checkedWords.value.add(id);
    const word = props.word;
    if (!word) {
        return;
    }
    const examples = [...new Set(word.meanings.map((meaning) => meaning.example.trim()).filter(Boolean))];
    if (examples.length === 0) {
        return;
    }
    for (const example of examples) {
        try {
            const { imageUrl } = await api.checkSentenceImage(example);
            if (imageUrl) {
                exampleImages.value[example] = { url: imageUrl, loading: false, error: '' };
            }
        }
        catch {
            // Ignore check failures; the user can still generate manually.
        }
    }
}, { immediate: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card detail-card" },
});
if (__VLS_ctx.word) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.word.text);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtle-copy" },
    });
    (__VLS_ctx.word.type);
    (__VLS_ctx.word.familiarity);
    (__VLS_ctx.word.pronunciation);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-actions" },
    });
    if (!__VLS_ctx.hasCommonAudio) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleRegenerateClick) },
            ...{ class: "icon-button" },
            type: "button",
            ...{ class: ({ confirm: __VLS_ctx.regenerateConfirm }) },
            'aria-label': (__VLS_ctx.regenerateConfirm ? 'Confirm regenerate audio' : 'Regenerate audio'),
            title: (__VLS_ctx.regenerateConfirm ? 'Click again to confirm' : 'Regenerate audio'),
        });
        if (!__VLS_ctx.regenerateConfirm) {
            const __VLS_0 = {}.RefreshCw;
            /** @type {[typeof __VLS_components.RefreshCw, ]} */ ;
            // @ts-ignore
            const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
                size: (18),
            }));
            const __VLS_2 = __VLS_1({
                size: (18),
            }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        }
        else {
            const __VLS_4 = {}.Check;
            /** @type {[typeof __VLS_components.Check, ]} */ ;
            // @ts-ignore
            const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
                size: (18),
            }));
            const __VLS_6 = __VLS_5({
                size: (18),
            }, ...__VLS_functionalComponentArgsRest(__VLS_5));
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.word))
                    return;
                __VLS_ctx.$emit('play-audio');
            } },
        ...{ class: "icon-button" },
        type: "button",
        'aria-label': "Play pronunciation",
        title: "Play pronunciation",
    });
    const __VLS_8 = {}.Volume2;
    /** @type {[typeof __VLS_components.Volume2, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: (18),
    }));
    const __VLS_10 = __VLS_9({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.word))
                    return;
                __VLS_ctx.$emit('toggle-translation');
            } },
        ...{ class: "button button-secondary" },
        type: "button",
    });
    (__VLS_ctx.showChinese ? 'Hide Chinese' : 'Show Chinese');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleDeleteClick) },
        ...{ class: "button button-secondary delete-action" },
        type: "button",
        ...{ class: ({ confirm: __VLS_ctx.deleteConfirm }) },
    });
    (__VLS_ctx.deleteConfirm ? 'Confirm' : 'Delete');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meaning-grid detail-grid" },
    });
    for (const [meaning, index] of __VLS_getVForSourceType((__VLS_ctx.word.meanings))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (`${meaning.partOfSpeech}-${index}`),
            ...{ class: "meaning-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (meaning.partOfSpeech);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (meaning.englishMeaning);
        if (__VLS_ctx.showChinese) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted-text" },
            });
            (meaning.chineseMeaning);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "example-text" },
        });
        (meaning.example);
        if (__VLS_ctx.showChinese) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted-text" },
            });
            (meaning.exampleTranslation);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "example-image-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.word))
                        return;
                    __VLS_ctx.handleExampleImage(meaning.example);
                } },
            ...{ class: "icon-button example-image-btn" },
            type: "button",
            disabled: (__VLS_ctx.isExampleImageLoading(meaning.example)),
            title: (__VLS_ctx.exampleImageButtonTitle(meaning.example)),
            'aria-label': (__VLS_ctx.exampleImageButtonTitle(meaning.example)),
        });
        if (!__VLS_ctx.exampleImageState(meaning.example)) {
            const __VLS_12 = {}.Image;
            /** @type {[typeof __VLS_components.Image, ]} */ ;
            // @ts-ignore
            const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
                size: (14),
            }));
            const __VLS_14 = __VLS_13({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        }
        else if (!__VLS_ctx.isExampleImageLoading(meaning.example)) {
            const __VLS_16 = {}.RefreshCw;
            /** @type {[typeof __VLS_components.RefreshCw, ]} */ ;
            // @ts-ignore
            const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
                size: (14),
            }));
            const __VLS_18 = __VLS_17({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        }
        else {
            const __VLS_20 = {}.Loader2;
            /** @type {[typeof __VLS_components.Loader2, ]} */ ;
            // @ts-ignore
            const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
                ...{ class: "example-image-spin" },
                size: (14),
            }));
            const __VLS_22 = __VLS_21({
                ...{ class: "example-image-spin" },
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "muted-text example-image-label" },
        });
        (__VLS_ctx.exampleImageLabel(meaning.example));
        if (__VLS_ctx.exampleImageError(meaning.example)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "error-text example-image-error" },
            });
            (__VLS_ctx.exampleImageError(meaning.example));
        }
        if (__VLS_ctx.exampleImageUrl(meaning.example)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.exampleImageUrl(meaning.example)),
                ...{ class: "example-image" },
                alt: "Illustration for this example sentence",
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "token-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.word.derivatives.join(' · ') || 'None');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        ...{ onChange: (__VLS_ctx.handleNoteChange) },
        value: (__VLS_ctx.word.note),
        rows: "5",
        placeholder: "Add your own note...",
    });
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
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.word))
                    return;
                __VLS_ctx.$emit('clear-chat');
            } },
        ...{ class: "button button-secondary" },
        type: "button",
        disabled: (__VLS_ctx.loading || __VLS_ctx.word.chatHistory.length === 0),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "chatHistoryRef",
        ...{ class: "chat-history" },
    });
    /** @type {typeof __VLS_ctx.chatHistoryRef} */ ;
    for (const [message] of __VLS_getVForSourceType((__VLS_ctx.word.chatHistory))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (message.id),
            ...{ class: "chat-bubble" },
            ...{ class: (message.role) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "chat-role" },
        });
        (message.role);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "chat-content markdown-content" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderMarkdown(message.content)) }, null, null);
    }
    if (__VLS_ctx.word.chatHistory.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "empty-copy" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.submit) },
        ...{ class: "chat-form" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        ...{ onKeydown: (__VLS_ctx.submit) },
        value: (__VLS_ctx.draft),
        rows: "3",
        placeholder: "Ask about collocations, tone, or common mistakes...",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "button button-primary" },
        type: "submit",
        disabled: (__VLS_ctx.loading || !__VLS_ctx.draft.trim()),
    });
    (__VLS_ctx.loading ? 'Sending...' : 'Send');
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
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-content']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['result-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-action']} */ ;
/** @type {__VLS_StyleScopedClasses['meaning-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['meaning-card']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['example-text']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['example-image-row']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['example-image-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['example-image-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['example-image-label']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['example-image-error']} */ ;
/** @type {__VLS_StyleScopedClasses['example-image']} */ ;
/** @type {__VLS_StyleScopedClasses['token-row']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
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
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Check: Check,
            Image: Image,
            Loader2: Loader2,
            RefreshCw: RefreshCw,
            Volume2: Volume2,
            draft: draft,
            chatHistoryRef: chatHistoryRef,
            deleteConfirm: deleteConfirm,
            regenerateConfirm: regenerateConfirm,
            submit: submit,
            handleNoteChange: handleNoteChange,
            handleDeleteClick: handleDeleteClick,
            handleRegenerateClick: handleRegenerateClick,
            renderMarkdown: renderMarkdown,
            exampleImageState: exampleImageState,
            exampleImageUrl: exampleImageUrl,
            isExampleImageLoading: isExampleImageLoading,
            exampleImageError: exampleImageError,
            exampleImageLabel: exampleImageLabel,
            exampleImageButtonTitle: exampleImageButtonTitle,
            handleExampleImage: handleExampleImage,
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
