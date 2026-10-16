import { createRepairFillBlankPrompt } from '../prompts/repairFillBlankPrompt.js';
import { generateFillBlankRepair } from './openaiService.js';
import type { QuizDraftQuestion } from '../types/models.js';

const MIN_BLANK_LENGTH = 6;
const MAX_RETRIES = 3;

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskByExactAnswer(sentence: string, answer: string) {
  const normalizedSentence = sentence;
  const normalizedAnswer = answer.trim();
  if (!normalizedAnswer) {
    return null;
  }

  const pattern = new RegExp(escapeRegExp(normalizedAnswer), 'i');
  const matched = normalizedSentence.match(pattern);
  if (!matched || matched.index == null) {
    return null;
  }

  const mask = '_'.repeat(Math.max(MIN_BLANK_LENGTH, matched[0].length));
  const start = matched.index;
  const end = start + matched[0].length;
  return `${normalizedSentence.slice(0, start)}${mask}${normalizedSentence.slice(end)}`;
}

function buildBracketBlankSentence(sentence: string, answer: string) {
  const normalizedSentence = sentence;
  const normalizedAnswer = answer.trim();
  if (!normalizedAnswer) {
    return null;
  }

  const pattern = new RegExp(escapeRegExp(normalizedAnswer), 'i');
  const matched = normalizedSentence.match(pattern);
  if (!matched || matched.index == null) {
    return null;
  }

  const start = matched.index;
  const end = start + matched[0].length;
  return `${normalizedSentence.slice(0, start)}[BLANK]${normalizedSentence.slice(end)}`;
}

/**
 * When the LLM puts underscores directly into the sentence field (instead of
 * using a separate maskedSentence), extract the blank position from the
 * sentence and build a proper [BLANK]-style maskedSentence.
 */
function buildBracketBlankFromSentenceUnderscores(sentence: string, answer: string) {
  const underscoreMatch = sentence.match(/_{3,}/);
  if (!underscoreMatch || underscoreMatch.index == null) {
    return null;
  }

  // Verify the expected blank length roughly matches the answer length.
  const expectedLen = underscoreMatch[0].length;
  if (expectedLen < Math.max(MIN_BLANK_LENGTH, answer.length) && expectedLen < answer.length) {
    return null;
  }

  const start = underscoreMatch.index;
  const end = start + underscoreMatch[0].length;
  return `${sentence.slice(0, start)}[BLANK]${sentence.slice(end)}`;
}

function countBlankRuns(maskedSentence: string) {
  const matches = maskedSentence.match(/_{3,}/g);
  return matches ? matches.length : 0;
}

function sentenceContainsAnswer(sentence: string, answer: string) {
  const normalizedSentence = normalizeSpaces(sentence).toLowerCase();
  const normalizedAnswer = normalizeSpaces(answer).toLowerCase();
  if (!normalizedAnswer) {
    return false;
  }

  return normalizedSentence.includes(normalizedAnswer);
}

function extractRepairResult(
  sourceSentence: string,
  payload: { maskedSentence: string; answer: string },
): { maskedSentence: string; answer: string } | null {
  const maskedSentence = normalizeSpaces(payload.maskedSentence);
  const answer = normalizeSpaces(payload.answer);

  if (!maskedSentence || !answer || answer.includes('_')) {
    return null;
  }

  if (countBlankRuns(maskedSentence) !== 1) {
    return null;
  }

  if (!sentenceContainsAnswer(sourceSentence, answer)) {
    return null;
  }

  if (maskedSentence.toLowerCase().includes(answer.toLowerCase())) {
    return null;
  }

  return { maskedSentence, answer };
}

function isValidModelMaskedSentence(sentence: string, maskedSentence: string, answer: string) {
  if ((maskedSentence.match(/\[BLANK\]/g) ?? []).length !== 1) {
    return false;
  }

  const rebuilt = normalizeSpaces(maskedSentence.replace('[BLANK]', answer));
  return rebuilt.toLowerCase() === normalizeSpaces(sentence).toLowerCase();
}

function normalizeUnique(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of values) {
    const normalized = normalizeSpaces(item);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
  }

  return output;
}

