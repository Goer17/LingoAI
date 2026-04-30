export type WordType = 'word' | 'phrase';
export type QuizType = 'fill_blank' | 'listening';
export type LearningTaskType = 'vocabulary' | 'listening';
export type LearningTaskStatus = 'pending' | 'ready' | 'failed';
export type QuizSourceType = 'vocabulary_task' | 'listening_task' | 'mistake_review';

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
  audioFile?: string;
  chatHistory: ChatMessage[];
}

export interface SearchResult {
  text: string;
  type: WordType;
  found: boolean;
  pronunciation: string;
  meanings: Meaning[];
  derivatives: string[];
  ttsText: string;
  notFoundMessage?: string;
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
  maskedSentence?: string;
  answer: string;
  answerVariants?: string[];
  candidates?: string[];
  ttsText?: string;
  audioUrl?: string;
  blanks?: QuizBlank[];
}

export interface QuizBlank {
  start: number;
  end: number;
  answer: string;
}

export interface QuizSession {
  id: string;
  createdAt: string;
  questionIds: string[];
  questions: QuizQuestion[];
  currentIndex: number;
  sourceType: QuizSourceType;
  answers: Array<{
    questionId: string;
    response: string;
    isCorrect: boolean;
  }>;
  completed: boolean;
}

export interface LearningTask {
  id: string;
  type: LearningTaskType;
  status: LearningTaskStatus;
  createdAt: string;
  updatedAt: string;
  quizSessionId: string | null;
  questionCount: number;
  error: string | null;
}

export interface MistakeEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: QuizType;
  word: string;
  sentence: string;
  answer: string;
  ttsText?: string;
  audioUrl?: string;
  blanks?: QuizBlank[];
}

export interface ListeningEntry {
  id: string;
  sentence: string;
  familiarity: number;
  createdAt: string;
  updatedAt: string;
  audioFile?: string;
}
