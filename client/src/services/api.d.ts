import type { LearningTask, ListeningEntry, MistakeEntry, QuizSession, SearchResult, SettingsForm, VocabularyEntry } from '@/types/models';
export declare const api: {
    login(token: string): Promise<{
        token: string;
    }>;
    getSettings(): Promise<SettingsForm>;
    saveSettings(payload: Omit<SettingsForm, "updatedAt">): Promise<SettingsForm>;
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
    searchWord(query: string): Promise<SearchResult>;
    saveWord(result: SearchResult): Promise<{
        created: boolean;
        entry: VocabularyEntry;
    }>;
    updateNote(id: string, note: string): Promise<VocabularyEntry>;
    chatWord(id: string, message: string): Promise<{
        reply: string;
        entry: VocabularyEntry | null;
    }>;
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
    startMistakeReview(): Promise<{
        sessionId: string;
    }>;
    getQuiz(id: string): Promise<QuizSession>;
    submitQuizAnswer(id: string, questionId: string, response: string): Promise<{
        session: QuizSession;
        vocabulary?: VocabularyEntry[];
        listening?: ListeningEntry[];
    }>;
};
