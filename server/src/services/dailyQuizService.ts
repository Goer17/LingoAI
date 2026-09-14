import { metaRepository } from '../db/repositories.js';
import { listListeningEntries, listListeningGroups } from './listeningService.js';
import { getSettings } from './settingsService.js';
import { createLearningTask } from './taskService.js';
import { processListeningTask, processVocabularyTask } from '../routes/vocabulary.js';
import type { ListeningGroup } from '../types/models.js';

/**
 * Daily auto-quiz scheduler.
 *
 * When the `autoDailyQuiz` setting is on, the app creates three quizzes every
 * day at 06:00 server-local time:
 *   1. one vocabulary quiz, and
 *   2. two listening quizzes — first from the fixed `Default` topic, then from
 *      the topic with the lowest average familiarity (excluding `Default`).
 * Runs as a light interval probe so no cron dependency is needed, and the last
 * successful run date is persisted in `app_meta` so a restart at 06:05 does not
 * fire twice.
 *
 * TODO(expression): auto-generate a daily Expression practice task here too,
 * once scenario practice gets a headless creation path. For now Expression is
 * intentionally skipped (see SettingPage "Daily Auto Quiz" toggle).
 */
const DEFAULT_GROUP_NAME = 'Default';
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

/** Active (not yet known) sentences in a topic. */
function activeListeningEntries(groupId: string) {
  return listListeningEntries(groupId).filter((entry) => !entry.known);
}

/**
 * Pick the topic with the lowest average familiarity across its active
 * sentences. Topics with no active sentences (or in `excludeGroupIds`) are
 * ignored; returns null when nothing is eligible.
 */
function pickLowestFamiliarityGroup(excludeGroupIds: Set<string>): ListeningGroup | null {
  let best: { group: ListeningGroup; average: number } | null = null;

  for (const group of listListeningGroups()) {
    if (excludeGroupIds.has(group.id)) {
      continue;
    }

    const active = activeListeningEntries(group.id);
    if (active.length === 0) {
      continue;
    }

    const average = active.reduce((sum, entry) => sum + entry.familiarity, 0) / active.length;
    if (!best || average < best.average) {
      best = { group, average };
    }
  }

  return best?.group ?? null;
}

/** Launch one listening quiz for a topic, or the whole pool when omitted. */
function launchListeningQuiz(group?: ListeningGroup): void {
  const limits = settingsQuestionLimits();

  try {
    if (group) {
      if (activeListeningEntries(group.id).length === 0) {
        console.log(`[daily-quiz] listening topic "${group.name}" has no active sentences, skipping`);
        return;
      }
      console.log(`[daily-quiz] listening quiz -> topic "${group.name}" (${group.id})`);
      const task = createLearningTask('listening', { groupId: group.id, groupName: group.name });
      void processListeningTask(task.id, group.id, limits.listening);
      return;
    }

    console.log('[daily-quiz] listening quiz -> whole pool');
    const task = createLearningTask('listening');
    void processListeningTask(task.id, undefined, limits.listening);
  } catch (error) {
    console.error('[daily-quiz] listening task failed to launch:', error instanceof Error ? error.message : error);
  }
}

function runDailyQuizzes(): void {
  const limits = settingsQuestionLimits();

  // 1. Vocabulary: exactly one quiz task.
  try {
    const task = createLearningTask('vocabulary');
    void processVocabularyTask(task.id, limits.vocabulary);
  } catch (error) {
    console.error('[daily-quiz] vocabulary task failed to launch:', error instanceof Error ? error.message : error);
  }

  // 2. Listening: always start with the fixed Default topic.
  const defaultGroup = listListeningGroups().find((group) => group.name === DEFAULT_GROUP_NAME) ?? null;
  if (defaultGroup) {
    launchListeningQuiz(defaultGroup);
  } else {
    console.log('[daily-quiz] no Default listening topic found, using whole pool');
    launchListeningQuiz();
  }

  // 3. Listening: the topic with the lowest average familiarity, excluding Default.
  const excludeGroupIds = new Set<string>(defaultGroup ? [defaultGroup.id] : []);
  const lowestGroup = pickLowestFamiliarityGroup(excludeGroupIds);
  if (lowestGroup) {
    launchListeningQuiz(lowestGroup);
  } else {
    console.log('[daily-quiz] no other listening topic with active sentences, second quiz skipped');
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