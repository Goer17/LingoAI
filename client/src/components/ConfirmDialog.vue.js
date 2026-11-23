import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useConfirmStore } from '@/stores/confirm';
const confirm = useConfirmStore();
const confirmButtonRef = ref(null);
function handleKeydown(event) {
    if (event.key === 'Escape') {
        event.preventDefault();
        confirm.answer(false);
    }
}
// Focus the primary action so Enter answers immediately; Escape cancels from
// anywhere on the page while the dialog is open.
watch(() => confirm.state.open, async (open) => {
    if (open) {
        window.addEventListener('keydown', handleKeydown);
        await nextTick();
        confirmButtonRef.value?.focus();
        return;
    }
    window.removeEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.Teleport;
/** @type {[typeof __VLS_components.Teleport, typeof __VLS_components.Teleport, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "body",
}));
const __VLS_2 = __VLS_1({
    to: "body",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
if (__VLS_ctx.confirm.state.open) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.confirm.state.open))
                    return;
                __VLS_ctx.confirm.answer(false);
            } },
        ...{ class: "confirm-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "confirm-dialog" },
        role: "dialog",
        'aria-modal': "true",
        'aria-labelledby': "confirm-dialog-title",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        id: "confirm-dialog-title",
    });
    (__VLS_ctx.confirm.state.title);
    if (__VLS_ctx.confirm.state.message) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "confirm-message" },
        });
        (__VLS_ctx.confirm.state.message);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "confirm-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.confirm.state.open))
                    return;
                __VLS_ctx.confirm.answer(false);
            } },
        ...{ class: "button button-secondary" },
        type: "button",
    });
    (__VLS_ctx.confirm.state.cancelLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.confirm.state.open))
                    return;
                __VLS_ctx.confirm.answer(true);
            } },
        ref: "confirmButtonRef",
        ...{ class: "button button-primary" },
        ...{ class: ({ 'confirm-danger': __VLS_ctx.confirm.state.tone === 'danger' }) },
        type: "button",
    });
    /** @type {typeof __VLS_ctx.confirmButtonRef} */ ;
    (__VLS_ctx.confirm.state.confirmLabel);
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['confirm-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-message']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            confirm: confirm,
            confirmButtonRef: confirmButtonRef,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
