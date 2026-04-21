export type WordType = 'word' | 'phrase';
export type QuizType = 'fill_blank' | 'listening';
export interface Meaning {
    partOfSpeech: string;
    englishMeaning: string;
    chineseMeaning: string;
    example: string;
    exampleTranslation: string;
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}
export interface VocabularyEntry {
    id: string;
    text: string;
    type: WordType;
    familiarity: number;
    createdAt: string;
    updatedAt: string;
    note: string;
    pronunciation: string;
    meanings: Meaning[];
    derivatives: string[];
    ttsText: string;
    chatHistory: ChatMessage[];
}
export interface SearchResult {
    text: string;
    type: WordType;
    pronunciation: string;
    meanings: Meaning[];
    derivatives: string[];
    ttsText: string;
}
export interface SettingsForm {
    baseUrl: string;
    apiKey: string;
    languageModel: string;
    audioModel: string;
    updatedAt: string | null;
}
export interface QuizQuestion {
    id: string;
    type: QuizType;
    word: string;
    sentence: string;
    answer: string;
    ttsText?: string;
    audioUrl?: string;
}
export interface QuizSession {
    id: string;
    createdAt: string;
    questionIds: string[];
    questions: QuizQuestion[];
    currentIndex: number;
    answers: Array<{
        questionId: string;
        response: string;
        isCorrect: boolean;
    }>;
    completed: boolean;
}
