import { reactive } from 'vue';
import { defineStore } from 'pinia';
/**
 * App-wide confirmation dialog.
 *
 * Native `window.confirm` blocks the page, cannot be styled and looks nothing
 * like the rest of the UI. Call sites `await ask({...})` and get a boolean back;
 * `<ConfirmDialog />` (mounted once in App.vue) renders the styled modal.
 */
export const useConfirmStore = defineStore('confirm', () => {
    const state = reactive({
        open: false,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        tone: 'default',
    });
    let resolver = null;
    function ask(options) {
        // Asking again while a dialog is open resolves the earlier one as cancelled
        // so no caller is left awaiting forever.
        resolver?.(false);
        state.open = true;
        state.title = options.title;
        state.message = options.message ?? '';
        state.confirmLabel = options.confirmLabel ?? 'Confirm';
        state.cancelLabel = options.cancelLabel ?? 'Cancel';
        state.tone = options.tone ?? 'default';
        return new Promise((resolve) => {
            resolver = resolve;
        });
    }
    function answer(value) {
        if (!state.open) {
            return;
        }
        state.open = false;
        const resolve = resolver;
        resolver = null;
        resolve?.(value);
    }
    return { state, ask, answer };
});
