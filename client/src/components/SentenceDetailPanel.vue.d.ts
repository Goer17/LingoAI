import type { ListeningEntry } from '@/types/models';
type __VLS_Props = {
    sentence: ListeningEntry | null;
    loading: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    delete: (id: string) => any;
    "play-audio": () => any;
    "regenerate-audio": () => any;
    "save-note": (note: string) => any;
    "send-chat": (message: string) => any;
    "clear-chat": () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onDelete?: ((id: string) => any) | undefined;
    "onPlay-audio"?: (() => any) | undefined;
    "onRegenerate-audio"?: (() => any) | undefined;
    "onSave-note"?: ((note: string) => any) | undefined;
    "onSend-chat"?: ((message: string) => any) | undefined;
    "onClear-chat"?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
