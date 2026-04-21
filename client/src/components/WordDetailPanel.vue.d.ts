import type { VocabularyEntry } from '@/types/models';
type __VLS_Props = {
    word: VocabularyEntry | null;
    showChinese: boolean;
    loading: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "play-audio": (text: string) => any;
    "toggle-translation": () => any;
    "save-note": (note: string) => any;
    "send-chat": (message: string) => any;
    "clear-chat": () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onPlay-audio"?: ((text: string) => any) | undefined;
    "onToggle-translation"?: (() => any) | undefined;
    "onSave-note"?: ((note: string) => any) | undefined;
    "onSend-chat"?: ((message: string) => any) | undefined;
    "onClear-chat"?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
