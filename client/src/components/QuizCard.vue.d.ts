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
    regeneratingImage?: boolean;
    submittedListeningAnswers: string[];
};
/**
 * Put focus back where Enter advances the quiz (mirrors the awaitingNext
 * watcher). Used after Esc dismisses the floating tutor composer.
 */
declare function focusNextControl(): void;
type __VLS_PublicProps = __VLS_Props & {
    modelValue: string;
};
declare const _default: import("vue").DefineComponent<__VLS_PublicProps, {
    focusNextControl: typeof focusNextControl;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "play-audio": () => any;
    "update:modelValue": (value: string) => any;
    submit: (payload?: {
        response: string;
        blankAnswers: string[];
    } | undefined) => any;
    "regenerate-image": () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_PublicProps> & Readonly<{
    "onPlay-audio"?: (() => any) | undefined;
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onSubmit?: ((payload?: {
        response: string;
        blankAnswers: string[];
    } | undefined) => any) | undefined;
    "onRegenerate-image"?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
