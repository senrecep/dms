# External Integrations

**Analysis Date:** 2026-02-27

## APIs & External Services

**Email:**
- Resend - Transactional email (primary provider)
  - SDK/Client: `resend` npm package
  - Auth: `RESEND_API_KEY` (stored in DB `system_settings`, not env)
  - Batch send: `resend.batch.send()` for bulk notifications
  - Implementation: `src/lib/email/index.ts`

- SMTP (Nodemailer) - Transactional email (fallback provider)
  - SDK/Client: `nodemailer` npm package
  - Auth: `email_smtp_host`, `email_smtp_user`, `email_smtp_pass` (DB-stored)
  - Implementation: `src/lib/email/index.ts`

**Email Provider Selection:**
- Runtime-switchable between Resend and SMTP via admin panel
- Config cached in-memory (60s TTL) in `src/lib/email/config.ts`
- Email templates built with `@react-email/components` in `src/lib/email/templates/`

## Data Storage

**Databases:**
- PostgreSQL (primary datastore)
  - Connection: `DATABASE_URL` env var
  - Client: Drizzle ORM (`drizzle-orm` + `postgres` driver)
  - Config: `drizzle.config.ts`
  - Schema: `src/lib/db/schema/` (15 schema files)
  - Migrations: `drizzle/` directory

**File Storage:**
- Local filesystem (not cloud storage)
  - Upload directory: `UPLOAD_DIR` env var (default: `./uploads`)
  - Structure: `uploads/{year}/{month}/{nanoid}/`
  - Served via authenticated API route: `src/app/api/files/[...path]/route.ts`
  - Max size: `MAX_FILE_SIZE_MB` env var (default: 500 MB)
  - Implementation: `src/lib/storage/index.ts`

**Caching / Message Bus:**
- Redis
  - Connection: `REDIS_URL` env var
  - Client: `ioredis` npm package
  - Usage 1: BullMQ job queue backend (`dms-jobs` queue)
  - Usage 2: Pub/Sub for SSE real-time notifications (`src/lib/redis/pubsub.ts`)
  - Singleton pattern: `src/lib/redis/index.ts` (`getRedis()`)

## Authentication & Identity

**Auth Provider:**
- Better Auth (self-hosted, no external auth service)
  - Implementation: `src/lib/auth/index.ts`
  - Auth: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
  - Adapter: Drizzle ORM adapter (`better-auth/adapters/drizzle`)
  - Strategy: Email + password only
  - Session: 7-day expiry, 1-day update age
  - API catch-all: `src/app/api/auth/[...all]/route.ts`
  - Custom user fields: `role` (ADMIN/MANAGER/USER), `departmentId`, `isActive`

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, Datadog, etc.)

**Logs:**
- `console.log/warn/error` throughout server-side code
- Log prefixes used for context: `[Redis]`, `[Worker]`, `[Email:Resend]`, `[Email:SMTP]`, `[Cron]`, `[ApprovalReminder]`
- No structured logging library detected

## CI/CD & Deployment

**Hosting:**
- Dokploy (`docker-compose.dokploy.yml`)
- Docker multi-stage builds (`Dockerfile`)
  - Stage `runner`: Next.js standalone app (port 3000)
  - Stage `worker`: BullMQ worker (`src/worker.ts`)
  - Stage `init`: DB push + seed (one-time, `docker-entrypoint-init.sh`)

**CI Pipeline:**
- Not detected (no GitHub Actions, CircleCI, etc.)

**Production Compose:**
- `docker-compose.production.yml` for standard production
- `docker-compose.dokploy.yml` for Dokploy-managed deployment

## Background Jobs (Internal)

**BullMQ Queue (`dms-jobs`):**
- Job types defined in `src/lib/queue/`:
  - `send-email` - Send single email via Resend/SMTP
  - `send-bulk-email` - Send batch emails
  - `create-notification` - Insert DB notification + SSE push
  - `create-bulk-notifications` - Bulk insert + SSE push
- Worker: `src/worker.ts` → `src/lib/queue/worker.ts`
- Concurrency: 5 parallel jobs

**Scheduled Jobs (Cron):**
- Endpoint: `GET /api/cron` (authenticated with `CRON_SECRET` Bearer token)
- Jobs run in parallel via `Promise.allSettled`:
  - `runApprovalReminders()` - `src/lib/jobs/approval-reminder.ts`
  - `runApprovalEscalations()` - `src/lib/jobs/approval-escalation.ts`
  - `runReadReminders()` - `src/lib/jobs/read-reminder.ts`
- External cron trigger required (not self-managed, no cron daemon detected)

## Real-Time Communication

**SSE (Server-Sent Events):**
- Endpoint: `GET /api/sse` (`src/app/api/sse/route.ts`)
- Authentication required (Better Auth session)
- Redis pub/sub channels:
  - `dms:notifications:{userId}` - Per-user notifications
  - `dms:approvals` - Approval updates (filtered by targetUserId client-side)
- Client hook: `src/hooks/use-sse.ts`
- Events: `NOTIFICATION`, `APPROVAL_UPDATE`, `DOCUMENT_STATUS`, `READ_CONFIRMATION`

## Webhooks & Callbacks

**Incoming:**
- None (no external webhook receivers detected)

**Outgoing:**
- None (no outbound webhooks detected)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `BETTER_AUTH_SECRET` - Min 32 chars auth secret
- `BETTER_AUTH_URL` - App base URL for Better Auth
- `NEXT_PUBLIC_APP_URL` - Public app URL (client-side)

**Optional env vars:**
- `NEXT_PUBLIC_APP_NAME` - App display name (default: "DMS")
- `UPLOAD_DIR` - File storage path (default: `./uploads`)
- `MAX_FILE_SIZE_MB` - Upload limit (default: 500)
- `DEFAULT_REMINDER_DAYS` - Approval reminder threshold (default: 3)
- `DEFAULT_ESCALATION_DAYS` - Escalation threshold (default: 7)
- `CRON_SECRET` - Bearer token for cron endpoint
- `RESEND_API_KEY` - Only needed if using Resend at env level (usually DB-stored)

**Secrets location:**
- Runtime secrets in `.env.local` (development) or Docker environment (production)
- Email credentials stored in PostgreSQL `system_settings` table (admin-managed)

---

*Integration audit: 2026-02-27*
