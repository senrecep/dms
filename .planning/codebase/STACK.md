# Technology Stack

**Analysis Date:** 2026-02-27

## Languages

**Primary:**
- TypeScript 5.x - All application code (`src/`, `scripts/`)

**Secondary:**
- CSS (Tailwind v4) - Styling via `src/app/globals.css`
- SQL - Drizzle-generated migrations in `drizzle/`
- Shell - Docker entrypoint `docker-entrypoint-init.sh`

## Runtime

**Environment:**
- Bun 1.x (primary runtime for dev, worker, scripts, Docker)
- Node.js-compatible (Next.js standalone output runs on Node-compatible Bun)

**Package Manager:**
- Bun
- Lockfile: `bun.lock` (present, frozen in Docker)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework (App Router, Server Components, Server Actions)
- React 19.2.3 - UI library
- next-intl 4.8.2 - Internationalization (TR/EN) via `src/i18n/`

**UI Component Library:**
- shadcn/ui (new-york variant) - Components in `src/components/ui/`
- Tailwind CSS v4 - Utility-first CSS
- Radix UI 1.4.x - Headless primitives underlying shadcn
- Lucide React 0.564.x - Icon set
- tw-animate-css - Animation utilities

**Forms:**
- react-hook-form 7.x + @hookform/resolvers 5.x + Zod 4.x - Form validation pattern

**Tables:**
- @tanstack/react-table 8.x - Data table management

**State Management:**
- Zustand 5.x - Client-side state (stores in `src/stores/`)

**Testing:**
- None detected (see TESTING.md for details)

**Build/Dev:**
- drizzle-kit 0.31.x - DB migrations (`db:generate`, `db:migrate`, `db:push`)
- dotenv-cli 11.x - Env injection for local scripts
- tsx 4.x - TypeScript execution for scripts
- eslint 9.x + eslint-config-next 16.1.6 - Linting

## Key Dependencies

**Critical:**
- `better-auth` 1.4.18 - Authentication (email+password, session management)
- `drizzle-orm` 0.45.1 - ORM for PostgreSQL with type-safe queries
- `postgres` 3.4.8 - PostgreSQL client (used by Drizzle)
- `bullmq` 5.69.2 - Job queue (email, notifications) backed by Redis
- `ioredis` 5.9.3 - Redis client for BullMQ and pub/sub
- `nanoid` 5.1.6 - ID generation for all DB primary keys

**Email:**
- `resend` 6.9.2 - Transactional email API (primary provider)
- `nodemailer` 8.0.1 - SMTP fallback provider
- `@react-email/components` 1.0.7 - React-based email templates

**Export:**
- `xlsx` 0.18.5 - Excel export for document reports

**Notifications:**
- SSE (Server-Sent Events) via `src/app/api/sse/route.ts` + Redis pub/sub

**Date Handling:**
- `date-fns` 4.1.0

**Toast Notifications:**
- `sonner` 2.0.7

## Configuration

**Environment:**
- Validated at startup via Zod in `src/lib/env.ts`
- Required vars: `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`
- Optional: `RESEND_API_KEY`, `EMAIL_FROM`, `UPLOAD_DIR`, `MAX_FILE_SIZE_MB`, `CRON_SECRET`
- Example: `.env.example`

**Email Settings:**
- Stored in DB (`system_settings` table), not env vars
- Admin-configurable at `/settings` - provider (resend/smtp), SMTP host/port/auth, from address, language
- In-memory cache with 60-second TTL in `src/lib/email/config.ts`

**Build:**
- `next.config.ts` - `output: "standalone"` for Docker
- `drizzle.config.ts` - Schema glob: `./src/lib/db/schema/*`
- `eslint.config.mjs` - Next.js core-web-vitals + TypeScript rules
- `postcss.config.mjs` - Tailwind v4 PostCSS plugin
- `components.json` - shadcn/ui configuration (new-york style)
- `tsconfig.json` - Path alias `@/` → `src/`

## Platform Requirements

**Development:**
- Bun 1.x
- PostgreSQL (via Docker Compose: `docker-compose.yml`)
- Redis (via Docker Compose)
- `.env.local` for local environment variables

**Production:**
- Docker multi-stage build (4 stages: deps, build, runner, worker, init)
- Deployment target: Dokploy (`docker-compose.dokploy.yml`)
- Standalone Next.js server on port 3000
- Separate worker container (`src/worker.ts`) for BullMQ
- Init container for DB push + seed on first deploy

---

*Stack analysis: 2026-02-27*
