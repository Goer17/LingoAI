import { Router } from 'express';
import { z } from 'zod';
import {
  addWritingTopic,
  getWritingTopicById,
  listWritingTopics,
  removeWritingTopic,
  updateWritingTopicNote,
  updateWritingTopicTitle,
} from '../services/writingService.js';
import { fail, ok } from '../utils/http.js';

const topicSchema = z.object({
  title: z.string().trim().min(1).max(200),
  kind: z.enum(['grammar', 'topic']).optional(),
});

const titleSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

const noteSchema = z.object({
  // Markdown can be long; 200k characters is far beyond anything hand-written.
  note: z.string().max(200000),
});

export const writingRouter = Router();

/** All titles for both tabs; the client splits them by `kind`. */
writingRouter.get('/topics', (_req, res) => ok(res, listWritingTopics()));

writingRouter.post('/topics', (req, res) => {
  const parsed = topicSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Title is required.');
  }

  try {
    return ok(res, addWritingTopic(parsed.data.title, parsed.data.kind));
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Unable to create the title.');
  }
});

writingRouter.post('/topics/:id/title', (req, res) => {
  const parsed = titleSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Title is required.');
  }

  try {
    const topic = updateWritingTopicTitle(req.params.id, parsed.data.title);
    if (!topic) {
      return fail(res, 404, 'Title not found.');
    }

    return ok(res, topic);
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Unable to rename the title.');
  }
});

writingRouter.post('/topics/:id/note', (req, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid note.');
  }

  const topic = updateWritingTopicNote(req.params.id, parsed.data.note);
  if (!topic) {
    return fail(res, 404, 'Title not found.');
  }

  return ok(res, topic);
});

writingRouter.post('/topics/:id/delete', (req, res) => {
  if (!getWritingTopicById(req.params.id)) {
    return fail(res, 404, 'Title not found.');
  }

  removeWritingTopic(req.params.id);
  return ok(res, { removed: true });
});