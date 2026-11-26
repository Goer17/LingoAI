/**
 * Ask the language model to re-judge a single quiz answer after the learner
 * appealed it. The rule is deliberately strict: accept only a spelling
 * difference in one word; reject synonyms, paraphrases and grammar changes.
 */
export interface QuizAppealContext {
  word: string;
  sentence: string;
  type: 'fill_blank' | 'listening';
  answer: string;
  answerVariants?: string[];
  userResponse: string;
  hasImage: boolean;
}

export function createQuizAppealPrompt(context: QuizAppealContext) {
  const variants = context.answerVariants?.length
    ? context.answerVariants.join(' / ')
    : 'none';
  const typeText = context.type === 'fill_blank' ? 'Fill in the blank' : 'Listening comprehension';
  const imageText = context.hasImage
    ? 'The question shows an illustration that the learner used as context.'
    : 'The question has no illustration.';

  return [
    'You are an experienced English teacher re-judging a vocabulary quiz answer after the learner appealed the automatic grade.',
    'Accept the learner\'s answer ONLY when it is the expected answer with a spelling difference in ONE word — for example, a typo or a valid alternate spelling of that same word.',
    'If the expected answer contains multiple words, all other words must match exactly; only one word may differ in spelling.',
    'Reject every other difference, including synonyms, different words, missing or extra words, changes in tense, number, articles, prepositions, part of speech, contractions, punctuation, or paraphrases.',
    'Do not use the illustration or general plausibility to accept a different word. When in doubt, reject.',
    'Return a JSON object with exactly two fields: "acceptable" (boolean) and "reason" (a short explanation in English, 2-4 sentences).',
    '',
    `Question type: ${typeText}`,
    `Target word/phrase: ${context.word}`,
    `Sentence: ${context.sentence}`,
    `Expected answer: ${context.answer}`,
    `Accepted variants: ${variants}`,
    `Learner answer: ${context.userResponse}`,
    imageText,
  ].join('\n');
}
