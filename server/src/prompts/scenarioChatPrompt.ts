import type { ScenarioData } from '../types/models.js';

export interface ScenarioChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function createScenarioChatMessages(
  scenario: ScenarioData,
  history: ScenarioChatMessage[],
  userMessage: string,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const objectiveList = scenario.objectives
    .map((obj, i) => `${i + 1}. ${obj.description}`)
    .join('\n');

  const system = [
    `You are role-playing as: ${scenario.assistantRole}.`,
    `The user is playing: ${scenario.userRole}.`,
    `Scenario: ${scenario.setting}`,
    '',
    'Stay in character throughout the conversation.',
    'Respond naturally as your character would in this situation.',
    'Use clear, natural English. Keep responses concise (1-4 sentences typically).',
    'Gently guide the conversation so the user has opportunities to accomplish these objectives:',
    objectiveList,
    '',
    'Do NOT mention the objectives directly or break character.',
    'If the user makes grammar mistakes, respond naturally without correcting them — corrections will come later.',
  ].join('\n');

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: system },
  ];

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: 'user', content: userMessage });

  return messages;
}
