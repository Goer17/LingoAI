export function createRepairFillBlankPrompt(payload: {
  word: string;
  sentence: string;
  answer: string;
  attempt: number;
  maxRetries: number;
}) {
  return [
    'You are fixing a fill-in-the-blank English quiz item.',
    'Return only valid JSON with no markdown and no explanation.',
    'Create exactly one blank in the sentence using underscores.',
    'Rules:',
    '1) maskedSentence must contain exactly one underscore run like ______ (at least 6 underscores).',
    '2) answer must be the exact hidden text from the original sentence (surface form as it appears in the sentence).',
    '3) maskedSentence must not contain the answer text.',
    '4) Keep punctuation and wording natural.',
    'JSON schema:',
    '{"maskedSentence":"...______...","answer":"..."}',
    `Attempt: ${payload.attempt}/${payload.maxRetries}`,
    `Target word or phrase: ${payload.word}`,
    `Original sentence: ${payload.sentence}`,
    `Original proposed answer: ${payload.answer}`,
  ].join('\n');
}
