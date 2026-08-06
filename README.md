# LingoAI

A full-stack English learning app. Look up words, save vocabulary, get AI explanations and pronunciation, and practise through quizzes, listening, writing, and scenario conversations.

## Features

- **Search & autocomplete** — type to get instant word suggestions, for both words and phrases
- **Pronunciation** — a bundled library of 40,000+ real voice recordings for common words, with AI speech fallback for everything else
- **AI explanations** — structured definitions, examples, parts of speech, and derivatives, in English or Chinese
- **AI tutor chat** — ask any word, sentence, or concept a follow-up question at any time
- **Vocabulary notebook** — save words, track familiarity, and review the ones you know least first
- **Quizzes** — auto-generated fill-in-the-blank and listening questions, with a mistakes notebook for review
- **Listening practice** — collect sentences, practise masked fill-in exercises, and track familiarity
- **Writing & expression** — build topic knowledge points, then train through role-play scenario conversations with AI feedback on your writing

## Quick Start

Requires **Node.js 25+**.

```bash
# 1. Install dependencies
npm install

# 2. Generate an access token (first run only)
openssl rand -base64 24 | tr -d '\n' > .token

# 3. Start the dev environment (frontend :5173, backend :3000)
npm run dev
```

Open `http://localhost:5173` and log in with the token from `.token`.

> On first use, open **Settings** to configure your AI models (Base URL, API key, language model, audio model). Settings are stored locally in SQLite — no environment variables required.

## Production

```bash
npm run build   # build client and server
npm run start   # run the production server on :3000
```

Optional env vars: `PORT`, `CLIENT_ORIGIN`, `DATABASE_PATH`.

## Project Layout

```text
client/   Vue 3 frontend
server/   Express + TypeScript backend, SQLite storage
```

## Docs

- `DEV.md` — architecture and development conventions
- `UPDATE.md` — production update and deployment flow