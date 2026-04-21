import type { ChatMessage, VocabularyEntry } from '../types/models.js';

export function createChatWordPrompt(entry: VocabularyEntry, history: ChatMessage[], question: string) {
  const historyText = history
    .slice(-6)
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join('\n');

  return [
    'You are an English tutor helping the user understand one vocabulary item.',
    'Answer in concise English by default, but include short Chinese support when it helps clarify meaning or nuance.',
    'Focus on usage, collocations, pitfalls, tone, and comparisons with similar expressions.',
    'Keep the response plain text only.',
    `Target entry: ${entry.text}`,
    `Pronunciation: ${entry.pronunciation}`,
    `Meanings: ${JSON.stringify(entry.meanings)}`,
    `Derivatives: ${JSON.stringify(entry.derivatives)}`,
    historyText ? `Recent conversation:\n${historyText}` : 'Recent conversation: none',
    `User question: ${question}`,
  ].join('\n\n');
}
