import type { VocabularyEntry } from '@/types/models';
type __VLS_Props = {
    word: VocabularyEntry | null;
    showChinese: boolean;
    loading: boolean;
    hasCommonAudio?: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "toggle-translation": () => any;
    "play-audio": () => any;
    "regenerate-audio": () => any;
    "save-note": (note: string) => any;
    "send-chat": (message: string) => any;
    "clear-chat": () => any;
    delete: (id: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onToggle-translation"?: (() => any) | undefined;
    "onPlay-audio"?: (() => any) | undefined;
    "onRegenerate-audio"?: (() => any) | undefined;
    "onSave-note"?: ((note: string) => any) | undefined;
    "onSend-chat"?: ((message: string) => any) | undefined;
    "onClear-chat"?: (() => any) | undefined;
    onDelete?: ((id: string) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
