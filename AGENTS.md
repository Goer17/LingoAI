# Repository Guidelines

## Project Structure & Module Organization
- `client/`: Vue 3 + Vite frontend.
- `client/src/pages`: route-level screens (`*Page.vue`).
- `client/src/components`: reusable UI components.
- `client/src/stores`: Pinia state containers.
- `client/src/services`: HTTP client and API wrappers.
- `server/`: Express + TypeScript backend.
- `server/src/routes`: HTTP layer and request validation.
- `server/src/services`: feature/application logic.
- `server/src/db`: SQLite bootstrap and repository access.
- `server/src/prompts`: LLM prompt builders.
- Root docs: `README.md` (setup/run), `DEV.md` (architecture/conventions), `plan.md` (product scope).

## Build, Test, and Development Commands
- `npm install`: install all workspace dependencies.
- `npm run dev`: run frontend (`:5173`) and backend (`:3000`) together.
- `npm run build`: build both workspaces (`client` then `server`).
- `npm run start`: start backend from `server/dist/index.js`.
- Workspace-specific:
  - `npm run dev --workspace client`
  - `npm run dev --workspace server`

## Coding Style & Naming Conventions
- Language: TypeScript-first in both workspaces; Vue SFCs for UI.
- Keep routes thin, business logic in services, persistence in repositories.
- Naming patterns:
  - Pages: `*Page.vue`
  - Services: `*Service.ts`
  - Prompt builders: `create*Prompt`
- Keep frontend/backend types aligned by shape, but do not cross-import types between apps.
- API responses should keep the `{ success, data }` / `{ success, error }` pattern.

## Testing Guidelines
- No automated test suite exists yet.
- Minimum manual check for backend-impacting changes:
  1. `npm run build`
  2. `npm run dev`
  3. authenticate with `.token`
  4. verify the changed flow end to end
- Recommended future coverage: backend repository/migration tests, route integration tests, and frontend store tests.

## Commit & Pull Request Guidelines
- Current status: repository has no commit history on `main`; no established convention to infer.
- Use a consistent convention going forward, e.g. Conventional Commits:
  - `feat(vocabulary): add quiz retry endpoint`
  - `fix(client): handle expired token redirect`
- Before every `git push`, prefix the command with `GIT_SSH_COMMAND="ssh -v"` (example: `GIT_SSH_COMMAND="ssh -v" git push origin <branch>`).
- PRs should include:
  - concise summary of user-visible/backend behavior changes
  - linked issue/task (if available)
  - manual verification steps and results
  - screenshots/GIFs for UI changes

## Security & Configuration Tips
- Keep secrets in root `.env`; never commit API keys.
- Keep access token in root `.token` for local auth.
- Do not expose provider keys or provider-specific raw responses to the client.
