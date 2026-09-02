# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

LingoAI is a full-stack English learning app: vocabulary collection, AI-assisted definitions, tutor chat, TTS pronunciation, quizzes, listening practice, and scenario-based conversation exercises. Single-user, token-authenticated.

## Commands

```bash
npm install                        # install all workspace deps
npm run dev                        # run client (:5173) + server (:3000) together
npm run build                      # build both workspaces (client then server)
npm run start                      # start production server from server/dist
npm run dev --workspace client     # frontend only
npm run dev --workspace server     # backend only (tsx watch)
```

No test suite exists. Manual verification: `npm run build`, `npm run dev`, login with `.token`, test the changed flow end to end.

**Branch discipline:** Before starting any development or deployment work, make sure you are on the `deploy` branch (`git switch deploy`). Do not start working on `main`; development and deployment both happen on `deploy`, and changes flow to `main` only when needed.

For production update/deployment, use the `deploy` branch and follow `UPDATE.md`.

Before every `git push`, prefix with `GIT_SSH_COMMAND="ssh -v"`.

## Architecture

**Monorepo** with npm workspaces: `client/` (Vue 3 + Vite) and `server/` (Express + TypeScript). Node 25+.

### Backend (server/src/)

Request flow: **route → service → repository → SQLite** (via `node:sqlite` `DatabaseSync`).

- `routes/` — HTTP endpoints. Validate with `zod`. Use `ok()`/`fail()` response helpers from `utils/http.ts`.
- `services/` — Feature logic. `openaiService.ts` is the single LLM gateway: wraps `openai` SDK, every structured call goes through `requestJson()` which enforces `response_format: json_object` and validates output with zod. Streaming chat uses SSE (`text/event-stream`).
- `db/database.ts` — SQLite schema (inline `CREATE TABLE IF NOT EXISTS`). No migration framework; schema changes go here with `ALTER TABLE` in try/catch for idempotency.
- `db/repositories.ts` — Typed read/write against SQLite tables. Domain objects carry a `payload_json` TEXT column for flexible nested data (meanings, chat history, knowledge points).
- `prompts/` — LLM prompt builders. Each exported as `create*Prompt`. Prompt text stays out of routes and services.
- `middleware/auth.ts` — Token validation via `x-access-token` header. Public routes: `/auth/login`, `/health`, `/media/*`.
- `config/env.ts` — All env config with defaults. Database at `server/data/lingoai.sqlite`, audio files at `server/data/audio/`.

LLM integration: app uses OpenAI-compatible API. Model settings (base URL, API key, language model, audio model) are stored in SQLite and configured via the Setting page, not env vars.

### Audio Resolution Chain (common → compound → tts)

Word/phrase pronunciation audio is resolved in this order, never TTS-first:

1. **Common clip** — exact match in `server/data/audio/common/{word}.mp3` (large Youdao-corpus: ~126k-word frequency list in `server/src/data/common-words.json`, downloaded by `server/scripts/download-common-audio.mjs`).
2. **Compound splice** — multi-word phrases (e.g. `turn over`, `see-through`, `i've had`) have no dedicated clip; `compoundAudioService.buildCompoundAudio()` stitches the individual word clips: decode (mpg123-decoder WASM) → resample to 48kHz → trim silence → 90ms gap → peak-normalize → WAV → cache at `server/data/audio/compounds/{tokens}.wav` (served by `/api/media`). Max 6 tokens; contractions (`don't`) need their own `common/*.mp3` to work as tokens.
3. **TTS** — last resort via the configured audio model (sentences/listening stay TTS).

Both `POST /api/vocabulary/:id/audio` and `GET /api/vocabulary/common-audio` follow this chain. Pre-generate spliced audio for all multi-word rows in the DB: `node server/scripts/build-compound-audio.mjs` (after `npm run build`).

### Frontend (client/src/)

- `pages/` — Route-level screens (`*Page.vue`). Keep them thin.
- `components/` — Reusable UI. `WordDetailPanel`, `SentenceDetailPanel`, `SearchBar`, `QuizCard`, etc.
- `stores/` — Pinia stores (`auth`, `settings`, `vocabulary`). State transitions live here.
- `services/api.ts` — All backend calls. `http.ts` provides axios instance with token interceptor.
- `services/http.ts` — `unwrap()` helper that extracts `data` from `{ success, data }` responses.
- `router/` — Vue Router with auth guard. Quiz page uses `hideLayout` meta to strip nav chrome.
- `utils/audioCache.ts` — LRU cache for TTS audio blobs.
- `layouts/AppLayout.vue` — Nav bar wrapper. Quiz page renders outside this.

### Key Data Domains

| Domain | Backend service | SQLite table | Route prefix |
|---|---|---|---|
| Vocabulary | `vocabularyService` | `vocabulary_entries` | `/api/vocabulary` |
| Listening | `listeningService` | `listening_entries` | `/api/vocabulary/listening` |
| Writing/Expression | `writingService` | `writing_topics` | `/api/writing` |
| Quizzes | `quizService` | `quiz_sessions` | `/api/vocabulary/quiz` |
| Learning Tasks | `taskService` | `learning_tasks` | `/api/vocabulary/tasks` |
| Mistakes | `taskService` | `mistake_entries` | `/api/vocabulary/tasks` |

### Learning Task Pipeline

Quiz generation is async: client creates a learning task → server returns immediately → background generates quiz via LLM → marks task `ready` with `quizSessionId` → client polls and starts quiz. Three task types: `vocabulary`, `listening`, `expression` (scenario practice).

### SSE Streaming Pattern

Chat endpoints have paired routes: `/chat-word` (full response) and `/chat-word/stream` (SSE). SSE format: `data: {"type":"delta","content":"..."}`, `data: {"type":"done"}`, `data: {"type":"error","error":"..."}`.

## Conventions

- API responses: always `{ success: true, data }` or `{ success: false, error }`.
- Request validation: `zod` schemas in route files, `safeParse` pattern.
- LLM outputs: `zod` schemas in `openaiService.ts`, parsed defensively.
- Naming: `*Page.vue`, `*Service.ts`, `create*Prompt`, `*Repository`.
- Deletes use `POST /:id/delete` (not HTTP DELETE).
- IDs generated via `utils/id.ts` (`createId(prefix)`).
- Frontend/backend types are aligned by shape but never cross-imported.
- `payload_json` columns store flexible nested data (meanings, chat history, quiz questions). Repositories parse/serialize this.
- UI language is English. Gray/white monospace visual system. Chinese translations hidden by default.
- Keep feature stores isolated — don't mix vocabulary state into writing, etc.

## Adding a New AI Feature

1. Add a prompt builder in `server/src/prompts/` (`create*Prompt`).
2. Add a zod schema and wrapper function in `openaiService.ts`.
3. Add service logic in a dedicated `*Service.ts`.
4. Add route with zod request validation.
5. Add frontend API wrapper in `services/api.ts`.
6. Add store actions and page/component as needed.

## Adding Storage for a New Feature

1. Add `CREATE TABLE IF NOT EXISTS` in `db/database.ts`.
2. Add repository methods in `db/repositories.ts` (or a new repository file).
3. Use `payload_json TEXT` for flexible nested data that may evolve.
