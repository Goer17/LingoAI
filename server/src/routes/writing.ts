import { Router } from 'express';
import { z } from 'zod';
import { createChatWritingKnowledgePointPrompt } from '../prompts/chatWritingKnowledgePointPrompt.js';
import { createEvaluateWritingSubmissionPrompt } from '../prompts/evaluateWritingSubmissionPrompt.js';
import { createGenerateWritingExercisePrompt } from '../prompts/generateWritingExercisePrompt.js';
import { askWordChat, evaluateWritingSubmission, generateWritingExercise, streamWordChat } from '../services/openaiService.js';
import {
  addKnowledgePoint,
  addWritingTopic,
  appendKnowledgePointChat,
  attachWritingEvaluationToTaskPayload,
  attachWritingExerciseToTaskPayload,
  clearKnowledgePointChat,
  createInitialWritingTaskPayload,
  getKnowledgePoint,
  getWritingTopicById,
  listWritingTopics,
  removeKnowledgePoint,
  removeWritingTopic,
  updateKnowledgePoint,
  updateWritingTopicTitle,
} from '../services/writingService.js';
import { createLearningTask, getLearningTask, markLearningTaskFailed, markLearningTaskReady, removeLearningTask, updateLearningTaskPayload } from '../services/taskService.js';
import { fail, ok } from '../utils/http.js';

const topicSchema = z.object({
  title: z.string().min(1),
});

const pointSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
});

const chatSchema = z.object({
  message: z.string().min(1),
});

const evaluateSchema = z.object({
  submission: z.string().min(1),
});

export const writingRouter = Router();

async function processWritingTask(taskId: string, topicId: string) {
  const task = getLearningTask(taskId);
  const topic = getWritingTopicById(topicId);
  if (!task || !topic) {
    markLearningTaskFailed(taskId, 'Topic not found.');
    return;
  }

  try {
    if (topic.knowledgePoints.length === 0) {
      throw new Error('Add at least one knowledge point before generating a writing task.');
    }

    const prompt = createGenerateWritingExercisePrompt(topic);
    const generated = await generateWritingExercise(prompt);
    const exercise = {
      topicId: topic.id,
      topicTitle: topic.title,
      requirement: generated.requirement,
      targetWordCount: generated.targetWordCount,
      keyPoints: generated.keyPoints,
      createdAt: new Date().toISOString(),
    };

    const payload = attachWritingExerciseToTaskPayload(
      createInitialWritingTaskPayload(topic.id),
      exercise,
    );

    updateLearningTaskPayload(taskId, payload);
    markLearningTaskReady(taskId, {
      questionCount: 1,
      quizSessionId: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Writing task generation failed.';
    markLearningTaskFailed(taskId, message);
  }
}

writingRouter.get('/topics', (_req, res) => ok(res, listWritingTopics()));

writingRouter.post('/topics', (req, res) => {
  const parsed = topicSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Topic title is required.');
  }

  try {
    return ok(res, addWritingTopic(parsed.data.title));
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Failed to add topic.');
  }
});

writingRouter.post('/topics/:id/title', (req, res) => {
  const parsed = topicSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Topic title is required.');
  }

  try {
    const topic = updateWritingTopicTitle(req.params.id, parsed.data.title);
    if (!topic) {
      return fail(res, 404, 'Topic not found.');
    }

    return ok(res, topic);
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Failed to update topic title.');
  }
});

writingRouter.post('/topics/:id/delete', (req, res) => {
  const removed = removeWritingTopic(req.params.id);
  if (!removed) {
    return fail(res, 404, 'Topic not found.');
  }

  return ok(res, { removed: true });
});

writingRouter.post('/topics/:id/points', (req, res) => {
  const parsed = pointSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid knowledge point payload.');
  }

  try {
    const result = addKnowledgePoint(req.params.id, parsed.data.title, parsed.data.content);
    if (!result) {
      return fail(res, 404, 'Topic not found.');
    }

    return ok(res, result);
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Failed to add knowledge point.');
  }
});

writingRouter.post('/topics/:id/points/:pointId', (req, res) => {
  const parsed = pointSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid knowledge point payload.');
  }

  try {
    const topic = updateKnowledgePoint(req.params.id, req.params.pointId, parsed.data);
    if (!topic) {
      return fail(res, 404, 'Knowledge point not found.');
    }

    return ok(res, topic);
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Failed to update knowledge point.');
  }
});

