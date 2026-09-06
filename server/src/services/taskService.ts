import { mistakeRepository, taskRepository } from '../db/repositories.js';
import type { LearningTask, MistakeEntry, QuizSession, ScenarioData } from '../types/models.js';
import { createId } from '../utils/id.js';
import { createQuizSession } from './quizService.js';
import { getOrCreateSentenceImage } from './imageService.js';

function sameMistake(a: MistakeEntry, b: Omit<MistakeEntry, 'id' | 'createdAt' | 'updatedAt'>) {
  return (
    a.type === b.type
    && a.word.toLowerCase() === b.word.toLowerCase()
    && a.answer.toLowerCase() === b.answer.toLowerCase()
    && a.sentence.trim() === b.sentence.trim()
  );
}

export function listLearningTasks() {
  return taskRepository.list();
}

export function getLearningTask(id: string) {
  return taskRepository.getById(id) ?? null;
}

export function createLearningTask(
  type: LearningTask['type'],
  meta?: { groupId?: string; groupName?: string },
) {
  const now = new Date().toISOString();
  const task: LearningTask = {
    id: createId('task'),
    type,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    quizSessionId: null,
    questionCount: 0,
    error: null,
    ...(meta?.groupId ? { groupId: meta.groupId } : {}),
    ...(meta?.groupName ? { groupName: meta.groupName } : {}),
  };

  taskRepository.save(task);
  return task;
}

export function markLearningTaskReady(id: string, payload: { quizSessionId?: string | null; questionCount: number }) {
  const current = getLearningTask(id);
  if (!current) {
    return null;
  }

  const updated: LearningTask = {
    ...current,
    status: 'ready',
    updatedAt: new Date().toISOString(),
    quizSessionId: payload.quizSessionId ?? null,
    questionCount: payload.questionCount,
    error: null,
  };

  taskRepository.save(updated);
  return updated;
}

/**
 * Mark a task failed. When `quizSessionId` is provided, the partially
 * generated session is preserved so a later Retry can reuse the questions
 * that already have their audio/images ready.
 */
export function markLearningTaskFailed(id: string, error: string, payload?: { quizSessionId?: string | null }) {
  const current = getLearningTask(id);
  if (!current) {
    return null;
  }

  const updated: LearningTask = {
    ...current,
    status: 'failed',
    updatedAt: new Date().toISOString(),
    error,
    quizSessionId: payload && payload.quizSessionId !== undefined
      ? payload.quizSessionId
      : current.quizSessionId,
  };

  taskRepository.save(updated);
  return updated;
}

/** Put a failed task back into the pending queue (used by Retry). */
export function markLearningTaskPending(id: string) {
  const current = getLearningTask(id);
  if (!current) {
    return null;
  }

  const updated: LearningTask = {
    ...current,
    status: 'pending',
    updatedAt: new Date().toISOString(),
    error: null,
  };

  taskRepository.save(updated);
  return updated;
}

export function removeLearningTaskByQuizSessionId(quizSessionId: string) {
  taskRepository.removeByQuizSessionId(quizSessionId);
}

export function removeLearningTask(id: string) {
  taskRepository.remove(id);
}

export function attachScenarioToTask(id: string, scenario: ScenarioData) {
  const current = getLearningTask(id);
  if (!current) {
    return null;
  }

  const updated: LearningTask = {
    ...current,
    scenario,
    updatedAt: new Date().toISOString(),
  };

  taskRepository.save(updated);
  return updated;
}

export function clearFailedLearningTask(id: string) {
  const task = getLearningTask(id);
  if (!task) {
    return { ok: false as const, reason: 'not_found' as const };
  }

  taskRepository.remove(id);
  return { ok: true as const };
}

export function listMistakeEntries() {
  return mistakeRepository.list();
}

export function upsertMistakesFromSession(session: QuizSession) {
  const existing = mistakeRepository.list();

  for (const answer of session.answers) {
    if (answer.isCorrect) {
      continue;
    }

    const question = session.questions.find((item) => item.id === answer.questionId);
    if (!question) {
      continue;
    }

    const now = new Date().toISOString();
    const draft = {
      type: question.type,
      word: question.word,
      sentence: question.sentence,
      answer: question.answer,
      ttsText: question.ttsText,
      audioUrl: question.audioUrl,
      imageUrl: question.imageUrl,
      blanks: question.blanks,
    };

    const matched = existing.find((item) => sameMistake(item, draft));
    if (matched) {
      mistakeRepository.save({
        ...matched,
        updatedAt: now,
      });
      continue;
    }

    const entry: MistakeEntry = {
      id: createId('mistake'),
      createdAt: now,
      updatedAt: now,
      ...draft,
    };

    mistakeRepository.save(entry);
    existing.push(entry);
  }

  return mistakeRepository.list();
}

export function removeMistakeEntries(ids: string[]) {
  for (const id of ids) {
    mistakeRepository.remove(id);
  }

  return mistakeRepository.list();
}

export async function createMistakeReviewSession() {
  const mistakes = mistakeRepository.list().slice(0, 10);
  if (mistakes.length === 0) {
    return null;
  }

  const questions = await Promise.all(mistakes.map(async (entry) => {
    let imageUrl = entry.imageUrl;
    if (entry.type === 'fill_blank' && !entry.audioUrl) {
      try {
        const image = await getOrCreateSentenceImage(entry.sentence, { word: entry.word });
        imageUrl = image.imageUrl;
        if (imageUrl !== entry.imageUrl) {
          mistakeRepository.save({
            ...entry,
            imageUrl,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Image generation is best-effort: the question stays usable without it.
      }
    }

    return {
      id: createId('question'),
      type: entry.type,
      word: entry.word,
      sentence: entry.sentence,
      answer: entry.answer,
      ttsText: entry.ttsText,
      audioUrl: entry.audioUrl,
      imageUrl,
      blanks: entry.blanks,
      mistakeId: entry.id,
    };
  }));

  return createQuizSession(questions, 'mistake_review');
}

export function reconcileMistakesForCompletedSession(session: QuizSession) {
  if (session.sourceType !== 'mistake_review') {
    return mistakeRepository.list();
  }

  const solvedIds = session.answers
    .filter((item) => item.isCorrect)
    .map((item) => session.questions.find((question) => question.id === item.questionId)?.mistakeId)
    .filter((id): id is string => Boolean(id));

  return removeMistakeEntries(solvedIds);
}
