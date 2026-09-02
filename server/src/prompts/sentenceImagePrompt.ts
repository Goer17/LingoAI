export const REALISTIC_IMAGE_STYLE = [
  'Photorealistic, realistic photograph style.',
  'Natural lighting and high detail.',
  'No text, no subtitles, no captions, no letters, no numbers, no logos, no watermark.',
].join(' ');

export function createSentenceImagePrompt(sentence: string) {
  return `${REALISTIC_IMAGE_STYLE}\nScene: ${sentence}`;
}

/**
 * Polish prompt: turn (word + example sentence + meaning) into a concrete,
 * photorealistic scene description that makes the target word visually obvious.
 * `meaningText` is a short formatted gloss (part of speech + English/Chinese
 * meaning), so the LLM pins the exact sense of the word instead of guessing.
 */
export function createSentenceImagePolishPrompt(sentence: string, word?: string, meaningText?: string) {
  const wordLine = word?.trim()
    ? `Target word to highlight: "${word.trim()}"`
    : 'Target word: not specified — emphasize the overall meaning of the sentence.';
  const meaningLine = meaningText?.trim()
    ? `Meaning of the target word:\n${meaningText.trim()}`
    : '';

  return [
    'You are a visual director for a photorealistic image generator. Rewrite the sentence into a scene description that any viewer can understand from the picture alone.',
    '',
    `Example sentence: "${sentence.trim()}"`,
    wordLine,
    ...(meaningLine ? [meaningLine] : []),
    '',
    'Requirements:',
    '- Build the scene around the TARGET WORD: its visual essence (the object, person, action, or situation it refers to) must be unmistakable in the picture.',
    '- Make the target word the undeniable focus: show it as the main subject, most visible element, or center of visual attention (big, foreground, correctly lit, in action).',
    '- If a meaning is given, choose the visual that fits that exact sense of the word (e.g. for "bank" use the riverside sense if the meaning says so), not another sense.',
    '- Ground the scene in the example sentence: keep the situation, people and objects described there, but frame them so the target word reads clearly.',
    '- Specify concrete visual details: who/what is in the scene, what are they doing, where, what light, time of day, mood.',
    '- Use simple, visual English. Keep it to 2-4 sentences.',
    '- No readable text allowed in the image: no words, signs, captions, letters or numbers in the scene.',
    '- Return only the scene description itself — no quotes, no prefixes, no explanation.',
  ].join('\n');
}