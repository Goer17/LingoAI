import { metaRepository } from '../db/repositories.js';
import { listListeningEntries, listListeningGroups } from './listeningService.js';
import { getSettings } from './settingsService.js';
import { createLearningTask } from './taskService.js';
import { processListeningTask, processVocabularyTask } from '../routes/vocabulary.js';

/**
 * Daily auto-quiz scheduler.
 *
 * When the `autoDailyQuiz` setting is on, the app creates one vocabulary quiz
 * and one listening quiz (from a random topic with more than one sentence)
 * every day at 06:00 server-local time. Runs as a light interval probe so no
 * cron dependency is needed, and the last successful run date is persisted in
 * `app_meta` so a restart at 06:05 does not fire twice.
 *
 * TODO(expression): auto-generate a daily Expression practice task here too,
 * once scenario practice gets a headless creation path. For now Expression is
 * intentionally skipped (see SettingPage "Daily Auto Quiz" toggle).
 */
export function startDailyQuizScheduler(): void {
  const runIfDue = () => {
    try {
      checkDue();
    } catch (error) {
      console.error('[daily-quiz] scheduler check failed:', error instanceof Error ? error.message : error);
    }
  };

  // 30s probe: cheap, and tolerates the server starting slightly after 06:00.
  runIfDue();
  setInterval(runIfDue, 30_000);
}

const LAST_RUN_KEY = 'dailyQuizLastRunDate';
const RUN_HOUR = 6;
// 5-minute window so a restart at 06:02 still fires; the meta key dedupes.
const RUN_MINUTES = 5;

function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function checkDue(): void {
  const settings = getSettings();
  if (!settings.autoDailyQuiz) {
    return;
  }

  const now = new Date();
  if (now.getHours() !== RUN_HOUR || now.getMinutes() >= RUN_MINUTES) {
    return;
  }

  const today = todayLocal();
  if (metaRepository.get(LAST_RUN_KEY) === today) {
    return;
  }
  metaRepository.set(LAST_RUN_KEY, today);

  console.log(`[daily-quiz] ${now.toISOString()} starting daily quiz generation`);
  runDailyQuizzes();
}

function runDailyQuizzes(): void {
  const limits = settingsQuestionLimits();

  try {
    // Vocabulary: exactly one quiz task.
    const task = createLearningTask('vocabulary');
    void processVocabularyTask(task.id, limits.vocabulary);
  } catch (error) {
    console.error('[daily-quiz] vocabulary task failed to launch:', error instanceof Error ? error.message : error);
  }

  try {
    // Listening: a random topic with more than one sentence, else the whole pool.
    const eligibleGroups = listListeningGroups().filter((group) => listListeningEntries(group.id).length > 1);
    const task = createLearningTask('listening');
    if (eligibleGroups.length > 0) {
      const group = eligibleGroups[Math.floor(Math.random() * eligibleGroups.length)];
      console.log(`[daily-quiz] listening quiz -> topic "${group.name}" (${group.id})`);
      void processListeningTask(task.id, group.id, limits.listening);
    } else {
      console.log('[daily-quiz] no listening topic with >1 sentence, using whole pool');
      void processListeningTask(task.id, undefined, limits.listening);
    }
  } catch (error) {
    console.error('[daily-quiz] listening task failed to launch:', error instanceof Error ? error.message : error);
  }

  // TODO(expression): create an Expression practice task here once scenario
  // generation supports headless kick-off (mirrors the vocabulary/listening paths).
}

function settingsQuestionLimits(): { vocabulary: number; listening: number } {
  const limits = getSettings().quizMaxQuestions;
  return {
    vocabulary: limits?.vocabulary ?? 10,
    listening: limits?.listening ?? 10,
  };
}