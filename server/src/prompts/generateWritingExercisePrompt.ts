import type { WritingTopic } from '../types/models.js';

export function createGenerateWritingExercisePrompt(topic: WritingTopic) {
  const knowledgePoints = topic.knowledgePoints.map((item) => ({
    title: item.title,
    content: item.content,
  }));

  return [
    'You are creating one English short-writing exercise.',
    'Return valid JSON only. No markdown, no extra text.',
    'The exercise must be strongly aligned with the given topic and knowledge points.',
    'Target length should be around 150 words.',
    'The requirement must clearly tell the learner what to include and what tone/register to use.',
    'Schema:',
    '{"requirement":"string","targetWordCount":150,"keyPoints":["string","string","..."]}',
    'Rules:',
    '1) targetWordCount should be between 140 and 170.',
    '2) keyPoints should contain 3-6 concrete checkpoints.',
    '3) Avoid vague prompts; make the task specific and actionable.',
    `Topic: ${topic.title}`,
    `Knowledge points: ${JSON.stringify(knowledgePoints)}`,
  ].join('\n');
}
