import type { ReadingArticle, ReadingChatMessage, ReadingCitation } from '../types/models.js';

/**
 * Prompt for the reading assistant. Paragraphs are numbered so the model can
 * point at locations ("paragraph 3"), and quoted marks travel as explicit
 * evidence so answers stay grounded in what the learner actually marked.
 */
export function createChatReadingArticlePrompt(input: {
  article: ReadingArticle;
  history: ReadingChatMessage[];
  question: string;
  citations: ReadingCitation[];
}) {
  const { article, history, question, citations } = input;

  const body = article.paragraphs
    .map((paragraph) => `[${paragraph.index}] ${paragraph.text}`)
    .join('\n\n');

  const historyText = history
    .slice(-6)
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join('\n');

  const evidence = citations.length
    ? citations
        .map((citation, position) => {
          const note = citation.note?.trim() ? `\n   learner note: ${citation.note.trim()}` : '';
          return `[${position + 1}] paragraph ${citation.paragraphIndex}: "${citation.text}"${note}`;
        })
        .join('\n')
    : '';

  return [
    'You are an English reading tutor answering questions about one article.',
    'Answer concisely in English by default (brief Chinese glosses only when they help).',
    'Ground every claim in the article text. When you quote, refer to the paragraph number like "in paragraph 4".',
    'If the answer is not in the article, say so plainly instead of inventing it.',
    'Explain vocabulary, grammar, tone, argument structure and implications when asked.',
    'Use compact Markdown: short paragraphs, bullets, inline code, bold emphasis.',
    '',
    `Article title: ${article.title}`,
    'Article paragraphs:',
    body,
    '',
    evidence ? `Learner marked this text (treat as the primary evidence):\n${evidence}` : 'Learner marked text: none',
    historyText ? `Recent conversation:\n${historyText}` : 'Recent conversation: none',
    `User question: ${question}`,
  ].join('\n');
}