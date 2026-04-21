import type { VocabularyEntry } from '../types/models.js';

export function createGenerateQuizPrompt(entries: VocabularyEntry[]) {
  return [
    'You are generating an English vocabulary quiz.',
    'Return only valid JSON with no markdown and no explanation.',
    'Create exactly one question per vocabulary item in the same order as provided.',
    'Mix question types between fill_blank and listening when possible.',
    'For fill_blank: sentence must naturally use the target word. answer must be the exact target word.',
    'For listening: sentence must naturally use the target word in a common way. answer must be the exact target word. ttsText should match the sentence.',
    'JSON schema:',
    '{"questions":[{"type":"fill_blank|listening","word":"...","sentence":"...","answer":"...","ttsText":"optional"}]}',
    `Vocabulary items: ${JSON.stringify(entries.map((entry) => ({
      text: entry.text,
      type: entry.type,
      familiarity: entry.familiarity,
      meanings: entry.meanings,
    })))} `,
  ].join('\n');
}
