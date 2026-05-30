import type { WritingTopic } from '../types/models.js';

export function createGenerateScenarioPrompt(topic: WritingTopic) {
  const knowledgePoints = topic.knowledgePoints.map((item) => ({
    title: item.title,
    content: item.content,
  }));

  return [
    'You are designing a role-play conversation scenario for an English learner.',
    'Return valid JSON only. No markdown, no extra text.',
    'Create a realistic everyday scenario where the learner must use the knowledge points in conversation.',
    'The scenario should feel natural — like something that could happen in real life.',
    'Schema:',
    '{"setting":"string","userRole":"string","assistantRole":"string","objectives":[{"id":"obj_1","description":"string"}]}',
    'Rules:',
    '1) setting: 2-3 sentences describing the situation.',
    '2) userRole: a short description of who the learner plays (e.g., "A tourist checking into a hotel").',
    '3) assistantRole: a short description of who the AI plays (e.g., "Hotel front desk receptionist").',
    '4) objectives: 3-5 concrete conversational goals the learner must accomplish.',
    '5) Each objective must be specific and verifiable from the conversation (e.g., "Ask about room availability and prices" not "Have a good conversation").',
    '6) Objectives should require using vocabulary and expressions from the knowledge points.',
    '7) Objective ids must be obj_1, obj_2, obj_3, etc.',
    `Topic: ${topic.title}`,
    `Knowledge points: ${JSON.stringify(knowledgePoints)}`,
  ].join('\n');
}
