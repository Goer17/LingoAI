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

function buildListeningMaskCandidates(question: QuizDraftQuestion) {
  const base = normalizeUnique([
    question.answer,
    ...(question.answerVariants ?? []),
    ...buildBeInflections(question.answer),
  ]);
  return base.sort((a, b) => b.length - a.length);
}

function ensureSingleBlankRun(maskedSentence: string) {
  const runs = maskedSentence.match(/_{6,}/g) ?? [];
  return runs.length === 1;
}

export async function ensureListeningMaskedSentence(question: QuizDraftQuestion): Promise<QuizDraftQuestion> {
  if (question.type !== 'listening') {
    return question;
  }

  const sentence = normalizeSpaces(question.sentence);
  const normalizedAnswer = normalizeSpaces(question.answer);

  if (!sentence || !normalizedAnswer) {
    return {
      ...question,
      sentence,
      answer: normalizedAnswer,
    };
  }

  if (question.maskedSentence && ensureSingleBlankRun(question.maskedSentence)) {
    return {
      ...question,
      sentence,
      answer: normalizedAnswer,
      maskedSentence: normalizeSpaces(question.maskedSentence),
    };
  }

  for (const candidate of buildListeningMaskCandidates(question)) {
    const masked = maskByExactAnswer(sentence, candidate);
    if (masked) {
      return {
        ...question,
        sentence,
        answer: normalizedAnswer,
        maskedSentence: masked,
      };
    }
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const prompt = createRepairFillBlankPrompt({
      word: question.word,
      sentence,
      answer: normalizedAnswer,
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
          answer: normalizedAnswer,
          maskedSentence: extracted.maskedSentence,
        };
      }
    } catch {
      // Retry on model/API/parse errors.
    }
  }

  return {
    ...question,
    sentence,
    answer: normalizedAnswer,
    maskedSentence: sentence,
  };
}
