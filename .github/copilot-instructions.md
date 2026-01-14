<!-- Copilot / AI agent instructions for CasaVidal backend -->
# CasaVidal Backend — AI Coding Assistant Guide

This file contains concise, repo-specific instructions to help an AI agent be productive when making changes.

1) Big picture
- **Stack:** Node.js + TypeScript + Express for HTTP API, Prisma + PostgreSQL for DB (Neon recommended). See [package.json](package.json) and [prisma/schema.prisma](prisma/schema.prisma).
- **Startup:** `src/server.ts` connects Prisma then starts the Express `app` exported from [src/app.ts](src/app.ts).
- **Config:** Environment variables are validated with Zod in [src/config/env.ts](src/config/env.ts). Any new env var must be added there and validated.

2) Key files & patterns (where to make changes)
- `src/app.ts`: register new routes and middleware. Routes follow `/api/...` and rate-limiting is applied to `/api/`.
- `src/server.ts`: handles DB connect and server boot; ensure `prisma.$connect()` remains called before listening.
- `src/config/database.ts`: single Prisma client instance; it logs queries in development and disconnects on `beforeExit`.
- `src/utils/jwt.ts`: centralized JWT helpers; update here if token shape or secret usage changes.
- `prisma/schema.prisma`: canonical source of truth for DB schema — run `npx prisma generate` and `npm run prisma:migrate` after edits.

3) Scripts & developer flows (explicit commands)
- Dev server: `npm run dev` (nodemon + `tsx` → hot reload of `src/server.ts`). See `package.json`.
- Build: `npm run build` (TypeScript compiler); Prod start: `npm start` uses `dist/server.js`.
- Prisma: `npm run prisma:generate`, `npm run prisma:migrate`, `npm run prisma:seed`, `npm run prisma:studio`.
- When changing Prisma models: 1) update `prisma/schema.prisma`, 2) run `npm run prisma:generate` and `npm run prisma:migrate`, 3) update any affected queries in services/controllers.

4) Project-specific conventions
- **Env validation:** `src/config/env.ts` uses Zod and exits on validation errors. Always add new env vars to this schema and provide sensible defaults.
- **Auth:** `src/utils/jwt.ts` signs `{ userId, role }` and reads `JWT_SECRET` + `JWT_EXPIRES_IN` from env. If you change token contents, update auth middleware and token consumers.
- **Prisma client:** use the single `prisma` export from [src/config/database.ts](src/config/database.ts) — don't instantiate new PrismaClient instances.
- **Routes registration:** add new route modules (controllers + routers) and import/register them in `src/app.ts`. Example: add `src/routes/auth.ts` then `app.use('/api/auth', authRoutes)` in `src/app.ts`.
- **Error handling:** use the project's middleware (`middleware/errorHandler.ts`) — return errors through the uniform handler.

5) Tests & debugging notes
- No test framework present by default. Use `npm run dev` and Postman/HTTPie for manual API testing.
- For database debugging, set `NODE_ENV=development` to enable Prisma query logs (configured in `src/config/database.ts`).

6) Safety & security reminders
- Keep `JWT_SECRET` ≥ 32 chars. Env schema enforces this — CI/dev agents must not override it with short values.
- CORS is restricted to `FRONTEND_URL` from env (see [src/app.ts](src/app.ts)); preserve this behavior when changing security-related middleware.

7) Making code changes (recommended checklist for AI agents)
- Short summary of change in PR title and description.
- If adding env var: update `src/config/env.ts` and README's setup notes.
- If modifying DB model: update `prisma/schema.prisma`, run migrations and `prisma generate`, and update affected services/controllers.
- If adding an API route: create route + controller + service (follow existing folder layout in `src/`), add route registration in `src/app.ts` and appropriate TypeScript types in `src/types/`.

8) Where to look for examples
- Auth flow: `src/utils/jwt.ts` and `src/middleware/authMiddleware.ts`.
- App boot & middleware: [src/app.ts](src/app.ts) and [src/server.ts](src/server.ts).
- DB and schema: `prisma/schema.prisma` and [src/config/database.ts](src/config/database.ts).

9) If uncertain, ask the maintainer
- Clarify expected token claims, migration strategy (squash vs incremental), or seed data assumptions before making breaking DB changes.

---
If anything in this guide is unclear or incomplete, tell me what to expand (examples, exact route patterns, or specific coding style rules). 
