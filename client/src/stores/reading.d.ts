import type { ReadingArticle, ReadingArticleSummary, ReadingCategory, ReadingCitation, ReadingMark, ReadingMarkKind } from '@/types/models';
export declare const useReadingStore: import("pinia").StoreDefinition<"reading", Pick<{
    categories: import("vue").Ref<{
        id: string;
        name: string;
        position: number;
        createdAt: string;
        updatedAt: string;
        articleCount?: number | undefined;
    }[], ReadingCategory[] | {
        id: string;
        name: string;
        position: number;
        createdAt: string;
        updatedAt: string;
        articleCount?: number | undefined;
    }[]>;
    articles: import("vue").Ref<{
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        paragraphCount: number;
        markCount: number;
        summary?: string | undefined;
    }[], ReadingArticleSummary[] | {
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        paragraphCount: number;
        markCount: number;
        summary?: string | undefined;
    }[]>;
    activeCategoryId: import("vue").Ref<string, string>;
    article: import("vue").Ref<{
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        sourceText: string;
        paragraphs: {
            index: number;
            text: string;
        }[];
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
            citations?: {
                markId: string;
                paragraphIndex: number;
                text: string;
                note?: string | undefined;
            }[] | undefined;
        }[];
        segmentedBy: "ai" | "fallback";
        summary?: string | undefined;
    } | null, ReadingArticle | {
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        sourceText: string;
        paragraphs: {
            index: number;
            text: string;
        }[];
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
            citations?: {
                markId: string;
                paragraphIndex: number;
                text: string;
                note?: string | undefined;
            }[] | undefined;
        }[];
        segmentedBy: "ai" | "fallback";
        summary?: string | undefined;
    } | null>;
    marks: import("vue").Ref<{
        id: string;
        articleId: string;
        kind: ReadingMarkKind;
        paragraphIndex: number;
        startOffset: number;
        endOffset: number;
        text: string;
        note: string;
        createdAt: string;
        updatedAt: string;
    }[], ReadingMark[] | {
        id: string;
        articleId: string;
        kind: ReadingMarkKind;
        paragraphIndex: number;
        startOffset: number;
        endOffset: number;
        text: string;
        note: string;
        createdAt: string;
        updatedAt: string;
    }[]>;
    marksByParagraph: import("vue").ComputedRef<Map<number, ReadingMark[]>>;
    notesCount: import("vue").ComputedRef<number>;
    loadingCategories: import("vue").Ref<boolean, boolean>;
    loadingArticles: import("vue").Ref<boolean, boolean>;
    loadingArticle: import("vue").Ref<boolean, boolean>;
    creatingArticle: import("vue").Ref<boolean, boolean>;
    resegmenting: import("vue").Ref<boolean, boolean>;
    streaming: import("vue").Ref<boolean, boolean>;
    streamText: import("vue").Ref<string, string>;
    error: import("vue").Ref<string, string>;
    notice: import("vue").Ref<string, string>;
    loadCategories: () => Promise<void>;
    loadArticles: () => Promise<void>;
    selectCategory: (categoryId: string) => Promise<void>;
    createCategory: (name: string) => Promise<ReadingCategory>;
    deleteCategory: (categoryId: string) => Promise<void>;
    createArticle: (payload: {
        categoryId: string;
        title: string;
        content: string;
    }) => Promise<ReadingArticle>;
    selectArticle: (articleId: string) => Promise<void>;
    deleteArticle: (articleId: string) => Promise<void>;
    resegmentArticle: () => Promise<void>;
    addMark: (input: {
        kind: ReadingMarkKind;
        paragraphIndex: number;
        startOffset: number;
        endOffset: number;
    }) => Promise<ReadingMark | null>;
    saveNote: (markId: string, note: string) => Promise<ReadingMark>;
    deleteMark: (markId: string) => Promise<void>;
    clearChat: () => Promise<void>;
    sendChat: (input: {
        message: string;
        citations: ReadingCitation[];
    }) => Promise<void>;
    setError: (message: string) => void;
    setNotice: (message: string) => void;
    clearMessages: () => void;
}, "categories" | "articles" | "activeCategoryId" | "article" | "marks" | "loadingCategories" | "loadingArticles" | "loadingArticle" | "creatingArticle" | "resegmenting" | "streaming" | "streamText" | "error" | "notice">, Pick<{
    categories: import("vue").Ref<{
        id: string;
        name: string;
        position: number;
        createdAt: string;
        updatedAt: string;
        articleCount?: number | undefined;
    }[], ReadingCategory[] | {
        id: string;
        name: string;
        position: number;
        createdAt: string;
        updatedAt: string;
        articleCount?: number | undefined;
    }[]>;
    articles: import("vue").Ref<{
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        paragraphCount: number;
        markCount: number;
        summary?: string | undefined;
    }[], ReadingArticleSummary[] | {
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        paragraphCount: number;
        markCount: number;
        summary?: string | undefined;
    }[]>;
    activeCategoryId: import("vue").Ref<string, string>;
    article: import("vue").Ref<{
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        sourceText: string;
        paragraphs: {
            index: number;
            text: string;
        }[];
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
            citations?: {
                markId: string;
                paragraphIndex: number;
                text: string;
                note?: string | undefined;
            }[] | undefined;
        }[];
        segmentedBy: "ai" | "fallback";
        summary?: string | undefined;
    } | null, ReadingArticle | {
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        sourceText: string;
        paragraphs: {
            index: number;
            text: string;
        }[];
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
            citations?: {
                markId: string;
                paragraphIndex: number;
                text: string;
                note?: string | undefined;
            }[] | undefined;
        }[];
        segmentedBy: "ai" | "fallback";
        summary?: string | undefined;
    } | null>;
    marks: import("vue").Ref<{
        id: string;
        articleId: string;
        kind: ReadingMarkKind;
        paragraphIndex: number;
        startOffset: number;
        endOffset: number;
        text: string;
        note: string;
        createdAt: string;
        updatedAt: string;
    }[], ReadingMark[] | {
        id: string;
        articleId: string;
        kind: ReadingMarkKind;
        paragraphIndex: number;
        startOffset: number;
        endOffset: number;
        text: string;
        note: string;
        createdAt: string;
        updatedAt: string;
    }[]>;
    marksByParagraph: import("vue").ComputedRef<Map<number, ReadingMark[]>>;
    notesCount: import("vue").ComputedRef<number>;
    loadingCategories: import("vue").Ref<boolean, boolean>;
    loadingArticles: import("vue").Ref<boolean, boolean>;
    loadingArticle: import("vue").Ref<boolean, boolean>;
    creatingArticle: import("vue").Ref<boolean, boolean>;
    resegmenting: import("vue").Ref<boolean, boolean>;
    streaming: import("vue").Ref<boolean, boolean>;
    streamText: import("vue").Ref<string, string>;
    error: import("vue").Ref<string, string>;
    notice: import("vue").Ref<string, string>;
    loadCategories: () => Promise<void>;
    loadArticles: () => Promise<void>;
    selectCategory: (categoryId: string) => Promise<void>;
    createCategory: (name: string) => Promise<ReadingCategory>;
    deleteCategory: (categoryId: string) => Promise<void>;
    createArticle: (payload: {
        categoryId: string;
        title: string;
        content: string;
    }) => Promise<ReadingArticle>;
    selectArticle: (articleId: string) => Promise<void>;
    deleteArticle: (articleId: string) => Promise<void>;
    resegmentArticle: () => Promise<void>;
    addMark: (input: {
        kind: ReadingMarkKind;
        paragraphIndex: number;
        startOffset: number;
        endOffset: number;
    }) => Promise<ReadingMark | null>;
    saveNote: (markId: string, note: string) => Promise<ReadingMark>;
    deleteMark: (markId: string) => Promise<void>;
    clearChat: () => Promise<void>;
    sendChat: (input: {
        message: string;
        citations: ReadingCitation[];
    }) => Promise<void>;
    setError: (message: string) => void;
    setNotice: (message: string) => void;
    clearMessages: () => void;
}, "marksByParagraph" | "notesCount">, Pick<{
    categories: import("vue").Ref<{
        id: string;
        name: string;
        position: number;
        createdAt: string;
        updatedAt: string;
        articleCount?: number | undefined;
    }[], ReadingCategory[] | {
        id: string;
        name: string;
        position: number;
        createdAt: string;
        updatedAt: string;
        articleCount?: number | undefined;
    }[]>;
    articles: import("vue").Ref<{
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        paragraphCount: number;
        markCount: number;
        summary?: string | undefined;
    }[], ReadingArticleSummary[] | {
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        paragraphCount: number;
        markCount: number;
        summary?: string | undefined;
    }[]>;
    activeCategoryId: import("vue").Ref<string, string>;
    article: import("vue").Ref<{
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        sourceText: string;
        paragraphs: {
            index: number;
            text: string;
        }[];
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
            citations?: {
                markId: string;
                paragraphIndex: number;
                text: string;
                note?: string | undefined;
            }[] | undefined;
        }[];
        segmentedBy: "ai" | "fallback";
        summary?: string | undefined;
    } | null, ReadingArticle | {
        id: string;
        categoryId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        sourceText: string;
        paragraphs: {
            index: number;
            text: string;
        }[];
        chatHistory: {
            id: string;
            role: "user" | "assistant";
            content: string;
            createdAt: string;
            citations?: {
                markId: string;
                paragraphIndex: number;
                text: string;
                note?: string | undefined;
            }[] | undefined;
        }[];
        segmentedBy: "ai" | "fallback";
        summary?: string | undefined;
    } | null>;
    marks: import("vue").Ref<{
        id: string;
        articleId: string;
        kind: ReadingMarkKind;
        paragraphIndex: number;
        startOffset: number;
        endOffset: number;
        text: string;
        note: string;
        createdAt: string;
        updatedAt: string;
    }[], ReadingMark[] | {
        id: string;
        articleId: string;
        kind: ReadingMarkKind;
        paragraphIndex: number;
        startOffset: number;
        endOffset: number;
        text: string;
        note: string;
        createdAt: string;
        updatedAt: string;
    }[]>;
    marksByParagraph: import("vue").ComputedRef<Map<number, ReadingMark[]>>;
    notesCount: import("vue").ComputedRef<number>;
    loadingCategories: import("vue").Ref<boolean, boolean>;
    loadingArticles: import("vue").Ref<boolean, boolean>;
    loadingArticle: import("vue").Ref<boolean, boolean>;
    creatingArticle: import("vue").Ref<boolean, boolean>;
    resegmenting: import("vue").Ref<boolean, boolean>;
    streaming: import("vue").Ref<boolean, boolean>;
    streamText: import("vue").Ref<string, string>;
    error: import("vue").Ref<string, string>;
    notice: import("vue").Ref<string, string>;
    loadCategories: () => Promise<void>;
    loadArticles: () => Promise<void>;
    selectCategory: (categoryId: string) => Promise<void>;
    createCategory: (name: string) => Promise<ReadingCategory>;
    deleteCategory: (categoryId: string) => Promise<void>;
    createArticle: (payload: {
        categoryId: string;
        title: string;
        content: string;
    }) => Promise<ReadingArticle>;
    selectArticle: (articleId: string) => Promise<void>;
    deleteArticle: (articleId: string) => Promise<void>;
    resegmentArticle: () => Promise<void>;
    addMark: (input: {
        kind: ReadingMarkKind;
        paragraphIndex: number;
        startOffset: number;
        endOffset: number;
    }) => Promise<ReadingMark | null>;
    saveNote: (markId: string, note: string) => Promise<ReadingMark>;
    deleteMark: (markId: string) => Promise<void>;
    clearChat: () => Promise<void>;
    sendChat: (input: {
        message: string;
        citations: ReadingCitation[];
    }) => Promise<void>;
    setError: (message: string) => void;
    setNotice: (message: string) => void;
    clearMessages: () => void;
}, "loadCategories" | "loadArticles" | "selectCategory" | "createCategory" | "deleteCategory" | "createArticle" | "selectArticle" | "deleteArticle" | "resegmentArticle" | "addMark" | "saveNote" | "deleteMark" | "clearChat" | "sendChat" | "setError" | "setNotice" | "clearMessages">>;
