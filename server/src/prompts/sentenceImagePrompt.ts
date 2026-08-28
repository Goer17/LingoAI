export const REALISTIC_IMAGE_STYLE = [
  'Photorealistic, realistic photograph style.',
  'Natural lighting and high detail.',
  'No text, no subtitles, no captions, no letters, no numbers, no logos, no watermark.',
].join(' ');

export function createSentenceImagePrompt(sentence: string) {
  return `${REALISTIC_IMAGE_STYLE}\nScene: ${sentence}`;
}

export function createSentenceImagePolishPrompt(sentence: string, word?: string) {
  const wordLine = word?.trim()
    ? `Target word to highlight: "${word.trim()}"`
    : 'Target word: not specified — emphasize the overall meaning of the sentence.';

  return [
    'Rewrite the following English sentence into a vivid, concrete visual scene description for a photorealistic image generator.',
    '',
    `Original sentence: "${sentence.trim()}"`,
    wordLine,
    '',
    'Requirements:',
    '- Describe a clear, concrete visual scene that illustrates the meaning of the sentence.',
    '- Make the meaning of the target word clearly visible in the scene (people, objects, actions, setting, lighting, time of day, mood).',
    '- Use simple, visual English. Keep it to 2-4 sentences.',
    '- Do not mention any text, captions, subtitles, labels, letters or numbers; the final image must contain no readable text.',
    '- Return only the scene description itself — no quotes, no prefixes, no explanation.',
  ].join('\n');
}