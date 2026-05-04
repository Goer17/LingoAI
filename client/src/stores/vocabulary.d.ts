import type { LearningTask, ListeningEntry, MistakeEntry, QuizSession, SearchResult, VocabularyEntry } from '@/types/models';
export declare const useVocabularyStore: import("pinia").StoreDefinition<"vocabulary", Pick<{
    items: import("vue").Ref<{
        id: string;
        text: string;
        type: import("@/types/models").WordType;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        note: string;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        audioFile?: string | undefined;
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
        }[];
    }[], VocabularyEntry[] | {
        id: string;
        text: string;
        type: import("@/types/models").WordType;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        note: string;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        audioFile?: string | undefined;
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
        }[];
    }[]>;
    selectedId: import("vue").Ref<string, string>;
    selectedWord: import("vue").ComputedRef<{
        id: string;
        text: string;
        type: import("@/types/models").WordType;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        note: string;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        audioFile?: string | undefined;
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
        }[];
    } | null>;
    searchResult: import("vue").Ref<{
        text: string;
        type: import("@/types/models").WordType;
        found: boolean;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        notFoundMessage?: string | undefined;
    } | null, SearchResult | {
        text: string;
        type: import("@/types/models").WordType;
        found: boolean;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        notFoundMessage?: string | undefined;
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    searching: import("vue").Ref<boolean, boolean>;
    savingWord: import("vue").Ref<boolean, boolean>;
    quizSession: import("vue").Ref<{
        id: string;
        createdAt: string;
        questionIds: string[];
        questions: {
            id: string;
            type: import("@/types/models").QuizType;
            word: string;
            sentence: string;
            maskedSentence?: string | undefined;
            answer: string;
            answerVariants?: string[] | undefined;
            candidates?: string[] | undefined;
            ttsText?: string | undefined;
            audioUrl?: string | undefined;
            blanks?: {
                start: number;
                end: number;
                answer: string;
            }[] | undefined;
        }[];
        currentIndex: number;
        sourceType: import("@/types/models").QuizSourceType;
        answers: {
            questionId: string;
            response: string;
            isCorrect: boolean;
        }[];
        completed: boolean;
    } | null, QuizSession | {
        id: string;
        createdAt: string;
        questionIds: string[];
        questions: {
            id: string;
            type: import("@/types/models").QuizType;
            word: string;
            sentence: string;
            maskedSentence?: string | undefined;
            answer: string;
            answerVariants?: string[] | undefined;
            candidates?: string[] | undefined;
            ttsText?: string | undefined;
            audioUrl?: string | undefined;
            blanks?: {
                start: number;
                end: number;
                answer: string;
            }[] | undefined;
        }[];
        currentIndex: number;
        sourceType: import("@/types/models").QuizSourceType;
        answers: {
            questionId: string;
            response: string;
            isCorrect: boolean;
        }[];
        completed: boolean;
    } | null>;
    tasks: import("vue").Ref<{
        id: string;
        type: import("@/types/models").LearningTaskType;
        status: import("@/types/models").LearningTaskStatus;
        createdAt: string;
        updatedAt: string;
        quizSessionId: string | null;
        questionCount: number;
        error: string | null;
    }[], LearningTask[] | {
        id: string;
        type: import("@/types/models").LearningTaskType;
        status: import("@/types/models").LearningTaskStatus;
        createdAt: string;
        updatedAt: string;
        quizSessionId: string | null;
        questionCount: number;
        error: string | null;
    }[]>;
    mistakes: import("vue").Ref<{
        id: string;
        createdAt: string;
        updatedAt: string;
        type: import("@/types/models").QuizType;
        word: string;
        sentence: string;
        answer: string;
        ttsText?: string | undefined;
        audioUrl?: string | undefined;
        blanks?: {
            start: number;
            end: number;
            answer: string;
        }[] | undefined;
    }[], MistakeEntry[] | {
        id: string;
        createdAt: string;
        updatedAt: string;
        type: import("@/types/models").QuizType;
        word: string;
        sentence: string;
        answer: string;
        ttsText?: string | undefined;
        audioUrl?: string | undefined;
        blanks?: {
            start: number;
            end: number;
            answer: string;
        }[] | undefined;
    }[]>;
    tasksLoading: import("vue").Ref<boolean, boolean>;
    listeningItems: import("vue").Ref<{
        id: string;
        sentence: string;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        audioFile?: string | undefined;
    }[], ListeningEntry[] | {
        id: string;
        sentence: string;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        audioFile?: string | undefined;
    }[]>;
    listeningLoading: import("vue").Ref<boolean, boolean>;
    fetchVocabulary: () => Promise<void>;
    selectWord: (id: string) => Promise<void>;
    searchWord: (query: string) => Promise<void>;
    saveWord: () => Promise<{
        created: boolean;
        entry: VocabularyEntry;
    }>;
    updateNote: (note: string) => Promise<void>;
    sendChatMessage: (message: string) => Promise<string>;
    clearChatHistory: () => Promise<VocabularyEntry>;
    generateQuiz: () => Promise<{
        id: string;
        createdAt: string;
        questionIds: string[];
        questions: {
            id: string;
            type: import("@/types/models").QuizType;
            word: string;
            sentence: string;
            maskedSentence?: string | undefined;
            answer: string;
            answerVariants?: string[] | undefined;
            candidates?: string[] | undefined;
            ttsText?: string | undefined;
            audioUrl?: string | undefined;
            blanks?: {
                start: number;
                end: number;
                answer: string;
            }[] | undefined;
        }[];
        currentIndex: number;
        sourceType: import("@/types/models").QuizSourceType;
        answers: {
            questionId: string;
            response: string;
            isCorrect: boolean;
        }[];
        completed: boolean;
    }>;
    fetchTasks: () => Promise<void>;
    createVocabularyTask: () => Promise<LearningTask>;
    createListeningTask: () => Promise<LearningTask>;
    ensureWordAudio: (id: string) => Promise<string>;
    ensureListeningAudio: (id: string) => Promise<string>;
    startTask: (taskId: string) => Promise<string>;
    clearTask: (taskId: string) => Promise<void>;
    startMistakeReview: () => Promise<string>;
    fetchListening: () => Promise<void>;
    addListeningSentence: (sentence: string) => Promise<{
        created: boolean;
        entry: ListeningEntry;
    }>;
    deleteListeningSentence: (id: string) => Promise<void>;
    loadQuiz: (id: string) => Promise<void>;
    submitQuizAnswer: (questionId: string, response: string) => Promise<{
        session: QuizSession;
        vocabulary?: VocabularyEntry[];
        listening?: ListeningEntry[];
    }>;
}, "items" | "selectedId" | "searchResult" | "loading" | "searching" | "savingWord" | "quizSession" | "tasks" | "mistakes" | "tasksLoading" | "listeningItems" | "listeningLoading">, Pick<{
    items: import("vue").Ref<{
        id: string;
        text: string;
        type: import("@/types/models").WordType;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        note: string;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        audioFile?: string | undefined;
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
        }[];
    }[], VocabularyEntry[] | {
        id: string;
        text: string;
        type: import("@/types/models").WordType;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        note: string;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        audioFile?: string | undefined;
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
        }[];
    }[]>;
    selectedId: import("vue").Ref<string, string>;
    selectedWord: import("vue").ComputedRef<{
        id: string;
        text: string;
        type: import("@/types/models").WordType;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        note: string;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        audioFile?: string | undefined;
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
        }[];
    } | null>;
    searchResult: import("vue").Ref<{
        text: string;
        type: import("@/types/models").WordType;
        found: boolean;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        notFoundMessage?: string | undefined;
    } | null, SearchResult | {
        text: string;
        type: import("@/types/models").WordType;
        found: boolean;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        notFoundMessage?: string | undefined;
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    searching: import("vue").Ref<boolean, boolean>;
    savingWord: import("vue").Ref<boolean, boolean>;
    quizSession: import("vue").Ref<{
        id: string;
        createdAt: string;
        questionIds: string[];
        questions: {
            id: string;
            type: import("@/types/models").QuizType;
            word: string;
            sentence: string;
            maskedSentence?: string | undefined;
            answer: string;
            answerVariants?: string[] | undefined;
            candidates?: string[] | undefined;
            ttsText?: string | undefined;
            audioUrl?: string | undefined;
            blanks?: {
                start: number;
                end: number;
                answer: string;
            }[] | undefined;
        }[];
        currentIndex: number;
        sourceType: import("@/types/models").QuizSourceType;
        answers: {
            questionId: string;
            response: string;
            isCorrect: boolean;
        }[];
        completed: boolean;
    } | null, QuizSession | {
        id: string;
        createdAt: string;
        questionIds: string[];
        questions: {
            id: string;
            type: import("@/types/models").QuizType;
            word: string;
            sentence: string;
            maskedSentence?: string | undefined;
            answer: string;
            answerVariants?: string[] | undefined;
            candidates?: string[] | undefined;
            ttsText?: string | undefined;
            audioUrl?: string | undefined;
            blanks?: {
                start: number;
                end: number;
                answer: string;
            }[] | undefined;
        }[];
        currentIndex: number;
        sourceType: import("@/types/models").QuizSourceType;
        answers: {
            questionId: string;
            response: string;
            isCorrect: boolean;
        }[];
        completed: boolean;
    } | null>;
    tasks: import("vue").Ref<{
        id: string;
        type: import("@/types/models").LearningTaskType;
        status: import("@/types/models").LearningTaskStatus;
        createdAt: string;
        updatedAt: string;
        quizSessionId: string | null;
        questionCount: number;
        error: string | null;
    }[], LearningTask[] | {
        id: string;
        type: import("@/types/models").LearningTaskType;
        status: import("@/types/models").LearningTaskStatus;
        createdAt: string;
        updatedAt: string;
        quizSessionId: string | null;
        questionCount: number;
        error: string | null;
    }[]>;
    mistakes: import("vue").Ref<{
        id: string;
        createdAt: string;
        updatedAt: string;
        type: import("@/types/models").QuizType;
        word: string;
        sentence: string;
        answer: string;
        ttsText?: string | undefined;
        audioUrl?: string | undefined;
        blanks?: {
            start: number;
            end: number;
            answer: string;
        }[] | undefined;
    }[], MistakeEntry[] | {
        id: string;
        createdAt: string;
        updatedAt: string;
        type: import("@/types/models").QuizType;
        word: string;
        sentence: string;
        answer: string;
        ttsText?: string | undefined;
        audioUrl?: string | undefined;
        blanks?: {
            start: number;
            end: number;
            answer: string;
        }[] | undefined;
    }[]>;
    tasksLoading: import("vue").Ref<boolean, boolean>;
    listeningItems: import("vue").Ref<{
        id: string;
        sentence: string;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        audioFile?: string | undefined;
    }[], ListeningEntry[] | {
        id: string;
        sentence: string;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        audioFile?: string | undefined;
    }[]>;
    listeningLoading: import("vue").Ref<boolean, boolean>;
    fetchVocabulary: () => Promise<void>;
    selectWord: (id: string) => Promise<void>;
    searchWord: (query: string) => Promise<void>;
    saveWord: () => Promise<{
        created: boolean;
        entry: VocabularyEntry;
    }>;
    updateNote: (note: string) => Promise<void>;
    sendChatMessage: (message: string) => Promise<string>;
    clearChatHistory: () => Promise<VocabularyEntry>;
    generateQuiz: () => Promise<{
        id: string;
        createdAt: string;
        questionIds: string[];
        questions: {
            id: string;
            type: import("@/types/models").QuizType;
            word: string;
            sentence: string;
            maskedSentence?: string | undefined;
            answer: string;
            answerVariants?: string[] | undefined;
            candidates?: string[] | undefined;
            ttsText?: string | undefined;
            audioUrl?: string | undefined;
            blanks?: {
                start: number;
                end: number;
                answer: string;
            }[] | undefined;
        }[];
        currentIndex: number;
        sourceType: import("@/types/models").QuizSourceType;
        answers: {
            questionId: string;
            response: string;
            isCorrect: boolean;
        }[];
        completed: boolean;
    }>;
    fetchTasks: () => Promise<void>;
    createVocabularyTask: () => Promise<LearningTask>;
    createListeningTask: () => Promise<LearningTask>;
    ensureWordAudio: (id: string) => Promise<string>;
    ensureListeningAudio: (id: string) => Promise<string>;
    startTask: (taskId: string) => Promise<string>;
    clearTask: (taskId: string) => Promise<void>;
    startMistakeReview: () => Promise<string>;
    fetchListening: () => Promise<void>;
    addListeningSentence: (sentence: string) => Promise<{
        created: boolean;
        entry: ListeningEntry;
    }>;
    deleteListeningSentence: (id: string) => Promise<void>;
    loadQuiz: (id: string) => Promise<void>;
    submitQuizAnswer: (questionId: string, response: string) => Promise<{
        session: QuizSession;
        vocabulary?: VocabularyEntry[];
        listening?: ListeningEntry[];
    }>;
}, "selectedWord">, Pick<{
    items: import("vue").Ref<{
        id: string;
        text: string;
        type: import("@/types/models").WordType;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        note: string;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        audioFile?: string | undefined;
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
        }[];
    }[], VocabularyEntry[] | {
        id: string;
        text: string;
        type: import("@/types/models").WordType;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        note: string;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        audioFile?: string | undefined;
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
        }[];
    }[]>;
    selectedId: import("vue").Ref<string, string>;
    selectedWord: import("vue").ComputedRef<{
        id: string;
        text: string;
        type: import("@/types/models").WordType;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        note: string;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        audioFile?: string | undefined;
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
        }[];
    } | null>;
    searchResult: import("vue").Ref<{
        text: string;
        type: import("@/types/models").WordType;
        found: boolean;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        notFoundMessage?: string | undefined;
    } | null, SearchResult | {
        text: string;
        type: import("@/types/models").WordType;
        found: boolean;
        pronunciation: string;
        meanings: {
            partOfSpeech: string;
            englishMeaning: string;
            chineseMeaning: string;
            example: string;
            exampleTranslation: string;
        }[];
        derivatives: string[];
        ttsText: string;
        notFoundMessage?: string | undefined;
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    searching: import("vue").Ref<boolean, boolean>;
    savingWord: import("vue").Ref<boolean, boolean>;
    quizSession: import("vue").Ref<{
        id: string;
        createdAt: string;
        questionIds: string[];
        questions: {
            id: string;
            type: import("@/types/models").QuizType;
            word: string;
            sentence: string;
            maskedSentence?: string | undefined;
            answer: string;
            answerVariants?: string[] | undefined;
            candidates?: string[] | undefined;
            ttsText?: string | undefined;
            audioUrl?: string | undefined;
            blanks?: {
                start: number;
                end: number;
                answer: string;
            }[] | undefined;
        }[];
        currentIndex: number;
        sourceType: import("@/types/models").QuizSourceType;
        answers: {
            questionId: string;
            response: string;
            isCorrect: boolean;
        }[];
        completed: boolean;
    } | null, QuizSession | {
        id: string;
        createdAt: string;
        questionIds: string[];
        questions: {
            id: string;
            type: import("@/types/models").QuizType;
            word: string;
            sentence: string;
            maskedSentence?: string | undefined;
            answer: string;
            answerVariants?: string[] | undefined;
            candidates?: string[] | undefined;
            ttsText?: string | undefined;
            audioUrl?: string | undefined;
            blanks?: {
                start: number;
                end: number;
                answer: string;
            }[] | undefined;
        }[];
        currentIndex: number;
        sourceType: import("@/types/models").QuizSourceType;
        answers: {
            questionId: string;
            response: string;
            isCorrect: boolean;
        }[];
        completed: boolean;
    } | null>;
    tasks: import("vue").Ref<{
        id: string;
        type: import("@/types/models").LearningTaskType;
        status: import("@/types/models").LearningTaskStatus;
        createdAt: string;
        updatedAt: string;
        quizSessionId: string | null;
        questionCount: number;
        error: string | null;
    }[], LearningTask[] | {
        id: string;
        type: import("@/types/models").LearningTaskType;
        status: import("@/types/models").LearningTaskStatus;
        createdAt: string;
        updatedAt: string;
        quizSessionId: string | null;
        questionCount: number;
        error: string | null;
    }[]>;
    mistakes: import("vue").Ref<{
        id: string;
        createdAt: string;
        updatedAt: string;
        type: import("@/types/models").QuizType;
        word: string;
        sentence: string;
        answer: string;
        ttsText?: string | undefined;
        audioUrl?: string | undefined;
        blanks?: {
            start: number;
            end: number;
            answer: string;
        }[] | undefined;
    }[], MistakeEntry[] | {
        id: string;
        createdAt: string;
        updatedAt: string;
        type: import("@/types/models").QuizType;
        word: string;
        sentence: string;
        answer: string;
        ttsText?: string | undefined;
        audioUrl?: string | undefined;
        blanks?: {
            start: number;
            end: number;
            answer: string;
        }[] | undefined;
    }[]>;
    tasksLoading: import("vue").Ref<boolean, boolean>;
    listeningItems: import("vue").Ref<{
        id: string;
        sentence: string;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        audioFile?: string | undefined;
    }[], ListeningEntry[] | {
        id: string;
        sentence: string;
        familiarity: number;
        createdAt: string;
        updatedAt: string;
        audioFile?: string | undefined;
    }[]>;
    listeningLoading: import("vue").Ref<boolean, boolean>;
    fetchVocabulary: () => Promise<void>;
    selectWord: (id: string) => Promise<void>;
    searchWord: (query: string) => Promise<void>;
    saveWord: () => Promise<{
        created: boolean;
        entry: VocabularyEntry;
    }>;
    updateNote: (note: string) => Promise<void>;
    sendChatMessage: (message: string) => Promise<string>;
    clearChatHistory: () => Promise<VocabularyEntry>;
    generateQuiz: () => Promise<{
        id: string;
        createdAt: string;
        questionIds: string[];
        questions: {
            id: string;
            type: import("@/types/models").QuizType;
            word: string;
            sentence: string;
            maskedSentence?: string | undefined;
            answer: string;
            answerVariants?: string[] | undefined;
            candidates?: string[] | undefined;
            ttsText?: string | undefined;
            audioUrl?: string | undefined;
            blanks?: {
                start: number;
                end: number;
                answer: string;
            }[] | undefined;
        }[];
        currentIndex: number;
        sourceType: import("@/types/models").QuizSourceType;
        answers: {
            questionId: string;
            response: string;
            isCorrect: boolean;
        }[];
        completed: boolean;
    }>;
    fetchTasks: () => Promise<void>;
    createVocabularyTask: () => Promise<LearningTask>;
    createListeningTask: () => Promise<LearningTask>;
    ensureWordAudio: (id: string) => Promise<string>;
    ensureListeningAudio: (id: string) => Promise<string>;
    startTask: (taskId: string) => Promise<string>;
    clearTask: (taskId: string) => Promise<void>;
    startMistakeReview: () => Promise<string>;
    fetchListening: () => Promise<void>;
    addListeningSentence: (sentence: string) => Promise<{
        created: boolean;
        entry: ListeningEntry;
    }>;
    deleteListeningSentence: (id: string) => Promise<void>;
    loadQuiz: (id: string) => Promise<void>;
    submitQuizAnswer: (questionId: string, response: string) => Promise<{
        session: QuizSession;
        vocabulary?: VocabularyEntry[];
        listening?: ListeningEntry[];
    }>;
}, "fetchVocabulary" | "selectWord" | "searchWord" | "saveWord" | "updateNote" | "sendChatMessage" | "clearChatHistory" | "generateQuiz" | "fetchTasks" | "createVocabularyTask" | "createListeningTask" | "ensureWordAudio" | "ensureListeningAudio" | "startTask" | "clearTask" | "startMistakeReview" | "fetchListening" | "addListeningSentence" | "deleteListeningSentence" | "loadQuiz" | "submitQuizAnswer">>;
