import OpenAI from 'openai';
import { z } from 'zod';
import { getActiveModelEntry } from './settingsService.js';
import type { PolishResult, QuizDraftQuestion, ScenarioSummary, SearchResult } from '../types/models.js';

const meaningSchema = z.object({
  partOfSpeech: z.string().min(1),
  englishMeaning: z.string().min(1),
  chineseMeaning: z.string().min(1),
  example: z.string().min(1),
  exampleTranslation: z.string().min(1),
});

const foundSearchResultSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['word', 'phrase']),
  found: z.literal(true),
  pronunciation: z.string().min(1),
  meanings: z.array(meaningSchema).min(1),
  derivatives: z.array(z.string()),
  ttsText: z.string().min(1),
  notFoundMessage: z.string().optional(),
});

const notFoundSearchResultSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['word', 'phrase']),
  found: z.literal(false),
  pronunciation: z.string().min(1),
  meanings: z.array(meaningSchema).length(0),
  derivatives: z.array(z.string()).length(0),
  ttsText: z.string().min(1),
  notFoundMessage: z.string().min(1),
});

const searchResultSchema = z.union([foundSearchResultSchema, notFoundSearchResultSchema]);

const quizSchema = z.object({
  questions: z.array(z.object({
    type: z.enum(['fill_blank', 'listening']),
    word: z.string().min(1),
    sentence: z.string().min(1),
    maskedSentence: z.string().min(1).optional(),
    answer: z.string().min(1),
    answerVariants: z.array(z.string().min(1)).optional(),
    candidates: z.array(z.string().min(1)).optional(),
    ttsText: z.string().optional(),
  })).min(1),
});

const fillBlankRepairSchema = z.object({
  maskedSentence: z.string().min(1),
  answer: z.string().min(1),
});

const scenarioSchema = z.object({
  setting: z.string().min(1),
  userRole: z.string().min(1),
  assistantRole: z.string().min(1),
  objectives: z.array(z.object({
    id: z.string().min(1),
    description: z.string().min(1),
  })).min(1),
});

const objectiveCheckSchema = z.object({
  completedObjectiveIds: z.array(z.string()),
});

const scenarioSummarySchema = z.object({
  overallAssessment: z.string().min(1),
  objectiveResults: z.array(z.object({
    objective: z.string().min(1),
    feedback: z.string().min(1),
  })).min(1),
  expressionSuggestions: z.array(z.string().min(1)).min(1),
  encouragement: z.string().min(1),
});

const polishResultsSchema = z.object({
  results: z.array(z.object({
    index: z.number(),
    original: z.string(),
    polished: z.string(),
    isPerfect: z.boolean(),
    explanation: z.string(),
  })).min(1),
});

function getLanguageClient() {
  const entry = getActiveModelEntry('language');
  if (!entry || !entry.baseUrl || !entry.apiKey || !entry.model) {
    throw new Error('Language model is not configured. Please pick one in Settings.');
  }

  return {
    model: entry.model,
    client: new OpenAI({
      baseURL: entry.baseUrl,
      apiKey: entry.apiKey,
    }),
  };
}

function getAudioClient() {
  const entry = getActiveModelEntry('audio');
  if (!entry || !entry.baseUrl || !entry.apiKey || !entry.model) {
    throw new Error('Audio model is not configured. Please pick one in Settings.');
  }

  return {
    model: entry.model,
    client: new OpenAI({
      baseURL: entry.baseUrl,
      apiKey: entry.apiKey,
    }),
  };
}

async function requestJson<T>(prompt: string, parser: z.ZodSchema<T>): Promise<T> {
  const { client, model } = getLanguageClient();
  const response = await client.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Return valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('The language model returned an empty response.');
  }

  return parser.parse(JSON.parse(content));
}

export async function searchWord(prompt: string): Promise<SearchResult> {
  return requestJson(prompt, searchResultSchema);
}

export async function generateQuiz(prompt: string): Promise<{ questions: QuizDraftQuestion[] }> {
  return requestJson(prompt, quizSchema);
}

export async function generateFillBlankRepair(prompt: string): Promise<{ maskedSentence: string; answer: string }> {
  return requestJson(prompt, fillBlankRepairSchema);
}

export async function generateScenario(prompt: string) {
  return requestJson(prompt, scenarioSchema);
}

export async function checkObjectives(prompt: string) {
  return requestJson(prompt, objectiveCheckSchema);
}

export async function summarizeScenario(prompt: string): Promise<ScenarioSummary> {
  return requestJson(prompt, scenarioSummarySchema);
}

export async function polishUserMessages(prompt: string): Promise<{ results: PolishResult[] }> {
  return requestJson(prompt, polishResultsSchema);
}

export async function streamScenarioChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  onDelta: (chunk: string) => void,
): Promise<string> {
  const { client, model } = getLanguageClient();
  const stream = await client.chat.completions.create({
    model,
    temperature: 0.7,
    stream: true,
    messages,
  });

  let fullText = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (!delta) {
      continue;
    }

    fullText += delta;
    onDelta(delta);
  }

  const output = fullText.trim();
  if (!output) {
    throw new Error('The language model returned an empty reply.');
  }

  return output;
}

export async function askWordChat(prompt: string): Promise<string> {
  const { client, model } = getLanguageClient();
  const response = await client.chat.completions.create({
    model,
    temperature: 0.6,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('The language model returned an empty reply.');
  }

  return content;
}

export async function streamWordChat(
  prompt: string,
  onDelta: (chunk: string) => void,
): Promise<string> {
  const { client, model } = getLanguageClient();
  const stream = await client.chat.completions.create({
    model,
    temperature: 0.6,
    stream: true,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  let fullText = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (!delta) {
      continue;
    }

    fullText += delta;
    onDelta(delta);
  }

  const output = fullText.trim();
  if (!output) {
    throw new Error('The language model returned an empty reply.');
  }

  return output;
}

const OPENAI_TTS_VOICES = [
  'alloy',
  'echo',
  'fable',
  'nova',
  'onyx',
  'shimmer',
] as const;

function looksLikeOpenAITTS(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized === 'tts-1' ||
    normalized === 'tts-1-hd' ||
    normalized.startsWith('tts-') ||
    normalized.includes('-tts') ||
    normalized.includes('gpt-4o-mini-tts')
  );
}

function pickVoiceForModel(model: string): string {
  if (!looksLikeOpenAITTS(model)) {
    return 'alloy';
  }
  const index = Math.floor(Math.random() * OPENAI_TTS_VOICES.length);
  return OPENAI_TTS_VOICES[index];
}

export async function generateAudioBase64(input: string): Promise<string> {
  const { client, model } = getAudioClient();
  const voice = pickVoiceForModel(model);
  const response = await client.audio.speech.create({
    model,
    voice,
    input,
    response_format: 'mp3',
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}
