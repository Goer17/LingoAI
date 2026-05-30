import type { ScenarioData } from '../types/models.js';

export interface SummaryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function createSummarizeScenarioPrompt(
  scenario: ScenarioData,
  history: SummaryMessage[],
) {
  const objectiveList = scenario.objectives
    .map((obj) => `- ${obj.description}`)
    .join('\n');

  const conversation = history
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n');

  return [
    'You are an English conversation coach providing feedback on a role-play practice session.',
    'Return valid JSON only. No markdown, no extra text.',
    'Schema:',
    '{"overallAssessment":"string","objectiveResults":[{"objective":"string","feedback":"string"}],"expressionSuggestions":["string"],"encouragement":"string"}',
    'Rules:',
    '1) overallAssessment: 2-3 sentences summarizing how well the learner performed overall.',
    '2) objectiveResults: one entry per objective with specific feedback on how the learner handled it.',
    '3) expressionSuggestions: 3-5 concrete expression improvements — quote what the learner said and suggest a better alternative.',
    '4) encouragement: 1-2 sentences of positive encouragement.',
    '5) Be specific and constructive. Reference actual phrases from the conversation.',
    '',
    `Scenario: ${scenario.setting}`,
    `Learner role: ${scenario.userRole}`,
    '',
    'Objectives:',
    objectiveList,
    '',
    'Full conversation:',
    conversation,
  ].join('\n');
}
