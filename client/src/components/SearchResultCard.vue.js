import { ref } from 'vue';
import { Check, RefreshCw, Volume2 } from 'lucide-vue-next';
const props = withDefaults(defineProps(), {
    allowSave: true,
    showHeaderLabel: true,
});
const emit = defineEmits();
const regenerateConfirm = ref(false);
function handleRegenerateClick() {
    if (regenerateConfirm.value) {
        emit('regenerate-audio', props.result?.ttsText ?? '');
        regenerateConfirm.value = false;
        return;
    }
    regenerateConfirm.value = true;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    allowSave: true,
    showHeaderLabel: true,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.result) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "card result-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    if (__VLS_ctx.showHeaderLabel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "eyebrow" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.result.text);
    if (__VLS_ctx.result.found) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "subtle-copy" },
        });
        (__VLS_ctx.result.type);
        (__VLS_ctx.result.pronunciation);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "subtle-copy" },
        });
        (__VLS_ctx.result.type);
    }
    if (__VLS_ctx.result.found) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "result-actions" },
        });
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.result))
                        return;
                    if (!(__VLS_ctx.result.found))
                        return;
                    __VLS_ctx.$emit('play-audio', __VLS_ctx.result.ttsText);
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
                    if (!(__VLS_ctx.result))
                        return;
                    if (!(__VLS_ctx.result.found))
                        return;
                    __VLS_ctx.$emit('toggle-translation');
                } },
            ...{ class: "button button-secondary" },
            type: "button",
        });
        (__VLS_ctx.showChinese ? 'Hide Chinese' : 'Show Chinese');
        if (__VLS_ctx.allowSave) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.result))
                            return;
                        if (!(__VLS_ctx.result.found))
                            return;
                        if (!(__VLS_ctx.allowSave))
                            return;
                        __VLS_ctx.$emit('save');
                    } },
                ...{ class: "button button-primary" },
                type: "button",
                disabled: (__VLS_ctx.saving),
            });
            (__VLS_ctx.saving ? 'Saving...' : 'Add to Vocabulary');
        }
    }
    if (__VLS_ctx.result.found) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "meaning-grid" },
        });
        for (const [meaning, index] of __VLS_getVForSourceType((__VLS_ctx.result.meanings))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (`${meaning.partOfSpeech}-${index}`),
                ...{ class: "meaning-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "meaning-top" },
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
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            ...{ class: "meaning-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "meaning-top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.result.notFoundMessage || 'Not Found');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted-text" },
        });
    }
    if (__VLS_ctx.result.found) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "token-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.result.derivatives.join(' · ') || 'None');
    }
}
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['result-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['meaning-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['meaning-card']} */ ;
/** @type {__VLS_StyleScopedClasses['meaning-top']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['example-text']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['meaning-card']} */ ;
/** @type {__VLS_StyleScopedClasses['meaning-top']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['token-row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Check: Check,
            RefreshCw: RefreshCw,
            Volume2: Volume2,
            regenerateConfirm: regenerateConfirm,
            handleRegenerateClick: handleRegenerateClick,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
