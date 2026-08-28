import { Router } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
import { getRedactedSettings, getSettings, saveSettings } from '../services/settingsService.js';
import { fail, ok } from '../utils/http.js';

const modelEntrySchema = z.object({
  id: z.string().min(1),
  baseUrl: z.string().url().or(z.literal('')),
  apiKey: z.string(),
  model: z.string(),
  extraBody: z
    .string()
    .optional()
    .default('')
    .refine(
      (value) => {
        const trimmed = (value ?? '').trim();
        if (!trimmed) {
          return true;
        }
        try {
          const parsed = JSON.parse(trimmed);
          return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
        } catch {
          return false;
        }
      },
      { message: 'Extra body must be a JSON object or empty.' },
    ),
});

const modelCategorySchema = z.object({
  entries: z.array(modelEntrySchema),
  activeId: z.string().nullable(),
});

const schema = z.object({
  models: z.object({
    language: modelCategorySchema,
    audio: modelCategorySchema,
    image: modelCategorySchema,
  }),
});

const testSchema = z.object({
  category: z.enum(['language', 'audio', 'image']),
  entryId: z.string().min(1),
});

export const settingsRouter = Router();

settingsRouter.get('/', (_req, res) => {
  return ok(res, getRedactedSettings());
});

settingsRouter.post('/', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, parsed.error.issues[0]?.message ?? 'Invalid settings.');
  }

  const saved = saveSettings({
    models: parsed.data.models,
    updatedAt: null,
  });

  return ok(res, saved);
});

settingsRouter.post('/test', async (req, res) => {
  const parsed = testSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, parsed.error.issues[0]?.message ?? 'Invalid request.');
  }

  const settings = getSettings();
  const entry = settings.models[parsed.data.category].entries.find(
    (item) => item.id === parsed.data.entryId,
  );

  if (!entry) {
    return fail(res, 404, 'Model entry not found. Save your settings first.');
  }

  if (!entry.baseUrl || !entry.apiKey || !entry.model) {
    return fail(res, 400, 'Entry is missing Base URL, API Key, or Model.');
  }

  const client = new OpenAI({ baseURL: entry.baseUrl, apiKey: entry.apiKey });
  const startedAt = Date.now();

  try {
    if (parsed.data.category === 'language') {
      const response = await client.chat.completions.create({
        model: entry.model,
        messages: [
          { role: 'user', content: 'Reply with the single word "ok".' },
        ],
      });
      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Model returned no visible content (it may have exhausted its token budget on reasoning).');
      }
      return ok(res, { ok: true, latencyMs: Date.now() - startedAt, sample: content.slice(0, 80) });
    }

    if (parsed.data.category === 'audio') {
      const extraBody = (() => {
        const raw = entry.extraBody?.trim();
        if (!raw) return {};
        try { return JSON.parse(raw); } catch { return {}; }
      })();
      const isQwen = entry.model.toLowerCase().includes('qwen') && entry.model.toLowerCase().includes('tts');
      const qwenVoices = ['Cherry', 'Stella', 'Ethan'];
      const voice = isQwen ? qwenVoices[Math.floor(Math.random() * qwenVoices.length)] : 'alloy';
      const response = await client.audio.speech.create(
        {
          model: entry.model,
          voice,
          input: 'ok',
          response_format: 'mp3',
          ...extraBody,
        },
        isQwen ? { headers: { Accept: 'application/json' } } : undefined,
      );

      const contentType = response.headers.get('content-type') ?? '';
      let buffer: Buffer;

      if (contentType.includes('application/json')) {
        const json = (await response.json()) as Record<string, unknown>;
        const output = json.output as Record<string, unknown> | undefined;
        const audio = output?.audio as Record<string, unknown> | undefined;
        const audioUrl = audio?.url;
        if (typeof audioUrl !== 'string' || !audioUrl) {
          throw new Error('TTS returned JSON but no audio URL was found.');
        }
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          throw new Error(`Failed to download TTS audio from URL (HTTP ${audioResponse.status})`);
        }
        buffer = Buffer.from(await audioResponse.arrayBuffer());
      } else {
        buffer = Buffer.from(await response.arrayBuffer());
      }

      if (!buffer.length) {
        throw new Error('Empty audio payload.');
      }
      return ok(res, { ok: true, latencyMs: Date.now() - startedAt, sample: `${buffer.length} bytes` });
    }

    const extraBody = (() => {
      const raw = entry.extraBody?.trim();
      if (!raw) return {};
      try { return JSON.parse(raw); } catch { return {}; }
    })();
    const response = await client.images.generate({
      model: entry.model,
      prompt: 'a small grey square on a white background',
      n: 1,
      size: '1024x1024',
      ...extraBody,
    });
    const first = response.data?.[0];
    if (!first?.url && !first?.b64_json) {
      throw new Error('Empty image payload.');
    }
    return ok(res, { ok: true, latencyMs: Date.now() - startedAt, sample: 'image generated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Test failed.';
    return ok(res, { ok: false, latencyMs: Date.now() - startedAt, error: message });
  }
});