export async function ensureFillBlankMaskedSentence(question: QuizDraftQuestion): Promise<QuizDraftQuestion> {
  if (question.type !== 'fill_blank') {
    return question;
  }

  const sentence = normalizeSpaces(question.sentence);
  const answer = normalizeSpaces(question.answer);
  const normalizedVariants = normalizeUnique([answer, ...(question.answerVariants ?? [])]);
  const normalizedCandidates = normalizeUnique(question.candidates ?? normalizedVariants);

  if (
    question.maskedSentence
    && isValidModelMaskedSentence(sentence, normalizeSpaces(question.maskedSentence), answer)
  ) {
    return {
      ...question,
      sentence,
      answer,
      maskedSentence: normalizeSpaces(question.maskedSentence),
      answerVariants: normalizedVariants,
      candidates: normalizedCandidates.length > 0 ? normalizedCandidates : normalizedVariants,
    };
  }

  const bracketBlank = buildBracketBlankSentence(sentence, answer);
  if (bracketBlank) {
    return {
      ...question,
      sentence,
      answer,
      maskedSentence: bracketBlank,
      answerVariants: normalizedVariants,
      candidates: normalizedCandidates.length > 0 ? normalizedCandidates : normalizedVariants,
    };
  }

  // If the LLM put underscores into the sentence itself (instead of using
  // a separate maskedSentence), extract the blank position from there.
  const bracketBlankFromUnderscores = buildBracketBlankFromSentenceUnderscores(sentence, answer);
  if (bracketBlankFromUnderscores) {
    return {
      ...question,
      sentence,
      answer,
      maskedSentence: bracketBlankFromUnderscores,
      answerVariants: normalizedVariants,
      candidates: normalizedCandidates.length > 0 ? normalizedCandidates : normalizedVariants,
    };
  }

  const exactMasked = maskByExactAnswer(sentence, answer);
  if (exactMasked) {
    return {
      ...question,
      sentence,
      answer,
      maskedSentence: exactMasked,
      answerVariants: normalizedVariants,
      candidates: normalizedCandidates.length > 0 ? normalizedCandidates : normalizedVariants,
    };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const prompt = createRepairFillBlankPrompt({
      word: question.word,
      sentence,
      answer,
      attempt,
      maxRetries: MAX_RETRIES,
    });

    try {
      const payload = await generateFillBlankRepair(prompt);
      const extracted = extractRepairResult(sentence, payload);
      if (extracted) {
        return {
          ...question,
          sentence,
          answer: extracted.answer,
          maskedSentence: extracted.maskedSentence,
          answerVariants: normalizeUnique([extracted.answer, ...(question.answerVariants ?? [])]),
          candidates: normalizeUnique(question.candidates ?? question.answerVariants ?? [extracted.answer]),
        };
      }
    } catch {
      // Retry on model/API/parse errors.
    }
  }

  return {
    ...question,
    sentence,
    answer,
    maskedSentence: bracketBlank ?? question.maskedSentence,
    answerVariants: normalizedVariants,
    candidates: normalizedCandidates.length > 0 ? normalizedCandidates : normalizedVariants,
  };
}

function buildBeInflections(answer: string) {
  const normalized = normalizeSpaces(answer);
  if (!/^be\s+/i.test(normalized)) {
    return [];
  }

  const suffix = normalized.replace(/^be\s+/i, '').trim();
  if (!suffix) {
    return [];
  }

  return [
    `am ${suffix}`,
    `is ${suffix}`,
    `are ${suffix}`,
    `was ${suffix}`,
    `were ${suffix}`,
    `been ${suffix}`,
    `being ${suffix}`,
  ];
}

function ensureSingleBlankRun(maskedSentence: string) {
  const runs = maskedSentence.match(/_{6,}/g) ?? [];
  return runs.length === 1;
}

/** Candidate forms to search verbatim in the sentence: the answer, its
 *  variants, and the inflections of a leading "be" ("am ready" for "be
 *  ready"). Longest first so phrases outrank words. */
function buildListeningMaskCandidates(question: QuizDraftQuestion) {
  const base = normalizeUnique([
    question.answer,
    ...(question.answerVariants ?? []),
    ...buildBeInflections(question.answer),
  ]);
  return base.sort((a, b) => b.length - a.length);
}

/** Cheap last-resort matcher (no LLM): find the sentence word that plausibly
 *  corresponds to the answer's head token — verbatim or a common inflection
 *  (handed/hand, running/run, studies/study). Irregular forms (went/go,
 *  took/take) are the LLM repair's job, not this heuristics'. */
