import { reactive } from 'vue';
import { defineStore } from 'pinia';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` renders the confirm button in the error colour. */
  tone?: 'default' | 'danger';
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: 'default' | 'danger';
}

/**
 * App-wide confirmation dialog.
 *
 * Native `window.confirm` blocks the page, cannot be styled and looks nothing
 * like the rest of the UI. Call sites `await ask({...})` and get a boolean back;
 * `<ConfirmDialog />` (mounted once in App.vue) renders the styled modal.
 */
export const useConfirmStore = defineStore('confirm', () => {
  const state = reactive<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    tone: 'default',
  });

  let resolver: ((value: boolean) => void) | null = null;

  function ask(options: ConfirmOptions): Promise<boolean> {
    // Asking again while a dialog is open resolves the earlier one as cancelled
    // so no caller is left awaiting forever.
    resolver?.(false);

    state.open = true;
    state.title = options.title;
    state.message = options.message ?? '';
    state.confirmLabel = options.confirmLabel ?? 'Confirm';
    state.cancelLabel = options.cancelLabel ?? 'Cancel';
    state.tone = options.tone ?? 'default';

    return new Promise<boolean>((resolve) => {
      resolver = resolve;
    });
  }

  function answer(value: boolean) {
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