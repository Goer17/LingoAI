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

const sentenceMatchSchema = z.object({
  matchedIndices: z.array(z.number()),
});

interface LangClient {
  model: string;
  client: OpenAI;
  extraBody: Record<string, unknown>;
}

function parseExtraBody(json: string | undefined): Record<string, unknown> {
  if (!json) {
    return {};
  }
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function getLanguageClient(): LangClient {
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
    extraBody: parseExtraBody(entry.extraBody),
  };
}

async function requestJson<T>(prompt: string, parser: z.ZodSchema<T>): Promise<T> {
  const { client, model, extraBody } = getLanguageClient();
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
    ...extraBody,
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

export async function matchSentenceCandidates(prompt: string): Promise<{ matchedIndices: number[] }> {
  return requestJson(prompt, sentenceMatchSchema);
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
  const { client, model, extraBody } = getLanguageClient();
  const stream = await client.chat.completions.create({
    model,
    temperature: 0.7,
    stream: true,
    messages,
    ...extraBody,
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
  const { client, model, extraBody } = getLanguageClient();
  const response = await client.chat.completions.create({
    model,
    temperature: 0.6,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    ...extraBody,
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
  const { client, model, extraBody } = getLanguageClient();
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
    ...extraBody,
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
    normalized === 'gpt-4o-mini-tts' ||
    normalized.startsWith('tts-')
  );
}

const QWEN_TTS_VOICES = [
  'Cherry',
  'Stella',
  'Ethan',
] as const;

function looksLikeQwenTTS(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return normalized.includes('qwen') && normalized.includes('tts');
}

function pickVoiceForModel(model: string): string {
  if (looksLikeQwenTTS(model)) {
    const index = Math.floor(Math.random() * QWEN_TTS_VOICES.length);
    return QWEN_TTS_VOICES[index];
  }
  if (looksLikeOpenAITTS(model)) {
    const index = Math.floor(Math.random() * OPENAI_TTS_VOICES.length);
    return OPENAI_TTS_VOICES[index];
  }
  return 'alloy';
}

function pickRequestHeaders(model: string): Record<string, Record<string, string>> | undefined {
  if (looksLikeQwenTTS(model)) {
    return { headers: { Accept: 'application/json' } };
  }
  return undefined;
}

export async function generateAudioBase64(input: string): Promise<string> {
  const entry = getActiveModelEntry('audio');
  if (!entry || !entry.baseUrl || !entry.apiKey || !entry.model) {
    throw new Error('Audio model is not configured. Please pick one in Settings.');
  }

  // Aliyun Model Studio (DashScope / *maas.aliyuncs.com): TTS models like
  // qwen-audio-* do NOT expose the OpenAI-compatible /audio/speech route;
  // they use the native synchronous `SpeechSynthesizer` endpoint instead.
  if (isDashScopeBaseUrl(entry.baseUrl)) {
    return generateAudioViaDashScope(entry, input);
  }

  const client = new OpenAI({
    baseURL: entry.baseUrl,
    apiKey: entry.apiKey,
  });
  const extraBody = parseExtraBody(entry.extraBody);
  const voice = pickVoiceForModel(entry.model);
  const response = await client.audio.speech.create(
    {
      model: entry.model,
      voice,
      input,
      response_format: 'mp3',
      ...extraBody,
    },
    pickRequestHeaders(entry.model),
  );

  const buffer = await fetchAudioBytes(response);
  return buffer.toString('base64');
}

async function fetchAudioBytes(response: { headers: { get(name: string): string | null }; arrayBuffer(): Promise<ArrayBuffer>; json(): Promise<unknown> }): Promise<Buffer> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const json = (await response.json()) as Record<string, unknown>;
    const audioUrl = extractAudioUrl(json);
    if (audioUrl) {
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download TTS audio from URL (HTTP ${audioResponse.status})`);
      }
      return Buffer.from(await audioResponse.arrayBuffer());
    }
    throw new Error('TTS endpoint returned JSON but no audio URL was found in the response.');
  }

  return Buffer.from(await response.arrayBuffer());
}

function extractAudioUrl(json: Record<string, unknown>): string | null {
  const output = json.output as Record<string, unknown> | undefined;
  const audio = output?.audio as Record<string, unknown> | undefined;
  const url = audio?.url;
  if (typeof url === 'string' && url.length > 0) {
    return url;
  }
  return null;
}

export async function generateImageBase64(prompt: string): Promise<string> {
  const entry = getActiveModelEntry('image');
  if (!entry || !entry.baseUrl || !entry.apiKey || !entry.model) {
    throw new Error('Image model is not configured. Please pick one in Settings.');
  }

  // Aliyun Model Studio (DashScope / *maas.aliyuncs.com): image models like
  // wan2.7-image do NOT expose an OpenAI-compatible /images/generations route;
  // they use the native synchronous `multimodal-generation` endpoint and
  // require `width*height` (asterisk) sizes instead of `WxH`.
  if (isDashScopeBaseUrl(entry.baseUrl)) {
    return generateImageViaDashScope(entry, prompt);
  }

  const client = new OpenAI({
    baseURL: entry.baseUrl,
    apiKey: entry.apiKey,
  });
  const extraBody = parseExtraBody(entry.extraBody);

  const response = await client.images.generate({
    model: entry.model,
    prompt,
    n: 1,
    size: '1024x1024',
    ...extraBody,
  });

  const first = response.data?.[0];
  if (first?.b64_json) {
    return first.b64_json;
  }

  if (first?.url) {
    const imageResponse = await fetch(first.url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download generated image (HTTP ${imageResponse.status})`);
    }
    return Buffer.from(await imageResponse.arrayBuffer()).toString('base64');
  }

  throw new Error('Image model returned an empty payload.');
}

function isDashScopeBaseUrl(baseUrl: string): boolean {
  // Aliyun Model Studio gateways: dedicated MaaS endpoints (token-plan.*) and
  // the standard dashscope.aliyuncs.com host both expose the native
  // multimodal-generation image API rather than OpenAI /images/generations.
  return /(?:maas|dashscope)\.aliyuncs\.com/i.test(baseUrl);
}

export { isDashScopeBaseUrl };

interface ModelEntryLike {
  baseUrl: string;
  apiKey: string;
  model: string;
  extraBody?: string;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * DashScope native synchronous image generation:
 * POST {origin}/api/v1/services/aigc/multimodal-generation/generation
 * Body: {"model", "input": {"messages": [{role:'user', content:[{text}]}]},
 *        "parameters": {n, size: "1024*1024"}}
 * Response image comes back as an OSS URL inside output.choices[0].message.content.
 */
export async function generateImageViaDashScope(
  entry: ModelEntryLike,
  prompt: string,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const origin = new URL(entry.baseUrl).origin;
  const endpoint = `${origin}/api/v1/services/aigc/multimodal-generation/generation`;
  const extra = parseExtraBody(entry.extraBody);
  const size = normalizeDashScopeSize(String(extra.size ?? '1024x1024'));

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${entry.apiKey}`,
    },
    body: JSON.stringify({
      model: entry.model,
      input: {
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }],
          },
        ],
      },
      parameters: {
        ...extra,
        n: 1,
        size,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`DashScope image generation failed (HTTP ${response.status}). ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const imageUrl = (data?.output?.choices?.[0]?.message?.content as Array<{ type?: string; image?: string }> | undefined)
    ?.find((item) => item?.type === 'image')?.image;
  if (!imageUrl) {
    const raw = JSON.stringify(data).slice(0, 400);
    throw new Error(`DashScope image generation returned no image. ${raw}`);
  }

  const imageResponse = await fetchImpl(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download generated image (HTTP ${imageResponse.status}).`);
  }
  return Buffer.from(await imageResponse.arrayBuffer()).toString('base64');
}

/** DashScope wants "1024*1024"; tolerate OpenAI-style "1024x1024" from configs. */
function normalizeDashScopeSize(size: string): string {
  return size.trim().replace(/(\d+)x(\d+)/i, '$1*$2');
}

/**
 * Voice used when the audio model entry does not pin one via extraBody.voice.
 * `longanhuan_v3.6` is the only voice the token-plan MaaS gateway serves
 * for qwen-audio-3.0-tts-plus.
 */
export const DASHSCOPE_TTS_DEFAULT_VOICE = 'longanhuan_v3.6';

/**
 * DashScope native TTS:
 * POST {origin}/api/v1/services/audio/tts/SpeechSynthesizer
 * Body: {"model", "input": {"text", "voice", "format", "sample_rate"}}
 * Response: {"output": {"audio": {"url": <signed OSS download url>}}}
 * extraBody.voice / extraBody.format / extraBody.sampleRate can override defaults.
 */
export async function generateAudioViaDashScope(
  entry: ModelEntryLike,
  text: string,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const origin = new URL(entry.baseUrl).origin;
  const endpoint = `${origin}/api/v1/services/audio/tts/SpeechSynthesizer`;
  const extra = parseExtraBody(entry.extraBody);
  const format = String(extra.format ?? 'wav');
  const sampleRate = Number(extra.sampleRate ?? 24000);

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${entry.apiKey}`,
    },
    body: JSON.stringify({
      model: entry.model,
      input: {
        text,
        voice: String(extra.voice ?? DASHSCOPE_TTS_DEFAULT_VOICE),
        format,
        sample_rate: sampleRate,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`DashScope TTS failed (HTTP ${response.status}). ${detail.slice(0, 300)}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const audioUrl = extractAudioUrl(data);
  if (!audioUrl) {
    const raw = JSON.stringify(data).slice(0, 400);
    throw new Error(`DashScope TTS returned no audio URL. ${raw}`);
  }

  const audioResponse = await fetchImpl(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download TTS audio (HTTP ${audioResponse.status}).`);
  }
  return Buffer.from(await audioResponse.arrayBuffer()).toString('base64');
}
