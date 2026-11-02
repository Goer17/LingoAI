import type { ReadingMark } from '@/types/models';
type __VLS_Props = {
    mark: ReadingMark;
    focused?: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {} & {
    delete: (markId: string) => any;
    cite: (mark: ReadingMark) => any;
    jump: (mark: ReadingMark) => any;
    focus: (markId: string) => any;
    "save-note": (markId: string, note: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onDelete?: ((markId: string) => any) | undefined;
    onCite?: ((mark: ReadingMark) => any) | undefined;
    onJump?: ((mark: ReadingMark) => any) | undefined;
    onFocus?: ((markId: string) => any) | undefined;
    "onSave-note"?: ((markId: string, note: string) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
