import type { ChatMessage } from '../types/models.js';

export interface QuizQuestionContext {
  word: string;
  sentence: string;
  type: 'fill_blank' | 'listening';
  answer: string;
  userResponse: string;
  isCorrect: boolean;
}

export function createQuizQuestionChatPrompt(
  context: QuizQuestionContext,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  question: string,
) {
  const historyText = history
    .slice(-6)
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join('\n');

  const outcomeText = context.isCorrect
    ? 'The user answered CORRECTLY.'
    : `The user answered INCORRECTLY. They wrote "${context.userResponse}" but the correct answer is "${context.answer}".`;

  return [
    'You are an English tutor helping the user understand a quiz question they just attempted.',
    'Keep every answer short: usually 2-4 sentences, and prefer under 90 words unless the user explicitly asks for depth.',
    'Answer in concise English by default, but include short Chinese support when it helps clarify meaning or nuance.',
    'Focus on usage, collocations, pitfalls, tone, and comparisons with similar expressions.',
    'Use compact Markdown for structure when useful (short bullets, inline code, bold emphasis).',
    'Do not add long preambles or repeated explanations.',
    `Target word/phrase: ${context.word}`,
    `Original sentence: ${context.sentence}`,
    `Question type: ${context.type === 'fill_blank' ? 'Fill in the blank' : 'Listening comprehension'}`,
    `Correct answer: ${context.answer}`,
    outcomeText,
    historyText ? `Recent conversation:\n${historyText}` : 'Recent conversation: none',
    `User question: ${question}`,
  ].join('\n\n');
}
