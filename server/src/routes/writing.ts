import { Router } from 'express';
import { z } from 'zod';
import { createChatWritingKnowledgePointPrompt } from '../prompts/chatWritingKnowledgePointPrompt.js';
import { createCheckObjectivesPrompt } from '../prompts/checkObjectivesPrompt.js';
import { createGenerateScenarioPrompt } from '../prompts/generateScenarioPrompt.js';
import { createPolishUserMessagesPrompt } from '../prompts/polishUserMessagesPrompt.js';
import { createScenarioChatMessages } from '../prompts/scenarioChatPrompt.js';
import { createSummarizeScenarioPrompt } from '../prompts/summarizeScenarioPrompt.js';
import { askWordChat, checkObjectives, generateScenario, polishUserMessages, streamScenarioChat, streamWordChat, summarizeScenario } from '../services/openaiService.js';
import { attachScenarioToTask, createLearningTask, markLearningTaskFailed, markLearningTaskReady } from '../services/taskService.js';
import {
  addKnowledgePoint,
  addWritingTopic,
  appendKnowledgePointChat,
  clearKnowledgePointChat,
  getKnowledgePoint,
  getWritingTopicById,
  listWritingTopics,
  removeKnowledgePoint,
  removeWritingTopic,
  updateKnowledgePoint,
  updateWritingTopicTitle,
} from '../services/writingService.js';
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

const scenarioChatSchema = z.object({
  scenario: z.object({
    topicId: z.string().min(1),
    topicTitle: z.string().min(1),
    setting: z.string().min(1),
    userRole: z.string().min(1),
    assistantRole: z.string().min(1),
    objectives: z.array(z.object({
      id: z.string().min(1),
      description: z.string().min(1),
    })).min(1),
  }),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })),
  message: z.string().min(1),
});

const checkObjectivesSchema = z.object({
  scenario: z.object({
    topicId: z.string().min(1),
    topicTitle: z.string().min(1),
    setting: z.string().min(1),
    userRole: z.string().min(1),
    assistantRole: z.string().min(1),
    objectives: z.array(z.object({
      id: z.string().min(1),
      description: z.string().min(1),
    })).min(1),
  }),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })),
});

const summarizeSchema = z.object({
  scenario: z.object({
    topicId: z.string().min(1),
    topicTitle: z.string().min(1),
    setting: z.string().min(1),
    userRole: z.string().min(1),
    assistantRole: z.string().min(1),
    objectives: z.array(z.object({
      id: z.string().min(1),
      description: z.string().min(1),
    })).min(1),
  }),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })),
});

const polishSchema = z.object({
  scenario: z.object({
    topicId: z.string().min(1),
    topicTitle: z.string().min(1),
    setting: z.string().min(1),
    userRole: z.string().min(1),
    assistantRole: z.string().min(1),
    objectives: z.array(z.object({
      id: z.string().min(1),
      description: z.string().min(1),
    })).min(1),
  }),
  messages: z.array(z.string().min(1)).min(1),
});

export const writingRouter = Router();

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

writingRouter.post('/scenarios/chat/stream', async (req, res) => {
  const parsed = scenarioChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid scenario chat payload.');
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const messages = createScenarioChatMessages(
      parsed.data.scenario,
      parsed.data.history,
      parsed.data.message,
    );

    await streamScenarioChat(messages, (chunk) => {
      if (res.writableEnded) {
        return;
      }

      res.write(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`);
    });

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

writingRouter.post('/scenarios/check-objectives', async (req, res) => {
  const parsed = checkObjectivesSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid check objectives payload.');
  }

  try {
    const prompt = createCheckObjectivesPrompt(parsed.data.scenario, parsed.data.history);
    const result = await checkObjectives(prompt);
    return ok(res, result);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Objective check failed.');
  }
});

writingRouter.post('/scenarios/summarize', async (req, res) => {
  const parsed = summarizeSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid summarize payload.');
  }

  try {
    const prompt = createSummarizeScenarioPrompt(parsed.data.scenario, parsed.data.history);
    const result = await summarizeScenario(prompt);
    return ok(res, result);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Summary generation failed.');
  }
});

writingRouter.post('/scenarios/polish', async (req, res) => {
  const parsed = polishSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid polish payload.');
  }

  try {
    const prompt = createPolishUserMessagesPrompt(parsed.data.scenario, parsed.data.messages);
    const result = await polishUserMessages(prompt);
    return ok(res, result);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Polish generation failed.');
  }
});

async function processExpressionTask(taskId: string, topicId: string) {
  const topic = getWritingTopicById(topicId);
  if (!topic) {
    markLearningTaskFailed(taskId, 'Topic not found.');
    return;
  }

  try {
    if (topic.knowledgePoints.length === 0) {
      throw new Error('Add at least one knowledge point before starting scenario practice.');
    }

    const prompt = createGenerateScenarioPrompt(topic);
    const generated = await generateScenario(prompt);
    const scenarioData = {
      topicId: topic.id,
      topicTitle: topic.title,
      setting: generated.setting,
      userRole: generated.userRole,
      assistantRole: generated.assistantRole,
      objectives: generated.objectives,
    };

    attachScenarioToTask(taskId, scenarioData);
    markLearningTaskReady(taskId, {
      questionCount: generated.objectives.length,
      quizSessionId: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scenario generation failed.';
    markLearningTaskFailed(taskId, message);
  }
}

writingRouter.post('/scenarios/:topicId', (req, res) => {
  const topic = getWritingTopicById(req.params.topicId);
  if (!topic) {
    return fail(res, 404, 'Topic not found.');
  }

  if (topic.knowledgePoints.length === 0) {
    return fail(res, 400, 'Add at least one knowledge point before starting scenario practice.');
  }

  const task = createLearningTask('expression');
  void processExpressionTask(task.id, topic.id);
  return ok(res, task);
});
