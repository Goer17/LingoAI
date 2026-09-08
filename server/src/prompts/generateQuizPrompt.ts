import type { VocabularyEntry } from '../types/models.js';

export function createGenerateQuizPrompt(entries: VocabularyEntry[]) {
  return [
    'You are generating an English vocabulary quiz.',
    'Return only valid JSON with no markdown and no explanation.',
    'Create exactly one question per vocabulary item in the same order as provided.',
    'Mix question types between fill_blank and listening when possible.',
    'For fill_blank:',
    '1) sentence must naturally use the target word/phrase.',
    '2) maskedSentence must be the sentence but with exactly one token [BLANK] replacing the target expression.',
    '3) answer must be the surface form used in the sentence.',
    '4) answerVariants must be acceptable forms of the SAME target word/phrase only (e.g., tense/number), including answer itself.',
    '5) candidates must be 4-8 options, and every option must still be a form of the SAME target word/phrase only.',
    'For listening: sentence must naturally use the target word in a common way. answer must be the exact target word. ttsText should match the sentence.',
    'maskedSentence is for fill_blank questions ONLY — listening questions must omit it entirely (never send an empty string).',
    'candidates and answerVariants are for fill_blank ONLY — omit them for listening questions.',
    'Never output a field with an empty string or an empty array. If a field does not apply to a question, omit it.',
    'Output exactly one question per vocabulary item, in the same order as provided.',
    'JSON schema:',
    '{"questions":[{"type":"fill_blank|listening","word":"...","sentence":"...","maskedSentence":"... [BLANK] ...","answer":"...","answerVariants":["..."],"candidates":["..."],"ttsText":"optional"}]}',
    `Vocabulary items: ${JSON.stringify(entries.map((entry) => ({
      text: entry.text,
      type: entry.type,
      familiarity: entry.familiarity,
      meanings: entry.meanings,
    })))} `,
  ].join('\n');
}
