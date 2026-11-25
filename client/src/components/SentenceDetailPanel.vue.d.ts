import type { ListeningEntry } from '@/types/models';
type __VLS_Props = {
    sentence: ListeningEntry | null;
    loading: boolean;
    hideNote?: boolean;
    hideChat?: boolean;
    hideDelete?: boolean;
    /** Show the inline sentence editor. Off by default so the quiz reveal card
     *  (which reuses this panel) stays read-only. */
    editable?: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    delete: (id: string) => any;
    "save-note": (note: string) => any;
    "play-audio": () => any;
    "regenerate-audio": () => any;
    "send-chat": (message: string) => any;
    "clear-chat": () => any;
    "update-sentence": (sentence: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onDelete?: ((id: string) => any) | undefined;
    "onSave-note"?: ((note: string) => any) | undefined;
    "onPlay-audio"?: (() => any) | undefined;
    "onRegenerate-audio"?: (() => any) | undefined;
    "onSend-chat"?: ((message: string) => any) | undefined;
    "onClear-chat"?: (() => any) | undefined;
    "onUpdate-sentence"?: ((sentence: string) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
