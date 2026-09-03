import { getSettings } from './settingsService.js';
import { getOrCreateSentenceImage } from './imageService.js';
import { sentenceImageRepository, vocabularyRepository } from '../db/repositories.js';
import type { VocabularyEntry } from '../types/models.js';

/**
 * Auto image generation queue.
 *
 * When the "Auto Generation" setting is enabled, saving a new vocabulary word
 * enqueues its example sentences and generates an illustration for each one in
 * the background (word + sentence + meaning → polish prompt → image model).
 *
 * The queue is an in-memory, best-effort FIFO: one worker drains it at a time,
 * a single failed sentence never blocks the rest, and the `sentence_images`
 * cache dedupes sentences that were already generated. A server restart drops
 * the pending list — already-generated images are cached, so nothing is wasted.
 */

interface QueuedItem {
  sentence: string;
  word: string;
}

const queue: QueuedItem[] = [];
const pendingKeys = new Set<string>();
const MAX_QUEUE_SIZE = 500;

let draining = false;

function isAutoImageGenerationEnabled(): boolean {
  try {
    return getSettings().autoImageGeneration === true;
  } catch {
    return false;
  }
}

/**
 * Queue the example sentences of a freshly added vocabulary entry for image
 * generation. No-op when the setting is off or the entry has no examples.
 */
export function enqueueAutoImageGeneration(entry: VocabularyEntry) {
  if (!isAutoImageGenerationEnabled()) {
    return;
  }

  const examples = (entry.meanings ?? [])
    .map((meaning) => meaning.example?.trim())
    .filter((sentence): sentence is string => Boolean(sentence));

  let enqueued = 0;
  for (const sentence of examples) {
    const key = sentence.toLowerCase();
    if (pendingKeys.has(key) || queue.length >= MAX_QUEUE_SIZE) {
      continue;
    }
    pendingKeys.add(key);
    queue.push({ sentence, word: entry.text });
    enqueued += 1;
  }

  if (enqueued > 0) {
    void drainQueue();
  }
}

async function drainQueue(): Promise<void> {
  if (draining) {
    return;
  }
  draining = true;
  try {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) {
        continue;
      }
      pendingKeys.delete(item.sentence.toLowerCase());
      try {
        await getOrCreateSentenceImage(item.sentence, { word: item.word });
      } catch {
        // Best-effort: a failed generation must not stall the queue.
      }
    }
  } finally {
    draining = false;
  }
}

/** Number of sentences still waiting to be generated (for observability). */
export function getAutoImageQueueLength(): number {
  return queue.length;
}

function normalizeSentence(sentence: string) {
  return sentence.trim().replace(/\s+/g, ' ').toLowerCase();
}

function hasCachedImage(sentence: string): boolean {
  try {
    return Boolean(sentenceImageRepository.getByNormalizedSentence(normalizeSentence(sentence)));
  } catch {
    return false;
  }
}

/**
 * Recover missed example images: scan recent vocabulary entries (from newest
 * backwards up to `limit`) and re-queue any example sentence that still has no
 * cached image. This heals gaps left by a server restart (the in-memory queue
 * is lost) or by a failed generation. Honours the Auto Generation setting.
 */
export function scanAndEnqueueMissing(limit = 50): number {
  if (!isAutoImageGenerationEnabled()) {
    return 0;
  }

  let enqueued = 0;
  const entries = vocabularyRepository
    .list()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  for (const entry of entries) {
    for (const meaning of entry.meanings ?? []) {
      const sentence = meaning.example?.trim();
      if (!sentence) {
        continue;
      }
      const key = sentence.toLowerCase();
      if (pendingKeys.has(key) || queue.length >= MAX_QUEUE_SIZE || hasCachedImage(sentence)) {
        continue;
      }
      pendingKeys.add(key);
      queue.push({ sentence, word: entry.text });
      enqueued += 1;
    }
  }

  if (enqueued > 0) {
    void drainQueue();
  }
  return enqueued;
}