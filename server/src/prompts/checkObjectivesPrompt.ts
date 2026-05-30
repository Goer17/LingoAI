import type { ScenarioData } from '../types/models.js';

export interface ObjectiveCheckMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function createCheckObjectivesPrompt(
  scenario: ScenarioData,
  history: ObjectiveCheckMessage[],
) {
  const objectiveList = scenario.objectives
    .map((obj) => `- id: "${obj.id}", description: "${obj.description}"`)
    .join('\n');

  const conversation = history
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n');

  return [
    'You are evaluating whether a learner has accomplished specific conversational objectives.',
    'Return valid JSON only. No markdown, no extra text.',
    'Schema: {"completedObjectiveIds":["obj_1","obj_3"]}',
    'Rules:',
    '1) Only mark an objective as completed if the user has clearly and substantively addressed it in the conversation.',
    '2) Partial attempts do not count — the objective must be meaningfully fulfilled.',
    '3) Return an empty array if no objectives have been completed yet.',
    '4) Be fair but not overly strict — if the user made a reasonable attempt at the objective, count it.',
    '',
    'Objectives:',
    objectiveList,
    '',
    'Conversation so far:',
    conversation,
  ].join('\n');
}
