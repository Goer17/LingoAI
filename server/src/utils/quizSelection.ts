/**
 * Quiz item selection.
 *
 * Historically quizzes were built strictly by familiarity: the least familiar
 * words/sentences always came first, so a learner who refreshed often saw the
 * same handful of items and never reviewed the middle of the notebook.
 *
 * New rule: roughly two thirds of the picks still follow familiarity
 * (lowest first) and the remaining third is drawn at random from whatever the
 * pool has left. The random slice keeps the quiz varied without dropping the
 * "start from your weakest material" intent.
 */

/** Share of the picks that follow the familiarity ranking. The remainder is a
 *  random draw over the untouched part of the pool. */
export const FAMILIARITY_PICK_SHARE = 2 / 3;

type FamiliarityCandidate = {
  familiarity: number;
  createdAt: string;
};

function shuffle<T>(items: T[], random: () => number) {
  const output = items.slice();
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

/**
 * Pick up to `limit` entries: `round(limit * 2/3)` of them are the least
 * familiar ones (ties broken by newest first, matching the previous
 * behaviour), and the rest are sampled randomly from the entries that were not
 * picked by familiarity. The returned order keeps the familiarity ranking
 * first (weakest material leads the quiz) and appends the random slice.
 */
export function pickByFamiliarity<T extends FamiliarityCandidate>(
  entries: T[],
  limit: number,
  random: () => number = Math.random,
): T[] {
  const count = Math.min(Math.max(0, limit), entries.length);
  if (count === 0) {
    return [];
  }

  const ranked = entries
    .slice()
    .sort((a, b) => a.familiarity - b.familiarity || b.createdAt.localeCompare(a.createdAt));

  const rankedCount = Math.min(count, Math.round(count * FAMILIARITY_PICK_SHARE));
  const pickedByFamiliarity = ranked.slice(0, rankedCount);
  const remaining = ranked.slice(rankedCount);
  const randomCount = count - rankedCount;

  if (randomCount <= 0) {
    return pickedByFamiliarity;
  }

  const pickedRandomly = shuffle(remaining, random).slice(0, randomCount);
  return [...pickedByFamiliarity, ...pickedRandomly];
}
