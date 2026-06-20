import type { LearningTask, ListeningEntry, MistakeEntry, PolishResult, QuizSession, ScenarioData, ScenarioSummary, SearchResult, SettingsForm, VocabularyEntry, WritingKnowledgePoint, WritingTopic } from '@/types/models';
export declare const api: {
    login(token: string): Promise<{
        token: string;
    }>;
    getSettings(): Promise<SettingsForm>;
    saveSettings(payload: Pick<SettingsForm, "models">): Promise<SettingsForm>;
    testModelEntry(category: "language" | "audio" | "image", entryId: string): Promise<{
        ok: boolean;
        latencyMs: number;
        sample?: string;
        error?: string;
    }>;
    getVocabulary(): Promise<VocabularyEntry[]>;
    getListening(): Promise<ListeningEntry[]>;
    addListeningSentence(sentence: string): Promise<{
        created: boolean;
        entry: ListeningEntry;
    }>;
    deleteListeningSentence(id: string): Promise<{
        removed: boolean;
    }>;
    getWord(id: string): Promise<VocabularyEntry>;
    deleteWord(id: string): Promise<{
        removed: boolean;
    }>;
    searchWord(query: string): Promise<SearchResult>;
    saveWord(result: SearchResult): Promise<{
        created: boolean;
        entry: VocabularyEntry;
    }>;
    updateNote(id: string, note: string): Promise<VocabularyEntry>;
    ensureWordAudio(id: string): Promise<{
        audioUrl: string;
        audioFile: string;
    }>;
    ensureListeningAudio(id: string): Promise<{
        audioUrl: string;
        audioFile: string;
    }>;
    updateListeningNote(id: string, note: string): Promise<ListeningEntry>;
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
    generateQuiz(): Promise<QuizSession>;
    createVocabularyTask(): Promise<LearningTask>;
    createListeningTask(): Promise<LearningTask>;
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
    startMistakeReview(): Promise<{
        sessionId: string;
    }>;
    getQuiz(id: string): Promise<QuizSession>;
    submitQuizAnswer(id: string, questionId: string, response: string): Promise<{
        session: QuizSession;
        vocabulary?: VocabularyEntry[];
        listening?: ListeningEntry[];
    }>;
    getWritingTopics(): Promise<WritingTopic[]>;
    addWritingTopic(title: string): Promise<{
        created: boolean;
        topic: WritingTopic;
    }>;
    updateWritingTopicTitle(topicId: string, title: string): Promise<WritingTopic>;
    deleteWritingTopic(topicId: string): Promise<{
        removed: boolean;
    }>;
    addWritingKnowledgePoint(topicId: string, payload: {
        title: string;
        content: string;
    }): Promise<{
        topic: WritingTopic;
        point: WritingKnowledgePoint;
    }>;
    updateWritingKnowledgePoint(topicId: string, pointId: string, payload: {
        title: string;
        content: string;
    }): Promise<WritingTopic>;
    deleteWritingKnowledgePoint(topicId: string, pointId: string): Promise<WritingTopic>;
    streamWritingKnowledgePointChat(topicId: string, pointId: string, message: string, onDelta: (chunk: string) => void): Promise<string>;
    clearWritingKnowledgePointChat(topicId: string, pointId: string): Promise<{
        topic: WritingTopic;
        point: WritingKnowledgePoint;
    }>;
    createExpressionTask(topicId: string): Promise<LearningTask>;
    streamScenarioChat(scenario: ScenarioData, history: Array<{
        role: "user" | "assistant";
        content: string;
    }>, message: string, onDelta: (chunk: string) => void): Promise<string>;
    checkObjectives(scenario: ScenarioData, history: Array<{
        role: "user" | "assistant";
        content: string;
    }>): Promise<{
        completedObjectiveIds: string[];
    }>;
    summarizeScenario(scenario: ScenarioData, history: Array<{
        role: "user" | "assistant";
        content: string;
    }>): Promise<ScenarioSummary>;
    polishUserMessages(scenario: ScenarioData, messages: string[]): Promise<{
        results: PolishResult[];
    }>;
};
