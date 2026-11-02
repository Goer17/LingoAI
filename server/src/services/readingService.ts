import { createChatReadingArticlePrompt } from '../prompts/chatReadingArticlePrompt.js';
import { createSegmentReadingArticlePrompt } from '../prompts/segmentReadingArticlePrompt.js';
import {
  readingArticleRepository,
  readingCategoryRepository,
  readingMarkRepository,
} from '../db/repositories.js';
import {
  segmentReadingArticle,
  streamWordChat,
} from './openaiService.js';
import { createId } from '../utils/id.js';
import type {
  ReadingArticle,
  ReadingCategory,
  ReadingChatMessage,
  ReadingCitation,
  ReadingMark,
  ReadingMarkKind,
  ReadingParagraph,
} from '../types/models.js';

const DEFAULT_CATEGORY_NAME = 'General';
const MAX_PARAGRAPHS = 400;

function nowIso() {
  return new Date().toISOString();
}

/** Trim, collapse runs of spaces, and drop zero-width characters that survive
 *  copy/paste from PDFs and web pages. */
function cleanInlineText(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Deterministic fallback when the language model is unavailable: split on blank
 * lines, then break very long blocks into ~3-sentence paragraphs so the reader
 * still gets numbered, readable units.
 */
function fallbackParagraphs(content: string): string[] {
  const normalized = content
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/([a-z])-\n([a-z])/g, '$1$2')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  if (!normalized) {
    return [];
  }

  const blocks = normalized
    .split(/\n\s*\n+/)
    .map((block) => cleanInlineText(block.replace(/\s*\n\s*/g, ' ')))
    .filter(Boolean);

  const paragraphs: string[] = [];
  for (const block of blocks) {
    if (block.length <= 700) {
      paragraphs.push(block);
      continue;
    }

    const sentences = block.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [block];
    let buffer = '';
    for (const sentence of sentences) {
      buffer += sentence;
      if (buffer.trim().split(/(?<=[.!?])\s+/).length >= 3) {
        paragraphs.push(cleanInlineText(buffer));
        buffer = '';
      }
    }
    if (buffer.trim()) {
      paragraphs.push(cleanInlineText(buffer));
    }
  }

  return paragraphs.filter(Boolean).slice(0, MAX_PARAGRAPHS);
}

function toParagraphs(texts: string[]): ReadingParagraph[] {
  return texts
    .map((text) => cleanInlineText(text))
    .filter(Boolean)
    .slice(0, MAX_PARAGRAPHS)
    .map((text, position) => ({ index: position + 1, text }));
}

