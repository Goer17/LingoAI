import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { bootstrapDatabase } from './db/bootstrap.js';
import { authRouter } from './routes/auth.js';
import { settingsRouter } from './routes/settings.js';
import { vocabularyRouter } from './routes/vocabulary.js';
import { writingRouter } from './routes/writing.js';
import { scanAndEnqueueMissing } from './services/autoImageService.js';
import { validateAccessToken } from './services/tokenService.js';
import { fail, ok } from './utils/http.js';

bootstrapDatabase();

const app = express();
const clientIndexPath = path.join(env.clientDistPath, 'index.html');
const hasClientDist = fs.existsSync(clientIndexPath);

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '4mb' }));
app.use('/api/media', express.static(env.audioDirectory));
app.use('/api/media', express.static(env.imageDirectory));
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/login' || req.path === '/health' || req.path.startsWith('/media/')) {
    return next();
  }

  const token = req.header('x-access-token');
  if (!token || !validateAccessToken(token)) {
    return fail(res, 401, 'Unauthorized.');
  }

  return next();
});

app.get('/api/health', (_req, res) => ok(res, { status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/vocabulary', vocabularyRouter);
app.use('/api/writing', writingRouter);

if (hasClientDist) {
  app.use(express.static(env.clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(clientIndexPath);
  });
}

app.listen(env.port, env.host, () => {
  console.log(`LingoAI server listening on http://${env.host}:${env.port}`);
  // Recover example images missed by an earlier run (server restart drops the
  // in-memory auto-generation queue; this healing pass re-queues the gaps).
  setTimeout(() => {
    try {
      const enqueued = scanAndEnqueueMissing(50);
      if (enqueued > 0) {
        console.log(`[auto-image] healing pass re-queued ${enqueued} example image(s)`);
      }
    } catch (error) {
      console.error('[auto-image] healing pass failed:', error instanceof Error ? error.message : error);
    }
  }, 2000);
});
