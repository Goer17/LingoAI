import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

export const env = {
  port: Number(process.env.PORT ?? 3000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  databasePath: process.env.DATABASE_PATH ?? path.join(root, 'server/data/lingoai.sqlite'),
  audioDirectory: process.env.AUDIO_DIRECTORY ?? path.join(root, 'server/data/audio'),
  tokenPath: path.join(root, '.token'),
  legacySettingsPath: path.join(root, 'server/data/settings.json'),
  legacyVocabularyPath: path.join(root, 'server/data/vocabulary.json'),
  legacyQuizSessionsPath: path.join(root, 'server/data/quiz-sessions.json'),
};
