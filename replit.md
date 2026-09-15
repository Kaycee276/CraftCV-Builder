# CraftCV

CraftCV helps job seekers turn a conversation about their experience into a polished CV they can download and keep.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/craftcv run dev` — run the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/craftcv/src/` — React routes, shared authenticated shell, CV preview, and theme
- `artifacts/api-server/src/routes/craftcv.ts` — auth, chat, CV generation, history, and account routes
- `artifacts/api-server/src/lib/auth.ts` — local email/password hashing and cookie sessions
- `lib/db/src/schema/craftcv.ts` — PostgreSQL schema for users, sessions, messages, and CV versions
- `lib/api-spec/openapi.yaml` — source of truth for the generated API client and validation schemas

## Architecture decisions

- Email/password auth uses server-side scrypt hashes and database-backed httpOnly cookie sessions.
- Google OAuth and password reset are intentionally not included in this first build.
- CV versions are append-only; each generation creates a new version instead of overwriting history.
- Gemini powers both the coach replies and structured CV extraction from the server; the browser never receives the API key.

## Product

- Public landing page with CraftCV positioning and a start flow
- Sign up, sign in, sign out, protected routes, and account deletion
- Persistent conversational CV coach with message history
- CV generation, styled preview, browser download, saved version history, and delete/preview actions
- Responsive mobile and desktop layouts with editorial typography and warm parchment styling

## User preferences

- Keep data local for now.
- Use email and password authentication instead of Google OAuth.
- Use Gemini for conversational coaching and CV generation.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- Run `pnpm --filter @workspace/db run push` after changing `lib/db/src/schema/`.
- The API is routed under `/api`; the web app uses relative API URLs and cookie sessions.
- `GEMINI_API_KEY` must exist as a project secret for chat replies and CV generation.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
