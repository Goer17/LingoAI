import type { QuizQuestion } from '@/types/models';
type __VLS_Props = {
    question: QuizQuestion | null;
    sourceType: 'vocabulary_task' | 'listening_task' | 'mistake_review';
    submittedAnswer: string;
    feedback: string;
    feedbackIsCorrect: boolean;
    index: number;
    total: number;
    submitting: boolean;
    awaitingNext: boolean;
    submittedListeningAnswers: string[];
};
type __VLS_PublicProps = __VLS_Props & {
    modelValue: string;
};
declare const _default: import("vue").DefineComponent<__VLS_PublicProps, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: string) => any;
    submit: (payload?: {
        response: string;
        blankAnswers: string[];
    } | undefined) => any;
    "play-audio": () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_PublicProps> & Readonly<{
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onSubmit?: ((payload?: {
        response: string;
        blankAnswers: string[];
    } | undefined) => any) | undefined;
    "onPlay-audio"?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
