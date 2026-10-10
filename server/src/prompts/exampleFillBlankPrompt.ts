export interface ExampleFillBlankItem {
  word: string;
  sentence: string;
  /** Formatted gloss (part of speech + English/Chinese meaning) of the single
   *  meaning this example sentence belongs to. */
  meaningText?: string;
}

/**
 * Extract the fill-in-the-blank payload from the learner's OWN example
 * sentence — never invent a new sentence. The server has already picked one
 * meaning at random and uses its example VERBATIM as the question sentence;
 * this step only figures out how to blank it out:
 *
 * - `answer`: the exact surface form of the target word/phrase as it appears
 *   in that sentence (it may be inflected, e.g. "went" for "go").
 * - `maskedSentence`: the sentence copied verbatim with exactly one [BLANK]
 *   replacing the target expression.
 *
 * The image for the question is resolved separately from the sentence-image
 * cache (`getOrCreateSentenceImage`), so reusing a real example sentence
 * lets the quiz reuse the illustration the system already generated for the
 * vocabulary page instead of paying for a new one per invented sentence.
 */
export function createExampleFillBlankPrompt(items: ExampleFillBlankItem[]) {
  return [
    'You are preparing fill-in-the-blank questions from the learner\'s own example sentences.',
    'Return only valid JSON with no markdown and no explanation.',
    'For each item below, the example sentence uses the target word or phrase in its surface form (it may be inflected: e.g. "went" for "go", "is running" for "run").',
    'Rules:',
    '1) answer must be the EXACT surface form of the target word/phrase as it appears in the sentence — copy it from the sentence, including whatever inflection/tense/number the sentence uses.',
    '2) maskedSentence must be the sentence copied VERBATIM (no other changes, keep punctuation and capitalization) with exactly one token [BLANK] replacing the target expression.',
    '3) maskedSentence must not contain the answer text.',
    'Output exactly one question per item, in the same order as provided.',
    'JSON schema:',
    '{"questions":[{"answer":"...","maskedSentence":"... [BLANK] ..."}]}',
    'Items:',
    ...items.map((item) => {
      const lines = [
        `Target word or phrase: "${item.word.trim()}"`,
        ...(item.meaningText?.trim() ? [item.meaningText.trim()] : []),
        `Example sentence (use VERBATIM for maskedSentence): "${item.sentence.trim()}"`,
      ];
      return lines.join('\n');
    }),
  ].join('\n');
}