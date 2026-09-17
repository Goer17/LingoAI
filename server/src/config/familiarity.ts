/** Vocabulary words stop growing past this familiarity. One more correct
 *  answer beyond it marks the word as "known": it stays in the word list
 *  (sorted last) but is never picked for quizzes again. */
export const VOCABULARY_MAX_FAMILIARITY = 16;

/** Listening sentences stop growing past this familiarity. One more correct
 *  answer beyond it marks the sentence as "known". The blank ratio already
 *  saturates at LISTENING_FULL_BLANK_FAMILIARITY, so sentences at
 *  familiarity 10–12 are still quizzed with the whole sentence blanked. */
export const LISTENING_MAX_FAMILIARITY = 12;

/** At or above this familiarity the entire listening sentence is blanked. */
export const LISTENING_FULL_BLANK_FAMILIARITY = 10;

/** Share of words blanked at familiarity 0. A fresh sentence starts at this
 *  ratio (instead of a single blank) so the first attempt is already
 *  challenging; the ratio grows from here to 1 at
 *  LISTENING_FULL_BLANK_FAMILIARITY. */
export const LISTENING_MIN_BLANK_RATIO = 0.4;