export function ensureDefaultCategory(): ReadingCategory {
  const existing = readingCategoryRepository.getByName(DEFAULT_CATEGORY_NAME);
  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  const category: ReadingCategory = {
    id: createId('reading-cat'),
    name: DEFAULT_CATEGORY_NAME,
    position: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  readingCategoryRepository.save(category);
  return category;
}

export function listReadingCategories(): ReadingCategory[] {
  ensureDefaultCategory();
  const articles = readingArticleRepository.list();
  const counts = new Map<string, number>();
  for (const article of articles) {
    counts.set(article.categoryId, (counts.get(article.categoryId) ?? 0) + 1);
  }

  return readingCategoryRepository
    .list()
    .map((category) => ({ ...category, articleCount: counts.get(category.id) ?? 0 }));
}

export function createReadingCategory(name: string): ReadingCategory {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Category name is required.');
  }
  if (readingCategoryRepository.getByName(trimmed)) {
    throw new Error(`Category "${trimmed}" already exists.`);
  }

  const timestamp = nowIso();
  const categories = readingCategoryRepository.list();
  const position = categories.length
    ? Math.max(...categories.map((category) => category.position)) + 1
    : 0;
  const category: ReadingCategory = {
    id: createId('reading-cat'),
    name: trimmed,
    position,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  readingCategoryRepository.save(category);
  return category;
}

export function deleteReadingCategory(id: string): { removed: boolean; reason?: string } {
  const category = readingCategoryRepository.getById(id);
  if (!category) {
    return { removed: false, reason: 'Category not found.' };
  }
  if (category.name === DEFAULT_CATEGORY_NAME) {
    return { removed: false, reason: 'The General category cannot be deleted.' };
  }

  const articles = readingArticleRepository.listByCategory(id);
  if (articles.length > 0) {
    return { removed: false, reason: 'Move or delete the articles in this category first.' };
  }

  readingCategoryRepository.remove(id);
  return { removed: true };
}

export function listReadingArticles(categoryId?: string): ReadingArticle[] {
  const articles = categoryId
    ? readingArticleRepository.listByCategory(categoryId)
    : readingArticleRepository.list();

  return articles;
}

export function getReadingArticle(id: string): ReadingArticle | null {
  return readingArticleRepository.getById(id);
}

export interface ReadingArticleBundle {
  article: ReadingArticle;
  marks: ReadingMark[];
}

export function getReadingArticleBundle(id: string): ReadingArticleBundle | null {
  const article = readingArticleRepository.getById(id);
  if (!article) {
    return null;
  }
  return { article, marks: readingMarkRepository.listByArticle(id) };
}

export async function createReadingArticle(input: {
  categoryId: string;
  title: string;
  content: string;
}): Promise<ReadingArticle> {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) {
    throw new Error('Article title is required.');
  }
  if (content.length < 40) {
    throw new Error('Article content is too short to read.');
  }

  const category = readingCategoryRepository.getById(input.categoryId) ?? ensureDefaultCategory();

  let paragraphs: string[] = [];
  let summary: string | undefined;
  let segmentedBy: ReadingArticle['segmentedBy'] = 'ai';

  try {
    const segmented = await segmentReadingArticle(
      createSegmentReadingArticlePrompt({ title, content }),
    );
    paragraphs = segmented.paragraphs;
    summary = segmented.summary;
  } catch {
    // A broken or unconfigured model must not block reading: fall back to a
    // deterministic split and mark the article so the UI can offer a retry.
    segmentedBy = 'fallback';
  }

  if (paragraphs.length === 0) {
    paragraphs = fallbackParagraphs(content);
    segmentedBy = 'fallback';
  }

  const timestamp = nowIso();
  const article: ReadingArticle = {
    id: createId('reading'),
    categoryId: category.id,
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    sourceText: content,
    paragraphs: toParagraphs(paragraphs),
    chatHistory: [],
    segmentedBy,
    ...(summary ? { summary } : {}),
  };

  readingArticleRepository.save(article);
  return article;
}

export async function resegmentReadingArticle(id: string): Promise<ReadingArticle | null> {
  const article = readingArticleRepository.getById(id);
  if (!article) {
    return null;
  }

  let paragraphs: string[] = [];
  let segmentedBy: ReadingArticle['segmentedBy'] = 'ai';

  try {
    const segmented = await segmentReadingArticle(
      createSegmentReadingArticlePrompt({ title: article.title, content: article.sourceText }),
    );
    paragraphs = segmented.paragraphs;
  } catch {
    segmentedBy = 'fallback';
  }

  if (paragraphs.length === 0) {
    paragraphs = fallbackParagraphs(article.sourceText);
    segmentedBy = 'fallback';
  }

  // Paragraph numbering changes, so existing offsets can no longer be trusted.
  readingMarkRepository.removeByArticle(article.id);

  const updated: ReadingArticle = {
    ...article,
    paragraphs: toParagraphs(paragraphs),
    segmentedBy,
    updatedAt: nowIso(),
  };
  readingArticleRepository.save(updated);
  return updated;
}

export function deleteReadingArticle(id: string): boolean {
  const article = readingArticleRepository.getById(id);
  if (!article) {
    return false;
  }

  readingMarkRepository.removeByArticle(id);
  readingArticleRepository.remove(id);
  return true;
}

