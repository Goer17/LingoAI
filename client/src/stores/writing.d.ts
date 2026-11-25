import type { WritingTopic, WritingTopicKind } from '@/types/models';
/**
 * Expression notes: one Markdown note per title, split into Grammar and Topics.
 * Kept separate from the vocabulary store so the two features never share state.
 */
export declare const useWritingStore: import("pinia").StoreDefinition<"writing", Pick<{
    topics: import("vue").Ref<{
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    }[], WritingTopic[] | {
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    kind: import("vue").Ref<WritingTopicKind, WritingTopicKind>;
    selectedId: import("vue").Ref<string, string>;
    items: import("vue").ComputedRef<{
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    }[]>;
    selected: import("vue").ComputedRef<{
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    } | null>;
    fetchTopics: () => Promise<void>;
    addTitle: (title: string) => Promise<{
        created: boolean;
        topic: WritingTopic;
    }>;
    rename: (id: string, title: string) => Promise<WritingTopic>;
    saveNote: (id: string, note: string) => Promise<WritingTopic>;
    remove: (id: string) => Promise<void>;
    select: (id: string) => void;
    setKind: (next: WritingTopicKind) => void;
}, "kind" | "topics" | "loading" | "selectedId">, Pick<{
    topics: import("vue").Ref<{
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    }[], WritingTopic[] | {
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    kind: import("vue").Ref<WritingTopicKind, WritingTopicKind>;
    selectedId: import("vue").Ref<string, string>;
    items: import("vue").ComputedRef<{
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    }[]>;
    selected: import("vue").ComputedRef<{
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    } | null>;
    fetchTopics: () => Promise<void>;
    addTitle: (title: string) => Promise<{
        created: boolean;
        topic: WritingTopic;
    }>;
    rename: (id: string, title: string) => Promise<WritingTopic>;
    saveNote: (id: string, note: string) => Promise<WritingTopic>;
    remove: (id: string) => Promise<void>;
    select: (id: string) => void;
    setKind: (next: WritingTopicKind) => void;
}, "items" | "selected">, Pick<{
    topics: import("vue").Ref<{
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    }[], WritingTopic[] | {
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    kind: import("vue").Ref<WritingTopicKind, WritingTopicKind>;
    selectedId: import("vue").Ref<string, string>;
    items: import("vue").ComputedRef<{
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    }[]>;
    selected: import("vue").ComputedRef<{
        id: string;
        title: string;
        kind: WritingTopicKind;
        note: string;
        createdAt: string;
        updatedAt: string;
        knowledgePoints: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            chatHistory: {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }[];
        }[];
    } | null>;
    fetchTopics: () => Promise<void>;
    addTitle: (title: string) => Promise<{
        created: boolean;
        topic: WritingTopic;
    }>;
    rename: (id: string, title: string) => Promise<WritingTopic>;
    saveNote: (id: string, note: string) => Promise<WritingTopic>;
    remove: (id: string) => Promise<void>;
    select: (id: string) => void;
    setKind: (next: WritingTopicKind) => void;
}, "fetchTopics" | "addTitle" | "rename" | "saveNote" | "remove" | "select" | "setKind">>;
