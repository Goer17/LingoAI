import { writingTopicRepository } from '../db/repositories.js';
import type { WritingTopic, WritingTopicKind } from '../types/models.js';
import { createId } from '../utils/id.js';

function normalizeTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeKind(value: unknown): WritingTopicKind {
  return value === 'grammar' ? 'grammar' : 'topic';
}

/** Fill in the fields older rows predate, so callers never see undefined. */
function normalizeTopic(topic: WritingTopic): WritingTopic {
  return {
    ...topic,
    kind: normalizeKind(topic.kind),
    note: typeof topic.note === 'string' ? topic.note : '',
    knowledgePoints: topic.knowledgePoints ?? [],
  };
}

export function listWritingTopics() {
  return writingTopicRepository.list().map(normalizeTopic);
}

export function getWritingTopicById(id: string) {
  const topic = writingTopicRepository.getById(id);
  return topic ? normalizeTopic(topic) : null;
}

export function addWritingTopic(title: string, kind: WritingTopicKind = 'topic') {
  const normalized = normalizeTitle(title);
  if (!normalized) {
    throw new Error('Title is required.');
  }

  const existing = writingTopicRepository.getByNormalizedTitle(normalized.toLowerCase());
  if (existing) {
    return { created: false as const, topic: normalizeTopic(existing) };
  }

  const now = new Date().toISOString();
  const topic: WritingTopic = {
    id: createId('writing-topic'),
    title: normalized,
    kind: normalizeKind(kind),
    note: '',
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
    throw new Error('Title is required.');
  }

  const duplicate = writingTopicRepository.getByNormalizedTitle(normalized.toLowerCase());
  if (duplicate && duplicate.id !== id) {
    throw new Error('That title already exists.');
  }

  const updated: WritingTopic = {
    ...topic,
    title: normalized,
    updatedAt: new Date().toISOString(),
  };

  writingTopicRepository.save(updated);
  return updated;
}

export function updateWritingTopicNote(id: string, note: string) {
  const topic = getWritingTopicById(id);
  if (!topic) {
    return null;
  }

  const updated: WritingTopic = {
    ...topic,
    note,
    updatedAt: new Date().toISOString(),
  };

  writingTopicRepository.save(updated);
  return updated;
}

export function removeWritingTopic(id: string) {
  if (!writingTopicRepository.getById(id)) {
    return false;
  }

  writingTopicRepository.remove(id);
  return true;
}

/**
 * One-time data move: older topics kept their writing in knowledge points.
 * Fold each point into the topic note (as a `##` section) so the text survives
 * the Points UI being removed. Rows that already have a note are left alone.
 */
export function backfillWritingNotes() {
  let changed = 0;

  for (const raw of writingTopicRepository.list()) {
    const topic = normalizeTopic(raw);
    if (topic.note.trim() || !topic.knowledgePoints?.length) {
      continue;
    }

    // Points were prepended when created, so reverse for the original order.
    const note = [...topic.knowledgePoints]
      .reverse()
      .map((point) => `## ${point.title}\n\n${point.content}`.trim())
      .join('\n\n');

    writingTopicRepository.save({ ...topic, note, updatedAt: new Date().toISOString() });
    changed += 1;
  }

  return changed;
}