import type { QuizSession } from '@/types/models';
type __VLS_Props = {
    sessionId: string;
    questionId: string;
    word: string;
    sentence: string;
    type: 'fill_blank' | 'listening';
    answer: string;
    userResponse: string;
    isCorrect: boolean;
    canAppeal: boolean;
    questionIndex: number;
};
/** Focus the composer, used by the quiz page's Tab shortcut. */
declare function focusInput(): void;
declare const _default: import("vue").DefineComponent<__VLS_Props, {
    focusInput: typeof focusInput;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "appeal-resolved": (payload: {
        session: QuizSession;
        accepted: boolean;
    }) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onAppeal-resolved"?: ((payload: {
        session: QuizSession;
        accepted: boolean;
    }) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
