import type { SearchResult } from '@/types/models';
type __VLS_Props = {
    result: SearchResult | null;
    showChinese: boolean;
    saving: boolean;
    allowSave?: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    save: () => any;
    "toggle-translation": () => any;
    "play-audio": (text: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSave?: (() => any) | undefined;
    "onToggle-translation"?: (() => any) | undefined;
    "onPlay-audio"?: ((text: string) => any) | undefined;
}>, {
    allowSave: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
