import type { SearchResult } from '@/types/models';
type __VLS_Props = {
    result: SearchResult | null;
    showChinese: boolean;
    saving: boolean;
    allowSave?: boolean;
    showHeaderLabel?: boolean;
    hasCommonAudio?: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "play-audio": (text: string) => any;
    "regenerate-audio": (text: string) => any;
    "toggle-translation": () => any;
    save: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onPlay-audio"?: ((text: string) => any) | undefined;
    "onRegenerate-audio"?: ((text: string) => any) | undefined;
    "onToggle-translation"?: (() => any) | undefined;
    onSave?: (() => any) | undefined;
}>, {
    hasCommonAudio: boolean;
    allowSave: boolean;
    showHeaderLabel: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
