import type { ScenarioData } from '../types/models.js';

export function createPolishUserMessagesPrompt(
  scenario: ScenarioData,
  messages: string[],
) {
  const numbered = messages
    .map((msg, i) => `[${i}] ${msg}`)
    .join('\n');

  return [
    'You are an English writing coach. Review the learner\'s messages from a role-play conversation and provide light polishing.',
    'Return valid JSON only. No markdown, no extra text.',
    'Schema:',
    '{"results":[{"index":number,"original":"string","polished":"string","isPerfect":boolean,"explanation":"string"}]}',
    'Rules:',
    '1) One entry per message, in order, using the index provided.',
    '2) Only fix grammar errors and clearly unnatural phrasing. Do NOT change the meaning or rewrite for style.',
    '3) If the message has no meaningful issues, set isPerfect to true, polished to the original text, and explanation to an empty string.',
    '4) polished: the corrected version. Keep it as close to the original as possible.',
    '5) explanation: 1-3 short English sentences describing what was wrong. Empty string if isPerfect is true.',
    '6) Minor punctuation-only issues (e.g. missing comma before "please") count as perfect.',
    '',
    `Conversation context: ${scenario.setting}`,
    `Learner role: ${scenario.userRole}`,
    '',
    'Learner messages to review:',
    numbered,
  ].join('\n');
}
