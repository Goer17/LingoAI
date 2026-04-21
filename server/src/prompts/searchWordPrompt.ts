export function createSearchWordPrompt(query: string) {
  return [
    'You are an English vocabulary assistant.',
    'Analyze the given input and return only valid JSON.',
    'Do not wrap the JSON in markdown.',
    'The user input may be either a word or a phrase.',
    'Return a compact but rich result suitable for an English learning app.',
    'Each meaning should include partOfSpeech, englishMeaning, chineseMeaning, example, and exampleTranslation.',
    'Provide 2 to 4 meanings when appropriate.',
    'Derivatives should be an array of short related forms or collocations.',
    'ttsText should be the exact text that should be spoken for pronunciation.',
    'JSON schema:',
    '{"text":"...","type":"word|phrase","pronunciation":"...","meanings":[{"partOfSpeech":"...","englishMeaning":"...","chineseMeaning":"...","example":"...","exampleTranslation":"..."}],"derivatives":["..."],"ttsText":"..."}',
    `Input: ${query}`,
  ].join('\n');
}
