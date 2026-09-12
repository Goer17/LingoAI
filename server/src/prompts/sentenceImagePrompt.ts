export const REALISTIC_IMAGE_STYLE = [
  'Photorealistic, realistic photograph style.',
  'Natural lighting and high detail.',
  'No text, no subtitles, no captions, no letters, no numbers, no logos, no watermark.',
].join(' ');

export function createSentenceImagePrompt(sentence: string) {
  return `${REALISTIC_IMAGE_STYLE}\nScene: ${sentence}`;
}

/**
 * System prompt for the scene-design step of the vocabulary image pipeline.
 *
 * Asking the LLM for a scene description directly produced generic, often
 * non-visual text that image models render poorly (the reply could be an
 * abstract gloss rather than a drawable moment). This system prompt makes the
 * LLM first THINK about the best concrete scene for the target word, then emit
 * — on the very last line — a single structured block:
 *
 *     ### text: <scene description>
 *
 * The text after the marker is extracted and fed to the image model, so the
 * reasoning never leaks into the image prompt. The scene description does NOT
 * have to contain the target word: ambiguous words (e.g. "pod" could make an
 * image generator draw a pea shell) are replaced with synonyms or rephrasings
 * that can only mean the intended sense (e.g. "escape capsule").
 */
export function createSentenceImageSceneSystemPrompt(): string {
  return [
    'You are a visual director and English teacher. Your job: design ONE concrete scene for a picture that teaches a language student the meaning of a target English word at a single glance.',
    '',
    'You will be given a target word, its part of speech and meaning, and one example sentence that uses the word.',
    '',
    'The scene must be:',
    '- HIGHLY SCENE-BASED and concrete: a specific person, animal or object in a specific place at a specific time of day, doing a specific action. Show a real moment — never a concept, symbol or abstraction (e.g. for "courage" do not draw a shield or a lion; show a person doing something visibly brave).',
    '- EASY TO UNDERSTAND: common, everyday objects and situations a student can recognize instantly; simple, clear composition.',
    '- FOCUSED ON THE TARGET WORD: the thing, action or situation the word refers to must be the main subject and visual center of the picture — foreground, large, well lit, clearly in action — so the student learns the word by looking at it.',
    '- UNAMBIGUOUS WORDS: the scene description may NOT contain the target word, and should not contain any word that an image generator could draw with a different common meaning. If the target word has another common sense (e.g. "pod" also means a pea shell, "seal" also means an animal), replace it with a precise synonym or a short rephrasing that can only mean the intended sense (e.g. "escape capsule" for "escape pod", "riverbank" for "bank"). The scene must keep the exact same meaning — just said in words with no wrong reading.',
    '- TRUE TO THE GIVEN MEANING and grounded in the example sentence: keep the situation, people and objects from the sentence, but frame them so the target word reads unmistakably.',
    '',
    'Work in two steps:',
    'Step 1 — THINK first. Reason step by step: which exact sense of the word should the picture show? What place, objects, people and actions make that sense visually undeniable? How can the word become the obvious center of the composition? Think before you write.',
    'Step 2 — OUTPUT on the very last line of your reply only, in exactly this format:',
    '### text: <scene description>',
    '',
    'The scene description after "### text:" is the only part used to generate the image, so it must:',
    '- be 2-4 sentences of simple, visual, concrete English describing exactly what the picture shows: subject, action, location, light, time of day, mood;',
    '- read like a direct instruction to an image generator (what to draw), not an explanation;',
    '- NOT necessarily contain the target word: what matters is that the picture shows exactly the same thing the word means here; if the word is ambiguous (e.g. "pod"), say it with a synonym or rephrasing instead (e.g. an "escape capsule" — a small detachable cabin breaking away from a spaceship);',
    '- allow NO readable text inside the picture: no words, signs, subtitles, captions, letters or numbers;',
    '- contain nothing but the scene description — no quotes, no prefixes, no comments.',
  ].join('\n');
}

/**
 * User material for the scene-design step: target word + gloss + example
 * sentence. `meaningText` is a short formatted gloss (part of speech +
 * English/Chinese meaning) so the LLM pins the exact sense of the word instead
 * of guessing. The design rules and the `### text:` output format live in the
 * system prompt (`createSentenceImageSceneSystemPrompt`).
 */
export function createSentenceImageSceneMaterialPrompt(sentence: string, word?: string, meaningText?: string): string {
  const wordLine = word?.trim()
    ? `Target word to learn: "${word.trim()}"`
    : 'Target word: not specified — emphasize the overall meaning of the sentence.';
  const meaningLine = meaningText?.trim()
    ? `Meaning of the target word:\n${meaningText.trim()}`
    : '';

  return [
    `Example sentence: "${sentence.trim()}"`,
    wordLine,
    ...(meaningLine ? [meaningLine] : []),
    '',
    'Think about the best concrete scene, then end your reply with the "### text:" line.',
  ].join('\n');
}