function maskByWordHeuristic(sentence: string, answer: string): { maskedSentence: string; surface: string } | null {
  const head = normalizeSpaces(answer).split(/\s+/)[0]?.toLowerCase();
  if (!head) {
    return null;
  }

  const words: Array<{ text: string; start: number; end: number }> = [];
  for (const match of sentence.matchAll(/[A-Za-z']+/g)) {
    if (match.index == null) {
      continue;
    }
    words.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  }

  for (const word of words) {
    const w = word.text.toLowerCase();
    const matches = w === head
      || (head.length >= 3 && w.startsWith(head))
      || w === `${head}s`
      || w === `${head}es`
      || w === `${head}ed`
      || (head.endsWith('e') && w === `${head}d`)
      || (head.endsWith('y') && w === `${head.slice(0, -1)}ied`)
      || (w.endsWith('ies') && head.endsWith('y') && w.slice(0, -3) === head.slice(0, -1));
    if (!matches) {
      continue;
    }

    const mask = '_'.repeat(Math.max(MIN_BLANK_LENGTH, word.text.length));
    const maskedSentence = `${sentence.slice(0, word.start)}${mask}${sentence.slice(word.end)}`;
    return { maskedSentence, surface: word.text };
  }

  return null;
}

export async function ensureListeningMaskedSentence(question: QuizDraftQuestion): Promise<QuizDraftQuestion> {
  if (question.type !== 'listening') {
    return question;
  }

  const sentence = normalizeSpaces(question.sentence);
  const originalAnswer = normalizeSpaces(question.answer);

  if (!sentence || !originalAnswer) {
    return {
      ...question,
      sentence,
      answer: originalAnswer,
    };
  }

  // The AI occasionally emits maskedSentence for listening questions even
  // though the prompt says not to. Adopt it when its blank lines up with a
  // surface form we can identify; keep it as-is otherwise.
  if (question.maskedSentence && ensureSingleBlankRun(question.maskedSentence)) {
    const provided = normalizeSpaces(question.maskedSentence);
    const heuristic = maskByWordHeuristic(sentence, originalAnswer);
    if (heuristic && provided.replace(/_+/g, '_') === heuristic.maskedSentence.replace(/_+/g, '_')) {
      return {
        ...question,
        sentence,
        answer: heuristic.surface,
        answerVariants: normalizeUnique([originalAnswer, heuristic.surface]),
        maskedSentence: provided,
      };
    }
    return {
      ...question,
      sentence,
      answer: originalAnswer,
      maskedSentence: provided,
    };
  }

  // 1) The target appears verbatim in the sentence — done, no LLM needed.
  for (const candidate of buildListeningMaskCandidates(question)) {
    const masked = maskByExactAnswer(sentence, candidate);
    if (masked) {
      return {
        ...question,
        sentence,
        answer: candidate,
        answerVariants: normalizeUnique([originalAnswer, candidate]),
        maskedSentence: masked,
      };
    }
  }

  // 2) LLM 挖空: the repair model re-blanks the sentence and returns the exact
  //    surface form hidden by the blank ("handed out" for "hand out"). We
  //    adopt that surface form as the answer — this is what makes the graded
  //    answer actually match the sentence.
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const prompt = createRepairFillBlankPrompt({
      word: question.word,
      sentence,
      answer: originalAnswer,
      attempt,
      maxRetries: MAX_RETRIES,
    });

    try {
      const payload = await generateFillBlankRepair(prompt);
      const extracted = extractRepairResult(sentence, payload);
      if (extracted && ensureSingleBlankRun(extracted.maskedSentence)) {
        return {
          ...question,
          sentence,
          answer: extracted.answer,
          answerVariants: normalizeUnique([originalAnswer, extracted.answer]),
          maskedSentence: extracted.maskedSentence,
        };
      }
    } catch {
      // Retry on model/API/parse errors.
    }
  }

  // 3) Deterministic safety net so a flaky/unsuccessful repair never leaves
  //    the learner with a sentence that has no blank at all.
  const heuristic = maskByWordHeuristic(sentence, originalAnswer);
  if (heuristic) {
    return {
      ...question,
      sentence,
      answer: heuristic.surface,
      answerVariants: normalizeUnique([originalAnswer, heuristic.surface]),
      maskedSentence: heuristic.maskedSentence,
    };
  }

  // 4) True last resort: the target word appears nowhere (even inflected) —
  //    keep the draft so audio still works; Retry is the recovery path.
  return {
    ...question,
    sentence,
    answer: originalAnswer,
    maskedSentence: sentence,
  };
}
