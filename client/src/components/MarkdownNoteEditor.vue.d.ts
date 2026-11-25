/**
 * Typora-style Markdown surface: the note is a list of blocks, each rendered
 * until you click it, then it becomes a plain textarea. Everything outside the
 * block being edited stays rendered, so there is no separate preview pane.
 *
 * The block list is local state while editing. Re-deriving it from the prop on
 * every keystroke would renumber the blocks (blank blocks collapse when the
 * text is split again) and drop the caret into the wrong one.
 */
type __VLS_Props = {
    value: string;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:value": (value: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:value"?: ((value: string) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
