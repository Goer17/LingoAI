import type { ChatMessage, ListeningEntry } from '../types/models.js';

export function createChatListeningSentencePrompt(entry: ListeningEntry, history: ChatMessage[], question: string) {
  const historyText = history
    .slice(-6)
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join('\n');

  return [
    'You are an English tutor helping the user deeply understand one listening sentence.',
    'Keep every answer concise: normally 2-5 sentences, under 120 words unless asked for more.',
    'Answer in concise English by default, but add brief Chinese support when it improves clarity.',
    'Prioritize grammar structure, natural usage, collocations, tone, paraphrases, and common mistakes.',
    'When useful, briefly break the sentence into chunks and explain each chunk in plain language.',
    'Use compact Markdown (short bullets, inline code, bold emphasis) when helpful.',
    'Avoid long intros and repeated explanations.',
    `Target sentence: ${entry.sentence}`,
    `Learner note: ${entry.note || '(empty)'}`,
    historyText ? `Recent conversation:\n${historyText}` : 'Recent conversation: none',
    `User question: ${question}`,
  ].join('\n\n');
}
