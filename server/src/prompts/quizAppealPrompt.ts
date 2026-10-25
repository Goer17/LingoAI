export interface QuizAppealContext {
  word: string;
  sentence: string;
  type: 'fill_blank' | 'listening';
  answer: string;
  answerVariants?: string[];
  userResponse: string;
  hasImage: boolean;
}

/**
 * Ask the language model to re-judge a single quiz answer after the learner
 * appealed it. The model must be generous about defensible alternatives
 * (synonyms, articles, minor spelling slips, ambiguous illustrations) but
 * must still reject answers that change the meaning of the sentence.
 */
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
    'Decide whether the learner\'s answer should be accepted as correct in this exact sentence.',
    'Be fair and generous: accept defensible alternatives such as synonyms that fit the sentence, optional articles, singular/plural where the sentence allows it, contractions, and small typos that clearly represent the intended answer.',
    'Do not accept answers that change the meaning of the sentence, use the wrong part of speech, or are unrelated to the target word.',
    'If the question includes an illustration and the illustration is genuinely ambiguous, lean towards accepting a reasonable answer.',
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
