# Development Guide

## Goals

This codebase is intentionally structured for extension. New work should preserve these properties:

- clear frontend/backend separation
- stable API contracts
- model provider isolation
- persistence abstraction behind services/repositories
- modular feature growth without cross-cutting rewrites

## Architecture

### Frontend

Location: `client/src`

Key areas:

- `pages/`: route-level screens
- `components/`: reusable UI blocks
- `stores/`: Pinia state containers
- `services/`: HTTP client and API wrappers
- `router/`: route definitions and guards
- `types/`: shared frontend model types

Rules:

- Keep route pages thin.
- Put remote calls in `services/api.ts`.
- Put client state transitions in Pinia stores.
- Prefer presentational components over business-heavy components.

### Backend

Location: `server/src`

Key areas:

- `routes/`: HTTP endpoints and request validation
- `services/`: application logic
- `db/`: SQLite bootstrap and repositories
- `prompts/`: LLM prompt builders
- `types/`: backend domain types
- `middleware/`: auth and shared request concerns
- `utils/`: generic helpers

Rules:

- Routes validate and translate HTTP concerns only.
- Services contain feature logic.
- Repositories handle persistence details.
- Prompt text stays out of routes and components.

## Persistence Rules

The source of truth is SQLite.

Do not add direct file-based JSON persistence for feature data.

If a new feature requires storage:

1. extend the SQLite schema in `server/src/db/database.ts`
2. add repository methods in `server/src/db/repositories.ts` or a dedicated repository file
3. keep serialization formats explicit
4. preserve backward compatibility when possible

### Migration Policy

There is currently a one-time legacy JSON import marker:

- key: `legacy_json_import_v1`

If schema changes become more complex, introduce versioned migration markers in `app_meta`.

## API Rules

- Keep all responses in the `{ success, data }` or `{ success, error }` shape.
- Validate request payloads with `zod` in routes.
- Avoid leaking provider-specific data directly to the frontend.
- Do not expose the raw API key to the client.

## AI Integration Rules

- Keep prompt builders in `server/src/prompts/`.
- Require structured JSON for machine-readable model outputs.
- Parse model outputs defensively with `zod`.
- Keep provider configuration in settings, not hardcoded in prompts or routes.

When adding a new AI capability:

1. add a dedicated prompt builder
2. add a dedicated service function
3. add a dedicated API route with request validation
4. add frontend API wrappers and store actions only as needed

## Frontend Conventions

- UI copy should stay in English.
- Keep the visual system restrained and consistent with the current gray/white monospace direction.
- Hide Chinese support text by default when the feature expects that behavior.
- Quiz pages should stay focused and avoid the main app chrome.

## Type Conventions

- Prefer explicit interfaces for shared domain models.
- Keep frontend and backend models aligned, but do not import frontend types into the server or vice versa.
- Add new fields in a backward-compatible way whenever possible.

## Naming

- Use `*Page.vue` for route screens.
- Use `*Service.ts` for application logic.
- Use `*Repository` objects for persistence access.
- Use `create*Prompt` for prompt builder functions.

## Testing Guidance

There is no automated test suite yet.

Minimum manual verification for backend-impacting changes:

1. `npm run build`
2. `npm run dev`
3. login with `.token`
4. verify the touched flow end to end

Recommended next test targets:

- repository and migration tests
- route-level integration tests
- store-level frontend tests

## Safe Extension Points

Good future additions:

- more quiz question types
- grammar and writing sections
- spaced repetition scheduling
- tags, filters, and review history
- export/import tools

When adding new navigation areas, keep existing vocabulary flows isolated and avoid mixing unrelated state into the current vocabulary store.