writingRouter.post('/topics/:id/points/:pointId/delete', (req, res) => {
  const topic = removeKnowledgePoint(req.params.id, req.params.pointId);
  if (!topic) {
    return fail(res, 404, 'Knowledge point not found.');
  }

  return ok(res, topic);
});

writingRouter.post('/topics/:id/points/:pointId/chat', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Message is required.');
  }

  const current = getKnowledgePoint(req.params.id, req.params.pointId);
  if (!current) {
    return fail(res, 404, 'Knowledge point not found.');
  }

  appendKnowledgePointChat(current.topic.id, current.point.id, 'user', parsed.data.message);

  try {
    const refreshed = getKnowledgePoint(current.topic.id, current.point.id);
    if (!refreshed) {
      return fail(res, 404, 'Knowledge point not found.');
    }

    const prompt = createChatWritingKnowledgePointPrompt(
      refreshed.topic,
      refreshed.point,
      refreshed.point.chatHistory,
      parsed.data.message,
    );
    const reply = await askWordChat(prompt);
    const updated = appendKnowledgePointChat(current.topic.id, current.point.id, 'assistant', reply);
    return ok(res, { reply, point: updated?.point ?? null, topic: updated?.topic ?? null });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Chat failed.');
  }
});

writingRouter.post('/topics/:id/points/:pointId/chat/stream', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Message is required.');
  }

  const current = getKnowledgePoint(req.params.id, req.params.pointId);
  if (!current) {
    return fail(res, 404, 'Knowledge point not found.');
  }

  appendKnowledgePointChat(current.topic.id, current.point.id, 'user', parsed.data.message);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const refreshed = getKnowledgePoint(current.topic.id, current.point.id);
    if (!refreshed) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Knowledge point not found.' })}\n\n`);
      res.end();
      return;
    }

    const prompt = createChatWritingKnowledgePointPrompt(
      refreshed.topic,
      refreshed.point,
      refreshed.point.chatHistory,
      parsed.data.message,
    );

    const reply = await streamWordChat(prompt, (chunk) => {
      if (res.writableEnded) {
        return;
      }

      res.write(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`);
    });

    appendKnowledgePointChat(current.topic.id, current.point.id, 'assistant', reply);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed.';
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

writingRouter.post('/topics/:id/points/:pointId/chat/clear', (req, res) => {
  const updated = clearKnowledgePointChat(req.params.id, req.params.pointId);
  if (!updated) {
    return fail(res, 404, 'Knowledge point not found.');
  }

  return ok(res, updated);
});

writingRouter.post('/tasks/:topicId', (req, res) => {
  const topic = getWritingTopicById(req.params.topicId);
  if (!topic) {
    return fail(res, 404, 'Topic not found.');
  }

  const task = createLearningTask('writing', createInitialWritingTaskPayload(topic.id));
  void processWritingTask(task.id, topic.id);
  return ok(res, task);
});

writingRouter.post('/tasks/:taskId/evaluate', async (req, res) => {
  const parsed = evaluateSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Essay submission is required.');
  }

  const task = getLearningTask(req.params.taskId);
  if (!task || task.type !== 'writing') {
    return fail(res, 404, 'Writing task not found.');
  }

  if (task.status !== 'ready' || !task.payload?.exercise) {
    return fail(res, 400, 'Writing task is not ready yet.');
  }

  const submission = parsed.data.submission.trim();
  if (!submission) {
    return fail(res, 400, 'Essay submission is required.');
  }

  try {
    const prompt = createEvaluateWritingSubmissionPrompt(task.payload.exercise, submission);
    const evaluation = await evaluateWritingSubmission(prompt);
    const nextPayload = attachWritingEvaluationToTaskPayload(task.payload, submission, evaluation);
    const updated = updateLearningTaskPayload(task.id, nextPayload);
    if (!updated) {
      return fail(res, 404, 'Writing task not found.');
    }

    removeLearningTask(task.id);

    return ok(res, {
      task: updated,
      evaluation,
      removed: true,
    });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Writing evaluation failed.');
  }
});
