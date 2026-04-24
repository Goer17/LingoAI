import { quizRepository } from '../db/repositories.js';
import { createId } from '../utils/id.js';
import type { QuizQuestion, QuizSession, QuizSourceType, VocabularyEntry } from '../types/models.js';

export function pickQuizEntries(entries: VocabularyEntry[]) {
  return entries
    .slice()
    .sort((a, b) => a.familiarity - b.familiarity || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);
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

  const normalizedAnswer = payload.response.trim().replace(/\s+/g, ' ').toLowerCase();
  const expected = question.answer.trim().replace(/\s+/g, ' ').toLowerCase();
  const isCorrect = normalizedAnswer === expected;

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
