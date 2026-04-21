# LingoAI

LingoAI is a full-stack English learning web app focused on vocabulary collection, AI-assisted explanations, tutor chat, pronunciation audio, and quizzes.

## Stack

- Frontend: Vue 3, Vite, Vue Router, Pinia, Axios
- Backend: Express, TypeScript
- Persistence: SQLite via `node:sqlite`
- AI integration: OpenAI-compatible Chat Completions and Speech APIs

## Features

- Access-token login with `.token`
- Model settings managed in the app `Setting` page
- Search word/phrase with structured AI output
- Save vocabulary with familiarity score
- Tutor chat per word with clear-history support
- TTS pronunciation playback (`🔊`) with LRU cache
- Quiz generation from low-familiarity words
- Familiarity update after answers

## Project Structure

```text
client/   Vue app
server/   Express API and SQLite persistence
plan.md   Original product plan
DEV.md    Development guide and conventions
```

## Requirements

- Node.js 25+
- npm 11+

## Access Token

The app requires a token from root `.token`.

If it does not exist:

```bash
openssl rand -base64 24 | tr -d '\n' > .token
```

## Install

```bash
npm install
```

## Run in Development

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## First-Run Setup

1. Login with the token from `.token`.
2. Open `Setting` page.
3. Fill and save:
   - `Base URL`
   - `API Key`
   - `Language Model`
   - `Audio Model`

Model configuration is persisted in SQLite. No `.env` file is required for model settings.

## Optional Runtime Environment Variables

These are optional process env vars for server runtime only:

- `PORT` (default `3000`)
- `CLIENT_ORIGIN` (default `http://localhost:5173`)
- `DATABASE_PATH` (default `server/data/lingoai.sqlite`)

Example:

```bash
PORT=3000 CLIENT_ORIGIN=http://localhost:5173 npm run dev
```

## Build

```bash
npm run build
```

## Run Production Server

```bash
npm run start
```

Starts backend from `server/dist`. Frontend static hosting should be handled separately.

## Persistence

Database file (default):

```text
server/data/lingoai.sqlite
```

Stored data:

- app settings
- vocabulary entries
- quiz sessions
- migration metadata

On first startup, legacy JSON files in `server/data/` are imported once.

## API Overview

- `POST /api/auth/login`
- `GET /api/settings`
- `POST /api/settings`
- `GET /api/vocabulary`
- `POST /api/vocabulary/search-word`
- `POST /api/vocabulary`
- `GET /api/vocabulary/:id`
- `POST /api/vocabulary/:id/note`
- `POST /api/vocabulary/:id/chat-word`
- `POST /api/vocabulary/:id/chat-word/clear`
- `POST /api/vocabulary/generate-audio`
- `POST /api/vocabulary/generate-quiz`
- `GET /api/vocabulary/quiz/:id`
- `POST /api/vocabulary/quiz/:id/answer`

## Development Notes

See `DEV.md` for architecture and extension rules.
