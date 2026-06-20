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
      const response = await client.audio.speech.create({
        model: entry.model,
        voice: 'alloy',
        input: 'ok',
        response_format: 'mp3',
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) {
        throw new Error('Empty audio payload.');
      }
      return ok(res, { ok: true, latencyMs: Date.now() - startedAt, sample: `${buffer.length} bytes` });
    }

    const response = await client.images.generate({
      model: entry.model,
      prompt: 'a small grey square on a white background',
      n: 1,
      size: '256x256',
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

