import type { WritingExercise } from '../types/models.js';

export function createEvaluateWritingSubmissionPrompt(exercise: WritingExercise, submission: string) {
  return [
    'You are an expert English writing evaluator.',
    'Evaluate the learner essay against the given topic and requirement.',
    'Return strict JSON only with no markdown.',
    'Scoring: 0 to 10, one decimal allowed.',
    'You must include grammar corrections and expression polishing suggestions.',
    'Provide a polished improved essay that keeps the learner core idea but improves grammar, coherence, and style.',
    'Schema:',
    '{"score":8.4,"topicAlignment":"string","summary":"string","strengths":["string"],"grammarCorrections":["string"],"expressionPolish":["string"],"improvedEssay":"string"}',
    'Rules:',
    '1) score must be between 0 and 10.',
    '2) strengths should have 2-5 concise items.',
    '3) grammarCorrections should have at least 3 actionable items when there are enough errors; otherwise explain key subtle corrections.',
    '4) expressionPolish should have 2-6 concrete rewrites or style improvements.',
    '5) topicAlignment must explicitly state whether the essay matches the topic requirement.',
    `Topic: ${exercise.topicTitle}`,
    `Requirement: ${exercise.requirement}`,
    `Target word count: ${exercise.targetWordCount}`,
    `Key points: ${JSON.stringify(exercise.keyPoints)}`,
    `Learner essay:\n${submission}`,
  ].join('\n\n');
}
