import { computed, onBeforeUnmount, ref } from 'vue';
const model = defineModel({ required: true });
const props = defineProps();
const emit = defineEmits();
const suggestions = ref([]);
const showSuggestions = ref(false);
const activeIndex = ref(-1);
const suggestionsBox = ref(null);
const suggestionEls = ref([]);
let debounceTimer;
let requestSeq = 0;
const activeDescendant = computed(() => activeIndex.value >= 0 ? `suggestion-${activeIndex.value}` : undefined);
function handleInput() {
    activeIndex.value = -1;
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
                if (activeIndex.value >= result.length) {
                    activeIndex.value = result.length - 1;
                }
            }
        }
        catch {
            if (seq === requestSeq) {
                suggestions.value = [];
            }
        }
    }, 180);
}
function handleKeydown(event) {
    if (!showSuggestions.value || suggestions.value.length === 0) {
        return;
    }
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeIndex.value = (activeIndex.value + 1) % suggestions.value.length;
        scrollActiveIntoView();
    }
    else if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex.value =
            activeIndex.value <= 0 ? suggestions.value.length - 1 : activeIndex.value - 1;
        scrollActiveIntoView();
    }
    else if (event.key === 'Enter') {
        // If an entry is highlighted with arrow keys, Enter picks it and searches.
        if (activeIndex.value >= 0 && activeIndex.value < suggestions.value.length) {
            event.preventDefault();
            selectSuggestion(suggestions.value[activeIndex.value]);
        }
    }
    else if (event.key === 'Escape') {
        event.preventDefault();
        suggestions.value = [];
        showSuggestions.value = false;
        activeIndex.value = -1;
    }
}
function scrollActiveIntoView() {
    const box = suggestionsBox.value;
    const el = suggestionEls.value[activeIndex.value];
    if (!box || !el) {
        return;
    }
    const top = el.offsetTop - box.clientTop;
    const bottom = top + el.offsetHeight;
    if (top < box.scrollTop) {
        box.scrollTop = top;
    }
    else if (bottom > box.scrollTop + box.clientHeight) {
        box.scrollTop = bottom - box.clientHeight;
    }
}
function selectSuggestion(word) {
    model.value = word;
    suggestions.value = [];
    showSuggestions.value = false;
    activeIndex.value = -1;
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
    ...{ onKeydown: (__VLS_ctx.handleKeydown) },
    ...{ onFocus: (...[$event]) => {
            __VLS_ctx.showSuggestions = true;
        } },
    ...{ onBlur: (__VLS_ctx.hideSuggestions) },
    value: (__VLS_ctx.model),
    type: "text",
    autocomplete: "off",
    spellcheck: "false",
    role: "combobox",
    'aria-expanded': (__VLS_ctx.showSuggestions && __VLS_ctx.suggestions.length > 0),
    'aria-autocomplete': "list",
    'aria-activedescendant': (__VLS_ctx.activeDescendant),
});
if (__VLS_ctx.showSuggestions && __VLS_ctx.suggestions.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "suggestionsBox",
        ...{ class: "suggestions" },
        role: "listbox",
    });
    /** @type {typeof __VLS_ctx.suggestionsBox} */ ;
    for (const [word, index] of __VLS_getVForSourceType((__VLS_ctx.suggestions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onMousedown: (...[$event]) => {
                    if (!(__VLS_ctx.showSuggestions && __VLS_ctx.suggestions.length))
                        return;
                    __VLS_ctx.selectSuggestion(word);
                } },
            ...{ onMouseenter: (...[$event]) => {
                    if (!(__VLS_ctx.showSuggestions && __VLS_ctx.suggestions.length))
                        return;
                    __VLS_ctx.activeIndex = index;
                } },
            key: (word),
            id: (`suggestion-${index}`),
            ...{ class: "suggestion" },
            ...{ class: ({ active: index === __VLS_ctx.activeIndex }) },
            role: "option",
            'aria-selected': (index === __VLS_ctx.activeIndex),
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
            activeIndex: activeIndex,
            suggestionsBox: suggestionsBox,
            activeDescendant: activeDescendant,
            handleInput: handleInput,
            handleKeydown: handleKeydown,
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
