import { writingTopicRepository } from '../db/repositories.js';
import type { ChatMessage, WritingEvaluation, WritingExercise, WritingTaskPayload, WritingTopic } from '../types/models.js';
import { createId } from '../utils/id.js';

function normalizeTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeTopic(topic: WritingTopic): WritingTopic {
  return {
    ...topic,
    knowledgePoints: (topic.knowledgePoints ?? []).map((item) => ({
      ...item,
      title: typeof item.title === 'string' ? item.title : '',
      content: typeof item.content === 'string' ? item.content : '',
      chatHistory: Array.isArray(item.chatHistory) ? item.chatHistory : [],
    })),
  };
}

export function listWritingTopics() {
  return writingTopicRepository.list().map((item) => normalizeTopic(item));
}

export function getWritingTopicById(id: string) {
  const topic = writingTopicRepository.getById(id);
  return topic ? normalizeTopic(topic) : null;
}

export function addWritingTopic(title: string) {
  const normalized = normalizeTitle(title);
  if (!normalized) {
    throw new Error('Topic title is required.');
  }

  const existing = writingTopicRepository.getByNormalizedTitle(normalized.toLowerCase());
  if (existing) {
    return { created: false as const, topic: normalizeTopic(existing) };
  }

  const now = new Date().toISOString();
  const topic: WritingTopic = {
    id: createId('writing-topic'),
    title: normalized,
    createdAt: now,
    updatedAt: now,
    knowledgePoints: [],
  };

  writingTopicRepository.save(topic);
  return { created: true as const, topic };
}

export function updateWritingTopicTitle(id: string, title: string) {
  const topic = getWritingTopicById(id);
  if (!topic) {
    return null;
  }

  const normalized = normalizeTitle(title);
  if (!normalized) {
    throw new Error('Topic title is required.');
  }

  const duplicate = writingTopicRepository.getByNormalizedTitle(normalized.toLowerCase());
  if (duplicate && duplicate.id !== id) {
    throw new Error('Topic title already exists.');
  }

  const updated: WritingTopic = {
    ...topic,
    title: normalized,
    updatedAt: new Date().toISOString(),
  };

  writingTopicRepository.save(updated);
  return updated;
}

export function removeWritingTopic(id: string) {
  const topic = getWritingTopicById(id);
  if (!topic) {
    return false;
  }

  writingTopicRepository.remove(id);
  return true;
}

export function addKnowledgePoint(topicId: string, title: string, content: string) {
  const topic = getWritingTopicById(topicId);
  if (!topic) {
    return null;
  }

  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) {
    throw new Error('Knowledge point title is required.');
  }

  const now = new Date().toISOString();
  const point = {
    id: createId('writing-point'),
    title: normalizedTitle,
    content: content.trim(),
    createdAt: now,
    updatedAt: now,
    chatHistory: [] as ChatMessage[],
  };

  const updated: WritingTopic = {
    ...topic,
    updatedAt: now,
    knowledgePoints: [point, ...topic.knowledgePoints],
  };

  writingTopicRepository.save(updated);
  return { topic: updated, point };
}

export function updateKnowledgePoint(topicId: string, pointId: string, payload: { title: string; content: string }) {
  const topic = getWritingTopicById(topicId);
  if (!topic) {
    return null;
  }

  const normalizedTitle = normalizeTitle(payload.title);
  if (!normalizedTitle) {
    throw new Error('Knowledge point title is required.');
  }

  let found = false;
  const updatedPoints = topic.knowledgePoints.map((item) => {
    if (item.id !== pointId) {
      return item;
    }

    found = true;
    return {
      ...item,
      title: normalizedTitle,
      content: payload.content.trim(),
      updatedAt: new Date().toISOString(),
    };
  });

  if (!found) {
    return null;
  }

  const updated: WritingTopic = {
    ...topic,
    updatedAt: new Date().toISOString(),
    knowledgePoints: updatedPoints,
  };
  writingTopicRepository.save(updated);
  return updated;
}

export function removeKnowledgePoint(topicId: string, pointId: string) {
  const topic = getWritingTopicById(topicId);
  if (!topic) {
    return null;
  }

  const nextPoints = topic.knowledgePoints.filter((item) => item.id !== pointId);
  if (nextPoints.length === topic.knowledgePoints.length) {
    return null;
  }

  const updated: WritingTopic = {
    ...topic,
    updatedAt: new Date().toISOString(),
    knowledgePoints: nextPoints,
  };
  writingTopicRepository.save(updated);
  return updated;
}

export function getKnowledgePoint(topicId: string, pointId: string) {
  const topic = getWritingTopicById(topicId);
  if (!topic) {
    return null;
  }

  const point = topic.knowledgePoints.find((item) => item.id === pointId);
  if (!point) {
    return null;
  }

  return { topic, point };
}

export function appendKnowledgePointChat(topicId: string, pointId: string, role: ChatMessage['role'], content: string) {
  const data = getKnowledgePoint(topicId, pointId);
  if (!data) {
    return null;
  }

  const now = new Date().toISOString();
  const updatedPoints = data.topic.knowledgePoints.map((item) => {
    if (item.id !== pointId) {
      return item;
    }

    return {
      ...item,
      updatedAt: now,
      chatHistory: [
        ...item.chatHistory,
        {
          id: createId('chat'),
          role,
          content,
          createdAt: now,
        },
      ],
    };
  });

  const updatedTopic: WritingTopic = {
    ...data.topic,
    updatedAt: now,
    knowledgePoints: updatedPoints,
  };

  writingTopicRepository.save(updatedTopic);
  const point = updatedTopic.knowledgePoints.find((item) => item.id === pointId) ?? null;
  if (!point) {
    return null;
  }

  return { topic: updatedTopic, point };
}

export function clearKnowledgePointChat(topicId: string, pointId: string) {
  const data = getKnowledgePoint(topicId, pointId);
  if (!data) {
    return null;
  }

  const now = new Date().toISOString();
  const updatedTopic: WritingTopic = {
    ...data.topic,
    updatedAt: now,
    knowledgePoints: data.topic.knowledgePoints.map((item) => (
      item.id === pointId
        ? {
          ...item,
          updatedAt: now,
          chatHistory: [],
        }
        : item
    )),
  };

  writingTopicRepository.save(updatedTopic);
  const point = updatedTopic.knowledgePoints.find((item) => item.id === pointId) ?? null;
  if (!point) {
    return null;
  }

  return { topic: updatedTopic, point };
}

export function createInitialWritingTaskPayload(topicId: string): WritingTaskPayload {
  return {
    topicId,
    exercise: null,
    submission: null,
    evaluation: null,
  };
}

export function attachWritingExerciseToTaskPayload(
  payload: WritingTaskPayload,
  exercise: WritingExercise,
): WritingTaskPayload {
  return {
    ...payload,
    exercise,
  };
}

export function attachWritingEvaluationToTaskPayload(
  payload: WritingTaskPayload,
  submission: string,
  evaluation: WritingEvaluation,
): WritingTaskPayload {
  return {
    ...payload,
    submission,
    evaluation,
  };
}
