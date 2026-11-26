import { quizAliasRepository, quizRepository } from '../db/repositories.js';
import { createId } from '../utils/id.js';
import { pickByFamiliarity } from '../utils/quizSelection.js';
import type { QuizQuestion, QuizSession, QuizSourceType, VocabularyEntry } from '../types/models.js';

/** Two thirds of the quiz follows familiarity (weakest first), the rest is a
 *  random draw over the remaining notebook — see `pickByFamiliarity`. */
export function pickQuizEntries(entries: VocabularyEntry[], limit = 10) {
  return pickByFamiliarity(
    entries.filter((entry) => !entry.known),
    limit,
  );
}

export function createQuizSession(questions: QuizQuestion[], sourceType: QuizSourceType = 'vocabulary_task') {
  const session: QuizSession = {
    id: createId('quiz'),
    createdAt: new Date().toISOString(),
    questionIds: questions.map((question) => question.id),
    questions,
    currentIndex: 0,
    sourceType,
    answers: [],
    completed: false,
  };

  quizRepository.save(session);
  return session;
}

export function getQuizSession(id: string) {
  const session = quizRepository.getById(id);
  if (!session) {
    return null;
  }

  const sourceType: QuizSourceType = session.sourceType === 'mistake_review'
    ? 'mistake_review'
    : session.sourceType === 'listening_task'
      ? 'listening_task'
      : 'vocabulary_task';

  return {
    ...session,
    sourceType,
  };
}

/** Persist an updated session (used when Retry back-fills question assets). */
export function updateQuizSession(session: QuizSession) {
  quizRepository.save(session);
  return session;
}

export function normalizeQuizResponse(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Stable content key so an alias learned in one quiz applies to the same
 *  question content in a future quiz (question ids change every session). */
export function quizAnswerKey(question: Pick<QuizQuestion, 'type' | 'word' | 'sentence' | 'answer'>): string {
  return [question.type, question.word, question.sentence, question.answer]
    .map(normalizeQuizResponse)
    .join('\u0000');
}

/** Persist an answer accepted through appeal so auto-grading accepts it next time. */
export function rememberAcceptedQuizAnswer(question: QuizQuestion, response: string): void {
  const normalized = normalizeQuizResponse(response);
  if (!normalized) return;
  quizAliasRepository.add(quizAnswerKey(question), response.trim(), normalized);
}

/** Also expose the accepted answer on the current question for immediate reuse. */
export function addQuizAnswerVariant(
  id: string,
  questionId: string,
  response: string,
): QuizSession | null {
  const session = getQuizSession(id);
  if (!session) return null;
  const question = session.questions.find((item) => item.id === questionId);
  if (!question) return session;
  const normalized = normalizeQuizResponse(response);
  if (!normalized) return session;
  const existing = [question.answer, ...(question.answerVariants ?? [])]
    .map(normalizeQuizResponse);
  if (existing.includes(normalized)) return session;
  const updated: QuizSession = {
    ...session,
    questions: session.questions.map((item) => (
      item.id === questionId
        ? { ...item, answerVariants: [...(item.answerVariants ?? []), response.trim()] }
        : item
    )),
  };
  quizRepository.save(updated);
  return updated;
}

export function submitQuizAnswer(
  id: string,
  payload: { questionId: string; response: string },
): QuizSession | null {
  const session = getQuizSession(id);
  if (!session) {
    return null;
  }

  const question = session.questions.find((item) => item.id === payload.questionId);
  if (!question) {
    return session;
  }

  const alreadyAnswered = session.answers.some((item) => item.questionId === payload.questionId);
  if (alreadyAnswered) {
    return session;
  }

  const normalizedAnswer = normalizeQuizResponse(payload.response);
  const expectedSet = new Set([
    normalizeQuizResponse(question.answer),
    ...(question.answerVariants ?? []).map(normalizeQuizResponse),
    ...quizAliasRepository.listForQuestion(quizAnswerKey(question)).map(normalizeQuizResponse),
  ]);
  const isCorrect = expectedSet.has(normalizedAnswer);

  const nextAnswers = [
    ...session.answers,
    {
      questionId: payload.questionId,
      response: payload.response,
      isCorrect,
    },
  ];

  const updated: QuizSession = {
    ...session,
    answers: nextAnswers,
    currentIndex: Math.min(session.currentIndex + 1, session.questions.length),
    completed: nextAnswers.length >= session.questions.length,
  };

  quizRepository.save(updated);
  return updated;
}

/**
 * Re-grade an already submitted answer after a successful learner appeal.
 * Only the stored correctness flag changes; the submitted response and the
 * session's progress stay untouched.
 */
export function setQuizAnswerCorrectness(
  id: string,
  questionId: string,
  isCorrect: boolean,
): QuizSession | null {
  const session = getQuizSession(id);
  if (!session) {
    return null;
  }

  const hasAnswer = session.answers.some((item) => item.questionId === questionId);
  if (!hasAnswer) {
    return session;
  }

  const updated: QuizSession = {
    ...session,
    answers: session.answers.map((item) => (
      item.questionId === questionId ? { ...item, isCorrect } : item
    )),
  };

  quizRepository.save(updated);
  return updated;
}

/** Persist a freshly regenerated illustration on a quiz question. */
export function setQuizQuestionImage(
  id: string,
  questionId: string,
  imageUrl: string,
): QuizSession | null {
  const session = getQuizSession(id);
  if (!session) {
    return null;
  }

  const updated: QuizSession = {
    ...session,
    questions: session.questions.map((question) => (
      question.id === questionId ? { ...question, imageUrl } : question
    )),
  };

  quizRepository.save(updated);
  return updated;
}
