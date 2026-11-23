export interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** `danger` renders the confirm button in the error colour. */
    tone?: 'default' | 'danger';
}
/**
 * App-wide confirmation dialog.
 *
 * Native `window.confirm` blocks the page, cannot be styled and looks nothing
 * like the rest of the UI. Call sites `await ask({...})` and get a boolean back;
 * `<ConfirmDialog />` (mounted once in App.vue) renders the styled modal.
 */
export declare const useConfirmStore: import("pinia").StoreDefinition<"confirm", Pick<{
    state: {
        open: boolean;
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        tone: "default" | "danger";
    };
    ask: (options: ConfirmOptions) => Promise<boolean>;
    answer: (value: boolean) => void;
}, "state">, Pick<{
    state: {
        open: boolean;
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        tone: "default" | "danger";
    };
    ask: (options: ConfirmOptions) => Promise<boolean>;
    answer: (value: boolean) => void;
}, never>, Pick<{
    state: {
        open: boolean;
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        tone: "default" | "danger";
    };
    ask: (options: ConfirmOptions) => Promise<boolean>;
    answer: (value: boolean) => void;
}, "ask" | "answer">>;
