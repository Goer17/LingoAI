/**
 * In-memory progress registry for background learning-task generation.
 *
 * The client polls `GET /api/vocabulary/tasks` every few seconds while a task
 * is pending. This module lets the background processors report what they are
 * doing right now (`label`/`detail`) and how many of the planned questions are
 * already generated (`done`/`total`), so the Tasks page renders a real,
 * count-based progress bar instead of a time-based guess.
 *
 * In-memory by design: generation also runs inside this process, and entries
 * are dropped the moment a task leaves the `pending` state. If the process
 * restarts mid-generation the task has no live progress (the orphaned task is
 * left pending regardless), and the client falls back to a neutral message.
 */
export interface TaskProgress {
  /** Number of questions in the current batch. 0 while still unknown (e.g. the AI is drafting the whole set in one call). */
  total: number;
  /** Questions whose generation finished. */
  done: number;
  /** Short description of what the processor is doing right now, e.g. "Adding audio for question 3 of 10". */
  label: string;
  /** Content of the item being processed (word/sentence); the client truncates long values with "...". */
  detail?: string;
}

const registry = new Map<string, TaskProgress>();

export function setTaskProgress(taskId: string, progress: TaskProgress) {
  registry.set(taskId, progress);
}

export function getTaskProgress(taskId: string): TaskProgress | null {
  return registry.get(taskId) ?? null;
}

export function clearTaskProgress(taskId: string) {
  registry.delete(taskId);
}
