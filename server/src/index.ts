import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { bootstrapDatabase } from './db/bootstrap.js';
import { requireAuth } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { settingsRouter } from './routes/settings.js';
import { vocabularyRouter } from './routes/vocabulary.js';
import { validateAccessToken } from './services/tokenService.js';
import { fail, ok } from './utils/http.js';

bootstrapDatabase();

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '4mb' }));
app.use('/api/media', express.static(env.audioDirectory));
app.use((req, res, next) => {
  if (req.path === '/api/auth/login' || req.path === '/api/health' || req.path.startsWith('/api/media/')) {
    return next();
  }

  const token = req.header('x-access-token');
  if (!token || !validateAccessToken(token)) {
    return fail(res, 401, 'Unauthorized.');
  }

  return next();
});
app.use(requireAuth);

app.get('/api/health', (_req, res) => ok(res, { status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/vocabulary', vocabularyRouter);

app.listen(env.port, () => {
  console.log(`LingoAI server listening on http://localhost:${env.port}`);
});
