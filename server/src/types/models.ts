export type WordType = 'word' | 'phrase';
export type QuizType = 'fill_blank' | 'listening';
export type LearningTaskType = 'vocabulary' | 'listening' | 'expression';
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
  /** Marked when familiarity exceeds the max: word is kept but never quizzed
   *  again and sorted to the end of the list. */
  known?: boolean;
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

export interface SettingsModelEntry {
  id: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  extraBody: string;
}

export interface SettingsModelCategory {
  entries: SettingsModelEntry[];
  /** Ordered ids of active entries — first in the array has the highest
   *  priority. Every model call tries them in this order and falls back to
   *  the next one when a call fails. */
  activeIds: string[];
}

export interface Settings {
  models: {
    language: SettingsModelCategory;
    audio: SettingsModelCategory;
    image: SettingsModelCategory;
  };
  /** When enabled, newly added vocabulary words are queued to generate
   *  images for their example sentences automatically. */
  autoImageGeneration?: boolean;
  /** Max question count per generated quiz, by category. Defaults to 10. */
  quizMaxQuestions?: {
    vocabulary: number;
    listening: number;
  };
  /** When enabled, a vocabulary quiz + a listening quiz (random topic) are
   *  auto-created every day at 06:00 local time. Expression is not covered yet. */
  autoDailyQuiz?: boolean;
  /** Play a short correct/incorrect cue when a quiz answer is submitted. */
  quizFeedbackSound?: boolean;
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
  imageUrl?: string;
  mistakeId?: string;
  blanks?: QuizBlank[];
}

export interface QuizBlank {
  start: number;
  end: number;
  answer: string;
}

export interface QuizDraftQuestion {
  type: QuizType;
  word: string;
  sentence: string;
  maskedSentence?: string;
  answer: string;
  answerVariants?: string[];
  candidates?: string[];
  ttsText?: string;
  imageUrl?: string;
  blanks?: QuizBlank[];
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
  /** When a listening task was generated from a specific group/topic. */
  groupId?: string;
  groupName?: string;
  scenario?: ScenarioData | null;
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
  imageUrl?: string;
  blanks?: QuizBlank[];
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

export interface ListeningGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListeningEntry {
  id: string;
  sentence: string;
  familiarity: number;
  /** Marked when familiarity exceeds the max: sentence is kept but never
   *  quizzed again and sorted to the end of the list. */
  known?: boolean;
  createdAt: string;
  updatedAt: string;
  audioFile?: string;
  note: string;
  chatHistory: ChatMessage[];
  groupId: string;
}

export interface SentenceImage {
  id: string;
  sentence: string;
  normalizedSentence: string;
  imageFile: string;
  createdAt: string;
  updatedAt: string;
}

export interface WritingKnowledgePoint {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  chatHistory: ChatMessage[];
}

export interface WritingTopic {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  knowledgePoints: WritingKnowledgePoint[];
}

export interface ScenarioObjective {
  id: string;
  description: string;
}

export interface ScenarioData {
  topicId: string;
  topicTitle: string;
  setting: string;
  userRole: string;
  assistantRole: string;
  objectives: ScenarioObjective[];
}

export interface ScenarioSummary {
  overallAssessment: string;
  objectiveResults: Array<{ objective: string; feedback: string }>;
  expressionSuggestions: string[];
  encouragement: string;
}

export interface TutorSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Number of stored messages — filled by the session list query. */
  messageCount: number;
  /** First line of the latest message, for the session list. */
  preview: string;
}

export type TutorMemoryKind = 'note' | 'preference' | 'goal' | 'progress';

export interface TutorMemory {
  id: string;
  kind: TutorMemoryKind;
  content: string;
  createdAt: string;
  updatedAt: string;
  /** Session that produced the memory (absent for manually added notes). */
  sessionId?: string;
}

/** Compact trace of one tool call, shown under the assistant reply and
 *  persisted so the transcript still explains what the agent did. */
export interface TutorToolTrace {
  name: string;
  label: string;
  ok: boolean;
  summary?: string;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  toolCalls?: TutorToolTrace[];
}

export interface PolishResult {
  index: number;
  original: string;
  polished: string;
  isPerfect: boolean;
  explanation: string;
}

export interface ReadingCategory {
  id: string;
  name: string;
  /** Display order; newly created categories append to the end. */
  position: number;
  createdAt: string;
  updatedAt: string;
  articleCount?: number;
}

/** One AI-segmented block of an article. `index` is the 1-based paragraph
 *  number the reader shows in the gutter and that marks refer to. */
export interface ReadingParagraph {
  index: number;
  text: string;
}

export type ReadingMarkKind = 'highlight' | 'underline';

export interface ReadingMark {
  id: string;
  articleId: string;
  kind: ReadingMarkKind;
  paragraphIndex: number;
  /** Character offsets inside `ReadingParagraph.text`. */
  startOffset: number;
  endOffset: number;
  /** Exact marked text, kept so the notes rail does not need the article. */
  text: string;
  /** Free-form sticky note attached to the mark. */
  note: string;
  createdAt: string;
  updatedAt: string;
}

/** A mark quoted into the chat composer; the model sees these as evidence. */
export interface ReadingCitation {
  markId: string;
  paragraphIndex: number;
  text: string;
  note?: string;
}

export interface ReadingChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  citations?: ReadingCitation[];
}

export interface ReadingArticle {
  id: string;
  categoryId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Original text the user pasted; kept so paragraphs can be re-segmented. */
  sourceText: string;
  paragraphs: ReadingParagraph[];
  chatHistory: ReadingChatMessage[];
  /** `ai` when the language model segmented the text, `fallback` otherwise. */
  segmentedBy: 'ai' | 'fallback';
  /** One-line English summary the model produced while segmenting. */
  summary?: string;
}
