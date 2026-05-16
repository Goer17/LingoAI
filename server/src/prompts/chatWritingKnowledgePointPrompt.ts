import type { ChatMessage, WritingKnowledgePoint, WritingTopic } from '../types/models.js';

export function createChatWritingKnowledgePointPrompt(
  topic: WritingTopic,
  point: WritingKnowledgePoint,
  history: ChatMessage[],
  question: string,
) {
  const historyText = history
    .slice(-6)
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join('\n');

  return [
    'You are an English writing tutor helping the user understand one knowledge point.',
    'Keep answers concise: usually 2-5 short sentences unless the user asks for depth.',
    'Answer in English first, and add brief Chinese hints when useful for clarity.',
    'Focus on practical writing use: grammar choices, sentence patterns, tone, collocations, and pitfalls.',
    'Give examples that are directly related to the topic.',
    'Use compact Markdown when helpful.',
    `Topic: ${topic.title}`,
    `Knowledge point title: ${point.title}`,
    `Knowledge point content: ${point.content || '(empty)'}`,
    historyText ? `Recent conversation:\n${historyText}` : 'Recent conversation: none',
    `User question: ${question}`,
  ].join('\n\n');
}