export function createReadingMark(input: {
  articleId: string;
  kind: ReadingMarkKind;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
}): ReadingMark {
  const article = readingArticleRepository.getById(input.articleId);
  if (!article) {
    throw new Error('Article not found.');
  }

  const paragraph = article.paragraphs.find((item) => item.index === input.paragraphIndex);
  if (!paragraph) {
    throw new Error('Paragraph not found.');
  }

  const start = Math.max(0, Math.min(input.startOffset, paragraph.text.length));
  const end = Math.max(0, Math.min(input.endOffset, paragraph.text.length));
  if (end - start < 1) {
    throw new Error('Select some text before marking it.');
  }

  const timestamp = nowIso();
  const mark: ReadingMark = {
    id: createId('reading-mark'),
    articleId: article.id,
    kind: input.kind,
    paragraphIndex: paragraph.index,
    startOffset: start,
    endOffset: end,
    text: paragraph.text.slice(start, end),
    note: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  readingMarkRepository.save(mark);
  return mark;
}

export function updateReadingMarkNote(id: string, note: string): ReadingMark | null {
  const mark = readingMarkRepository.getById(id);
  if (!mark) {
    return null;
  }

  const updated: ReadingMark = {
    ...mark,
    note: note.slice(0, 4000),
    updatedAt: nowIso(),
  };
  readingMarkRepository.save(updated);
  return updated;
}

export function deleteReadingMark(id: string): boolean {
  const mark = readingMarkRepository.getById(id);
  if (!mark) {
    return false;
  }

  readingMarkRepository.remove(id);
  return true;
}

export function appendReadingChat(
  articleId: string,
  role: ReadingChatMessage['role'],
  content: string,
  citations?: ReadingCitation[],
): ReadingArticle | null {
  const article = readingArticleRepository.getById(articleId);
  if (!article) {
    return null;
  }

  const message: ReadingChatMessage = {
    id: createId('reading-msg'),
    role,
    content,
    createdAt: nowIso(),
    ...(citations && citations.length ? { citations } : {}),
  };

  const updated: ReadingArticle = {
    ...article,
    chatHistory: [...article.chatHistory, message],
    updatedAt: nowIso(),
  };
  readingArticleRepository.save(updated);
  return updated;
}

export function clearReadingChat(articleId: string): ReadingArticle | null {
  const article = readingArticleRepository.getById(articleId);
  if (!article) {
    return null;
  }

  const updated: ReadingArticle = {
    ...article,
    chatHistory: [],
    updatedAt: nowIso(),
  };
  readingArticleRepository.save(updated);
  return updated;
}

/** Resolve citation ids sent by the client into the text the model should see.
 *  Unknown ids are dropped instead of failing the whole request: a mark may be
 *  deleted while the composer still holds it. */
export function resolveReadingCitations(
  articleId: string,
  citations: Array<{ markId: string }> | undefined,
): ReadingCitation[] {
  if (!citations || citations.length === 0) {
    return [];
  }

  const marks = readingMarkRepository.listByArticle(articleId);
  const byId = new Map(marks.map((mark) => [mark.id, mark]));
  const resolved: ReadingCitation[] = [];

  for (const citation of citations) {
    const mark = byId.get(citation.markId);
    if (!mark) {
      continue;
    }
    resolved.push({
      markId: mark.id,
      paragraphIndex: mark.paragraphIndex,
      text: mark.text,
      ...(mark.note.trim() ? { note: mark.note.trim() } : {}),
    });
    if (resolved.length >= 12) {
      break;
    }
  }

  return resolved;
}

export async function streamReadingReply(input: {
  article: ReadingArticle;
  question: string;
  citations: ReadingCitation[];
  onDelta: (chunk: string) => void;
}): Promise<string> {
  const prompt = createChatReadingArticlePrompt({
    article: input.article,
    history: input.article.chatHistory,
    question: input.question,
    citations: input.citations,
  });

  return streamWordChat(prompt, input.onDelta);
}