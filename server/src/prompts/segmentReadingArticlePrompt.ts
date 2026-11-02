/**
 * Splits a pasted article into readable paragraphs.
 *
 * The reader numbers paragraphs in the gutter, so the split has to be
 * structurally meaningful (one idea per block) rather than a fixed-width
 * wrap. The model also cleans the raw text: PDF/web copies usually bring
 * stray line breaks, hyphenation, and headers/footers along with them.
 */
export function createSegmentReadingArticlePrompt(input: {
  title: string;
  content: string;
}) {
  return [
    'You are preparing an English reading article for a language learner.',
    'Split the article into paragraphs and clean the text. Rules:',
    '1. Preserve the author\'s wording. Do not rewrite, shorten, summarize or translate.',
    '2. Remove copy artifacts: page headers/footers, page numbers, repeated whitespace, and line breaks that split a sentence. Rejoin hyphenated words that were broken across lines.',
    '3. One paragraph per coherent block of thought. Aim for 3-8 sentences or 40-120 words per paragraph. Never split a sentence across paragraphs.',
    '4. Keep the original order. Do not add, merge or drop content.',
    '5. If the text already has a title line that duplicates the given title, drop that line from the paragraphs.',
    '6. Return at least one paragraph. Use plain text only: no Markdown markers, no numbering, no bullet characters.',
    '',
    'Return JSON with this shape:',
    '{"paragraphs": ["first paragraph", "second paragraph"], "summary": "one short English sentence about the article"}',
    '',
    `Title: ${input.title.trim()}`,
    'Content:',
    input.content.trim(),
  ].join('\n');
}