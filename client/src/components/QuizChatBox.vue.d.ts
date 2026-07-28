type __VLS_Props = {
    word: string;
    sentence: string;
    type: 'fill_blank' | 'listening';
    answer: string;
    userResponse: string;
    isCorrect: boolean;
    questionIndex: number;
    questionTotal: number;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
