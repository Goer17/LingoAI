export const REALISTIC_IMAGE_STYLE = [
  'Photorealistic, realistic photograph style.',
  'Natural lighting and high detail.',
  'No text, no subtitles, no captions, no letters, no numbers, no logos, no watermark.',
].join(' ');

export function createSentenceImagePrompt(sentence: string) {
  return `${REALISTIC_IMAGE_STYLE}\nScene: ${sentence}`;
}