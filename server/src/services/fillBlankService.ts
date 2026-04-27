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

export async function ensureFillBlankMaskedSentence(question: QuizDraftQuestion): Promise<QuizDraftQuestion> {
  if (question.type !== 'fill_blank') {
    return question;
  }

  const sentence = normalizeSpaces(question.sentence);
  const answer = normalizeSpaces(question.answer);
  const exactMasked = maskByExactAnswer(sentence, answer);
  if (exactMasked) {
    return {
      ...question,
      sentence,
      answer,
      maskedSentence: exactMasked,
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
  };
}
