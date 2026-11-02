import { Router } from 'express';
import { z } from 'zod';
import {
  appendReadingChat,
  clearReadingChat,
  createReadingArticle,
  createReadingCategory,
  createReadingMark,
  deleteReadingArticle,
  deleteReadingCategory,
  deleteReadingMark,
  getReadingArticleBundle,
  listReadingArticles,
  listReadingCategories,
  resegmentReadingArticle,
  resolveReadingCitations,
  streamReadingReply,
  updateReadingMarkNote,
} from '../services/readingService.js';
import { readingMarkRepository } from '../db/repositories.js';
import { fail, ok } from '../utils/http.js';

export const readingRouter = Router();

const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const articleSchema = z.object({
  categoryId: z.string().max(200).optional(),
  title: z.string().trim().min(1).max(300),
  content: z.string().trim().min(40).max(200_000),
});

const markSchema = z.object({
  kind: z.enum(['highlight', 'underline']),
  paragraphIndex: z.number().int().positive(),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(0),
});

const noteSchema = z.object({
  note: z.string().max(4000),
});

const chatSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  citations: z
    .array(z.object({ markId: z.string().min(1) }))
    .max(24)
    .optional(),
});

readingRouter.get('/categories', (_req, res) => ok(res, listReadingCategories()));

readingRouter.post('/categories', (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Category name is required.');
  }

  try {
    return ok(res, createReadingCategory(parsed.data.name));
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Unable to create category.');
  }
});

readingRouter.post('/categories/:id/delete', (req, res) => {
  const result = deleteReadingCategory(req.params.id);
  if (!result.removed) {
    return fail(res, 400, result.reason ?? 'Unable to delete category.');
  }
  return ok(res, { removed: true });
});

readingRouter.get('/articles', (req, res) => {
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
  const articles = listReadingArticles(categoryId).map((article) => ({
    id: article.id,
    categoryId: article.categoryId,
    title: article.title,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    paragraphCount: article.paragraphs.length,
    markCount: readingMarkRepository.countByArticle(article.id),
    ...(article.summary ? { summary: article.summary } : {}),
  }));

  return ok(res, articles);
});

readingRouter.post('/articles', async (req, res) => {
  const parsed = articleSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Title and content are required.');
  }

  try {
    const article = await createReadingArticle({
      categoryId: parsed.data.categoryId ?? '',
      title: parsed.data.title,
      content: parsed.data.content,
    });
    return ok(res, article);
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Unable to create article.');
  }
});

readingRouter.get('/articles/:id', (req, res) => {
  const bundle = getReadingArticleBundle(req.params.id);
  if (!bundle) {
    return fail(res, 404, 'Article not found.');
  }

  return ok(res, bundle);
});

readingRouter.post('/articles/:id/resegment', async (req, res) => {
  try {
    const article = await resegmentReadingArticle(req.params.id);
    if (!article) {
      return fail(res, 404, 'Article not found.');
    }
    return ok(res, article);
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Unable to re-segment article.');
  }
});

readingRouter.post('/articles/:id/delete', (req, res) => {
  if (!deleteReadingArticle(req.params.id)) {
    return fail(res, 404, 'Article not found.');
  }
  return ok(res, { removed: true });
});

readingRouter.post('/articles/:id/marks', (req, res) => {
  const parsed = markSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid mark range.');
  }

  try {
    const mark = createReadingMark({
      articleId: req.params.id,
      kind: parsed.data.kind,
      paragraphIndex: parsed.data.paragraphIndex,
      startOffset: parsed.data.startOffset,
      endOffset: parsed.data.endOffset,
    });
    return ok(res, mark);
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Unable to save mark.');
  }
});

readingRouter.post('/marks/:id/note', (req, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid note.');
  }

  const mark = updateReadingMarkNote(req.params.id, parsed.data.note);
  if (!mark) {
    return fail(res, 404, 'Mark not found.');
  }
  return ok(res, mark);
});

readingRouter.post('/marks/:id/delete', (req, res) => {
  if (!deleteReadingMark(req.params.id)) {
    return fail(res, 404, 'Mark not found.');
  }
  return ok(res, { removed: true });
});

readingRouter.post('/articles/:id/chat/stream', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Message is required.');
  }

  const bundle = getReadingArticleBundle(req.params.id);
  if (!bundle) {
    return fail(res, 404, 'Article not found.');
  }

  const citations = resolveReadingCitations(bundle.article.id, parsed.data.citations);
  const withQuestion = appendReadingChat(bundle.article.id, 'user', parsed.data.message, citations);
  if (!withQuestion) {
    return fail(res, 404, 'Article not found.');
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    if (citations.length > 0 && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`);
    }

    const reply = await streamReadingReply({
      article: withQuestion,
      question: parsed.data.message,
      citations,
      onDelta: (chunk) => {
        if (res.writableEnded) {
          return;
        }
        res.write(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`);
      },
    });

    const updated = appendReadingChat(bundle.article.id, 'assistant', reply);
    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        article: updated
          ? { id: updated.id, updatedAt: updated.updatedAt, chatHistory: updated.chatHistory }
          : null,
      })}\n\n`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reading chat failed.';
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

readingRouter.post('/articles/:id/chat/clear', (req, res) => {
  const updated = clearReadingChat(req.params.id);
  if (!updated) {
    return fail(res, 404, 'Article not found.');
  }
  return ok(res, { id: updated.id, updatedAt: updated.updatedAt, chatHistory: updated.chatHistory });
});