import { onBeforeUnmount, ref } from 'vue';
const model = defineModel({ required: true });
const props = defineProps();
const emit = defineEmits();
const suggestions = ref([]);
const showSuggestions = ref(false);
let debounceTimer;
let requestSeq = 0;
function handleInput() {
    if (!props.suggest) {
        suggestions.value = [];
        return;
    }
    showSuggestions.value = true;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        const prefix = model.value.trim();
        if (!prefix) {
            suggestions.value = [];
            return;
        }
        const seq = ++requestSeq;
        try {
            const result = await props.suggest(prefix);
            // Ignore stale responses from a previous keystroke.
            if (seq === requestSeq) {
                suggestions.value = result;
            }
        }
        catch {
            if (seq === requestSeq) {
                suggestions.value = [];
            }
        }
    }, 180);
}
function selectSuggestion(word) {
    model.value = word;
    suggestions.value = [];
    showSuggestions.value = false;
    // Selecting a suggestion should immediately trigger the search.
    emit('search');
}
function hideSuggestions() {
    // Delay so a click on a suggestion can register before the dropdown hides.
    setTimeout(() => {
        showSuggestions.value = false;
    }, 120);
}
onBeforeUnmount(() => {
    clearTimeout(debounceTimer);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_defaults = {};
const __VLS_modelEmit = defineEmits();
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['suggestion']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (...[$event]) => {
            __VLS_ctx.$emit('search');
        } },
    ...{ class: "search-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field search-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onInput: (__VLS_ctx.handleInput) },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.showSuggestions = true;
        } },
    ...{ onBlur: (__VLS_ctx.hideSuggestions) },
    value: (__VLS_ctx.model),
    type: "text",
    autocomplete: "off",
    spellcheck: "false",
});
if (__VLS_ctx.showSuggestions && __VLS_ctx.suggestions.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "suggestions" },
    });
    for (const [word] of __VLS_getVForSourceType((__VLS_ctx.suggestions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onMousedown: (...[$event]) => {
                    if (!(__VLS_ctx.showSuggestions && __VLS_ctx.suggestions.length))
                        return;
                    __VLS_ctx.selectSuggestion(word);
                } },
            key: (word),
            ...{ class: "suggestion" },
            type: "button",
        });
        (word);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "button button-primary" },
    type: "submit",
    disabled: (__VLS_ctx.loading || !__VLS_ctx.model.trim()),
});
(__VLS_ctx.loading ? 'Searching...' : 'Search');
/** @type {__VLS_StyleScopedClasses['search-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['search-field']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestions']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            model: model,
            suggestions: suggestions,
            showSuggestions: showSuggestions,
            handleInput: handleInput,
            selectSuggestion: selectSuggestion,
            hideSuggestions: hideSuggestions,
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
