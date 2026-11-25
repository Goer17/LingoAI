import type { LearningTask, ListeningEntry, ListeningGroup, MistakeEntry, QuizSession, ReadingArticle, ReadingArticleBundle, ReadingArticleSummary, ReadingCategory, ReadingChatMessage, ReadingMark, ReadingMarkKind, SearchResult, SettingsForm, TutorMessage, TutorSession, TutorSessionDetail, VocabularyEntry, WritingTopic } from '@/types/models';
export declare const api: {
    login(token: string): Promise<{
        token: string;
    }>;
    getSettings(): Promise<SettingsForm>;
    saveSettings(payload: Pick<SettingsForm, "models" | "autoImageGeneration" | "quizMaxQuestions" | "autoDailyQuiz" | "quizFeedbackSound">): Promise<SettingsForm>;
    testModelEntry(category: "language" | "audio" | "image", entryId: string): Promise<{
        ok: boolean;
        latencyMs: number;
        sample?: string;
        error?: string;
    }>;
    getVocabulary(): Promise<VocabularyEntry[]>;
    getListening(groupId?: string): Promise<ListeningEntry[]>;
    addListeningSentence(sentence: string, groupId?: string): Promise<{
        created: boolean;
        entry: ListeningEntry;
    }>;
    getListeningGroups(): Promise<ListeningGroup[]>;
    createListeningGroup(name: string): Promise<{
        created: boolean;
        group: ListeningGroup;
    }>;
    deleteListeningGroup(id: string): Promise<{
        removed: boolean;
    }>;
    deleteListeningSentence(id: string): Promise<{
        removed: boolean;
    }>;
    getWord(id: string): Promise<VocabularyEntry>;
    deleteWord(id: string): Promise<{
        removed: boolean;
    }>;
    searchWord(query: string): Promise<SearchResult>;
    hasCommonAudio(word: string): Promise<{
        hasCommon: boolean;
        audioUrl: string | null;
    }>;
    suggestWords(query: string, limit?: number): Promise<{
        suggestions: string[];
        query: string;
    }>;
    saveWord(result: SearchResult): Promise<{
        created: boolean;
        entry: VocabularyEntry;
        pendingImages: string[];
    }>;
    updateNote(id: string, note: string): Promise<VocabularyEntry>;
    ensureWordAudio(id: string): Promise<{
        audioUrl: string;
        audioFile: string;
    }>;
    regenerateWordAudio(id: string): Promise<{
        audioUrl: string;
        audioFile: string;
    }>;
    ensureListeningAudio(id: string): Promise<{
        audioUrl: string;
        audioFile: string;
    }>;
    regenerateListeningAudio(id: string): Promise<{
        audioUrl: string;
        audioFile: string;
    }>;
    updateListeningNote(id: string, note: string): Promise<ListeningEntry>;
    updateListeningSentence(id: string, sentence: string): Promise<ListeningEntry>;
    chatListening(id: string, message: string): Promise<{
        reply: string;
        entry: ListeningEntry | null;
    }>;
    streamListeningChat(id: string, message: string, onDelta: (chunk: string) => void): Promise<string>;
    clearListeningChat(id: string): Promise<ListeningEntry>;
    chatWord(id: string, message: string): Promise<{
        reply: string;
        entry: VocabularyEntry | null;
    }>;
    streamWordChat(id: string, message: string, onDelta: (chunk: string) => void): Promise<string>;
    clearWordChat(id: string): Promise<VocabularyEntry>;
    generateAudio(input: string): Promise<{
        audioUrl: string;
    }>;
    regenerateAudio(input: string): Promise<{
        audioUrl: string;
    }>;
    checkSentenceImage(sentence: string): Promise<{
        imageUrl: string | null;
    }>;
    generateSentenceImage(sentence: string, word?: string, force?: boolean): Promise<{
        imageUrl: string;
        cached: boolean;
        source: "exact" | "fuzzy" | "generated";
        matchedSentence?: string;
    }>;
    generateQuiz(): Promise<QuizSession>;
    createVocabularyTask(): Promise<LearningTask>;
    createListeningTask(): Promise<LearningTask>;
    createListeningTaskForGroup(groupId: string): Promise<LearningTask>;
    getTasks(): Promise<{
        tasks: LearningTask[];
        mistakes: MistakeEntry[];
    }>;
    startTask(taskId: string): Promise<{
        sessionId: string;
    }>;
    clearTask(taskId: string): Promise<{
        removed: boolean;
    }>;
    retryTask(taskId: string): Promise<LearningTask>;
    startMistakeReview(): Promise<{
        sessionId: string;
    }>;
    getQuiz(id: string): Promise<QuizSession>;
    submitQuizAnswer(id: string, questionId: string, response: string): Promise<{
        session: QuizSession;
        vocabulary?: VocabularyEntry[];
        listening?: ListeningEntry[];
    }>;
    appealQuizAnswer(id: string, questionId: string): Promise<{
        accepted: boolean;
        reason: string;
        session: QuizSession;
    }>;
    regenerateQuizQuestionImage(id: string, questionId: string): Promise<{
        imageUrl: string;
        session: QuizSession;
    }>;
    streamQuizQuestionChat(payload: {
        messages: Array<{
            role: "user" | "assistant";
            content: string;
        }>;
        word: string;
        sentence: string;
        type: string;
        answer: string;
        userResponse: string;
        isCorrect: boolean;
        newMessage: string;
    }, onDelta: (chunk: string) => void): Promise<string>;
    getWritingTopics(): Promise<WritingTopic[]>;
    addWritingTopic(title: string, kind?: "grammar" | "topic"): Promise<{
        created: boolean;
        topic: WritingTopic;
    }>;
    updateWritingTopicTitle(topicId: string, title: string): Promise<WritingTopic>;
    saveWritingTopicNote(topicId: string, note: string): Promise<WritingTopic>;
    deleteWritingTopic(topicId: string): Promise<{
        removed: boolean;
    }>;
    listTutorSessions(): Promise<TutorSession[]>;
    createTutorSession(title?: string): Promise<TutorSession>;
    getTutorSession(id: string): Promise<TutorSessionDetail>;
    renameTutorSession(id: string, title: string): Promise<TutorSession>;
    deleteTutorSession(id: string): Promise<{
        removed: boolean;
    }>;
    listReadingCategories(): Promise<ReadingCategory[]>;
    createReadingCategory(name: string): Promise<ReadingCategory>;
    deleteReadingCategory(id: string): Promise<{
        removed: boolean;
    }>;
    listReadingArticles(categoryId?: string): Promise<ReadingArticleSummary[]>;
    createReadingArticle(payload: {
        categoryId?: string;
        title: string;
        content: string;
    }): Promise<ReadingArticle>;
    getReadingArticle(id: string): Promise<ReadingArticleBundle>;
    resegmentReadingArticle(id: string): Promise<ReadingArticle>;
    deleteReadingArticle(id: string): Promise<{
        removed: boolean;
    }>;
    addReadingMark(articleId: string, payload: {
        kind: ReadingMarkKind;
        paragraphIndex: number;
        startOffset: number;
        endOffset: number;
    }): Promise<ReadingMark>;
    updateReadingMarkNote(id: string, note: string): Promise<ReadingMark>;
    deleteReadingMark(id: string): Promise<{
        removed: boolean;
    }>;
    clearReadingChat(articleId: string): Promise<{
        id: string;
        updatedAt: string;
        chatHistory: ReadingChatMessage[];
    }>;
    streamReadingChat(articleId: string, message: string, citations: string[], handlers: {
        onDelta: (chunk: string) => void;
        onDone?: (payload: {
            chatHistory: ReadingChatMessage[];
            updatedAt: string;
        }) => void;
    }): Promise<void>;
    streamTutorChat(sessionId: string, message: string, handlers: {
        onDelta: (chunk: string) => void;
        onThinking?: (event: {
            status: "start" | "done" | "delta";
            content?: string;
        }) => void;
        onTool?: (event: {
            status: "start" | "done";
            name: string;
            label: string;
            ok?: boolean;
            summary?: string;
        }) => void;
    }): Promise<{
        message: TutorMessage;
        session: TutorSession;
    }>;
};
