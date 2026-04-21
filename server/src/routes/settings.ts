import { Router } from 'express';
import { z } from 'zod';
import { getSettings, saveSettings } from '../services/settingsService.js';
import { fail, ok } from '../utils/http.js';

const schema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  languageModel: z.string().min(1),
  audioModel: z.string().min(1),
});

export const settingsRouter = Router();

settingsRouter.get('/', (_req, res) => {
  const settings = getSettings();
  return ok(res, {
    ...settings,
    apiKey: settings.apiKey ? '********' : '',
  });
});

settingsRouter.post('/', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, parsed.error.issues[0]?.message ?? 'Invalid settings.');
  }

  const current = getSettings();
  const next = {
    ...current,
    ...parsed.data,
    apiKey: parsed.data.apiKey === '********' ? current.apiKey : parsed.data.apiKey,
    updatedAt: new Date().toISOString(),
  };

  saveSettings(next);
  return ok(res, {
    ...next,
    apiKey: next.apiKey ? '********' : '',
  });
});
