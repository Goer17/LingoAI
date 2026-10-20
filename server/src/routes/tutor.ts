import { Router } from 'express';
import { z } from 'zod';
import {
  addTutorMemory,
  createTutorSession,
  deleteTutorSession,
  getTutorSessionDetail,
  listTutorMemories,
  listTutorSessions,
  removeTutorMemory,
  renameTutorSession,
  streamTutorReply,
} from '../services/tutorService.js';
import { fail, ok } from '../utils/http.js';

const createSessionSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

const renameSessionSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

const chatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

const memorySchema = z.object({
  content: z.string().trim().min(1).max(1000),
  kind: z.enum(['note', 'preference', 'goal', 'progress']).optional(),
});

export const tutorRouter = Router();

tutorRouter.get('/sessions', (_req, res) => ok(res, listTutorSessions()));

tutorRouter.post('/sessions', (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 'Invalid session title.');
  }

  return ok(res, createTutorSession(parsed.data.title));
});

tutorRouter.get('/sessions/:id', (req, res) => {
  const detail = getTutorSessionDetail(req.params.id);
  if (!detail) {
    return fail(res, 404, 'Tutor session not found.');
  }

  return ok(res, detail);
});

tutorRouter.post('/sessions/:id/title', (req, res) => {
  const parsed = renameSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Session title is required.');
  }

  const session = renameTutorSession(req.params.id, parsed.data.title);
  if (!session) {
    return fail(res, 404, 'Tutor session not found.');
  }

  return ok(res, session);
});

tutorRouter.post('/sessions/:id/delete', (req, res) => {
  const removed = deleteTutorSession(req.params.id);
  if (!removed) {
    return fail(res, 404, 'Tutor session not found.');
  }

  return ok(res, { removed: true });
});

tutorRouter.post('/sessions/:id/chat', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Message is required.');
  }

  if (!getTutorSessionDetail(req.params.id)) {
    return fail(res, 404, 'Tutor session not found.');
  }

  try {
    const result = await streamTutorReply(req.params.id, parsed.data.message, () => {});
    return ok(res, { reply: result.message.content, message: result.message, session: result.session });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Tutor chat failed.');
  }
});

tutorRouter.post('/sessions/:id/chat/stream', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Message is required.');
  }

  if (!getTutorSessionDetail(req.params.id)) {
    return fail(res, 404, 'Tutor session not found.');
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (payload: unknown) => {
    if (res.writableEnded) {
      return;
    }
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const result = await streamTutorReply(req.params.id, parsed.data.message, send);
    send({ type: 'done', message: result.message, session: result.session });
  } catch (error) {
    send({ type: 'error', error: error instanceof Error ? error.message : 'Tutor chat failed.' });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

tutorRouter.get('/memories', (_req, res) => ok(res, listTutorMemories()));

tutorRouter.post('/memories', (req, res) => {
  const parsed = memorySchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Memory content is required.');
  }

  try {
    return ok(res, addTutorMemory(parsed.data.content, parsed.data.kind));
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Failed to save memory.');
  }
});

tutorRouter.post('/memories/:id/delete', (req, res) => {
  const removed = removeTutorMemory(req.params.id);
  if (!removed) {
    return fail(res, 404, 'Memory not found.');
  }

  return ok(res, { removed: true });
});
