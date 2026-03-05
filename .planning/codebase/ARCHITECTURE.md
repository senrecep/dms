# Architecture

**Analysis Date:** 2026-02-27

## Pattern Overview

**Overall:** Next.js App Router full-stack monolith with separate worker process

**Key Characteristics:**
- Server Components as default for all pages and layouts (zero client JS unless required)
- Server Actions for all mutations (no REST endpoints for business logic)
- Separate BullMQ worker process for async jobs (email, notifications)
- Redis pub/sub bridges the worker process to SSE connections in the Next.js server
- Document management domain with multi-step approval workflow

## Layers

**Presentation Layer (Pages):**
- Purpose: Route-level server components that fetch data and render UI
- Location: `src/app/(dashboard)/*/page.tsx`, `src/app/(auth)/*/page.tsx`
- Contains: Async server components, data fetching via Server Actions or direct DB calls
- Depends on: Server Actions (`src/actions/`), Components (`src/components/`)
- Used by: Next.js App Router

**UI Components:**
- Purpose: Reusable React components (both server and client)
- Location: `src/components/{domain}/` and `src/components/ui/` (shadcn)
- Contains: Feature components, layout components, shadcn primitives
- Depends on: Server Actions (for mutations), Zustand stores (client state)
- Used by: Pages, other components

**Server Actions:**
- Purpose: All data mutations and complex queries, executed on server
- Location: `src/actions/` (13 action files organized by domain)
- Contains: Zod validation, session auth checks, DB operations, queue enqueueing
- Depends on: `src/lib/db`, `src/lib/auth`, `src/lib/queue`, `src/lib/errors`
- Used by: Client components (via React's `action` prop or direct call)

**API Routes:**
- Purpose: Special endpoints not suited to Server Actions
- Location: `src/app/api/`
- Contains:
  - `auth/[...all]/route.ts` - Better Auth catch-all handler
  - `sse/route.ts` - SSE stream for real-time events
  - `files/[...path]/route.ts` - Authenticated file serving with range support
  - `documents/upload/route.ts` - Multipart file upload (FormData via HTTP)
  - `cron/route.ts` - Scheduled job trigger (Bearer token auth)
- Depends on: `src/lib/auth`, `src/lib/sse`, `src/lib/storage`, `src/lib/queue`

**Library / Infrastructure:**
- Purpose: Shared infrastructure, clients, and utilities
- Location: `src/lib/`
- Contains:
  - `db/` - Drizzle client + schema + seed
  - `auth/` - Better Auth configuration and session helper
  - `email/` - Email sending (Resend/SMTP), templates, config
  - `queue/` - BullMQ queue, worker, job processors, types
  - `jobs/` - Scheduled cron job business logic
  - `redis/` - Redis client singleton + pub/sub
  - `sse/` - SSE connection management + Redis pub/sub bridge
  - `storage/` - Local filesystem file operations
  - `env.ts` - Zod-validated environment variables
  - `errors.ts` - Shared error classification for actions and routes
  - `utils.ts` - Shared utility functions

**Worker Process:**
- Purpose: Background job processing (runs as separate container/process)
- Location: `src/worker.ts` → `src/lib/queue/worker.ts`
- Contains: BullMQ Worker listening on `dms-jobs` queue
- Job types: `send-email`, `send-bulk-email`, `create-notification`, `create-bulk-notifications`
- Depends on: `src/lib/queue/`, `src/lib/email/`, `src/lib/db/`, `src/lib/sse/`

**Stores (Client State):**
- Purpose: Zustand stores for browser-side state only
- Location: `src/stores/`
- Contains: `filter-store.ts`, `notification-store.ts`, `ui-store.ts`

## Data Flow

**Document Upload Flow:**
1. User submits form in `src/components/documents/upload-form.tsx` (client component)
2. `createDocument()` Server Action in `src/actions/documents.ts` is invoked
3. Action validates session + Zod schema
4. Pre-generates document ID with nanoid, saves file to local filesystem via `src/lib/storage/`
5. DB transaction: inserts `documents`, `document_revisions`, distribution lists, activity log
6. If `action=submit`: creates approval records, enqueues notifications + emails via `src/lib/queue/`
7. `revalidatePath("/documents")` triggers RSC re-render
8. BullMQ worker (separate process) picks up jobs → sends emails, creates DB notifications, pushes SSE events via Redis pub/sub
9. Client receives SSE event → Zustand notification store updates → UI updates

**Approval Workflow Flow:**
1. Document submitted → `PENDING_APPROVAL` status + approval record created
2. If preparer ≠ approver: two-step (PREPARER first, then APPROVER)
3. If preparer = approver: single-step (APPROVER only)
4. Preparer/Approver action in `src/actions/approvals.ts` → status transitions
5. On full approval → `APPROVED` status
6. Approver/Admin publishes → `PUBLISHED` status + read confirmations created for MANAGER users in distribution
7. Cron job (`/api/cron`) runs reminders and escalations via `src/lib/jobs/`

**Real-Time Notification Flow:**
1. Server Action or worker calls `sendToUser()` in `src/lib/sse/index.ts`
2. Publishes JSON to Redis channel `dms:notifications:{userId}`
3. SSE route (`/api/sse`) has active Redis subscription for that user
4. Encodes SSE message and streams to browser
5. Client `useSSE` hook in `src/hooks/use-sse.ts` receives event
6. `NotificationProvider` in `src/components/notifications/notification-provider.tsx` handles and updates Zustand store

**Authentication Flow:**
1. User POSTs credentials to `/api/auth/sign-in/email` (Better Auth catch-all)
2. Better Auth validates, creates session in DB (`session` table)
3. Session cookie set on browser
4. Dashboard layout (`src/app/(dashboard)/layout.tsx`) calls `getSession()` on every request
5. If no session or `isActive=false` → redirect to `/login`

**State Management:**
- Server state: fetched fresh per request via Server Components (no SWR/React Query)
- Client UI state: Zustand stores (`src/stores/`)
- Real-time state: SSE events → Zustand notification store

## Key Abstractions

**ActionResult:**
- Purpose: Typed return shape for all Server Actions
- Definition: `src/lib/errors.ts` - `ActionSuccess<T>` | `ActionError`
- Pattern: `{ success: true, ...data }` or `{ success: false, error, errorCode }`

**DocumentRevision:**
- Purpose: All mutable document data lives on revisions, not the master document
- Examples: `src/lib/db/schema/document-revisions.ts`, `src/lib/db/schema/documents.ts`
- Pattern: `documents` table is a thin master (ID, code, currentRevisionId); all content is in `document_revisions`

**Email Config (DB-driven):**
- Purpose: Email provider/settings are admin-configurable at runtime without redeployment
- Examples: `src/lib/email/config.ts`
- Pattern: Settings read from `system_settings` table, cached in-memory 60s

**Queue Enqueue Helpers:**
- Purpose: Type-safe wrappers around BullMQ queue
- Examples: `src/lib/queue/index.ts` - `enqueueEmail()`, `enqueueBulkEmail()`, `enqueueNotification()`, `enqueueBulkNotifications()`

## Entry Points

**Next.js App:**
- Location: `src/app/layout.tsx`
- Triggers: HTTP requests via Next.js server
- Responsibilities: Root HTML, fonts, PWA provider

**Dashboard Layout:**
- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: Any `/dashboard`, `/documents`, `/users`, etc. route
- Responsibilities: Session check, redirect if unauthenticated, sidebar/header, i18n, SSE notifications

**Auth Layout:**
- Location: `src/app/(auth)/layout.tsx`
- Triggers: `/login`, `/set-password` routes

**Worker Process:**
- Location: `src/worker.ts`
- Triggers: `bun run src/worker.ts` (separate process, Docker worker stage)
- Responsibilities: BullMQ job consumption, graceful shutdown on SIGTERM/SIGINT

**Cron Endpoint:**
- Location: `src/app/api/cron/route.ts`
- Triggers: External HTTP GET with `Authorization: Bearer {CRON_SECRET}`
- Responsibilities: Approval reminders, escalations, read reminders (run in parallel)

## Error Handling

**Strategy:** Classify and return, never throw to client

**Patterns:**
- Server Actions: `try/catch` → `classifyError()` → return `ActionError` object (never throw)
- Zod errors in actions: caught explicitly, mapped to `VALIDATION_ERROR` error code
- API Routes: `try/catch` → HTTP status codes mapped from error codes via `ERROR_HTTP_STATUS` map
- PostgreSQL errors: classified by error code (23505=duplicate, 23503=FK violation, 23502=null)
- Notification/email failures: wrapped in `try/catch` with `console.error`, never fail the main action
- Worker jobs: throw to BullMQ → automatic retry handling

## Cross-Cutting Concerns

**Logging:** `console.log/error/warn` with bracketed prefix (`[Worker]`, `[Cron]`, `[Redis]`, etc.)

**Validation:**
- All user input validated with Zod at Server Action and API Route boundaries
- Environment variables validated at startup via `src/lib/env.ts`
- DB schema uses enums and constraints for data integrity

**Authentication:**
- Session checked in `(dashboard)/layout.tsx` server-side on every route
- Server Actions call `getSession()` as first step
- API routes call `auth.api.getSession({ headers })` before any logic
- CSRF protection via Better Auth built-in

**i18n:**
- All user-facing strings use `next-intl` `useTranslations()` hook
- Message files: `src/i18n/messages/en.json`, `src/i18n/messages/tr.json`
- Email templates have separate translation system via `src/lib/email/translations.ts`

**Soft Delete:**
- Documents and departments use `isDeleted=true` + `deletedAt` timestamp (never hard DELETE)
- `isDeleted` indexed for query performance

**Activity Logging:**
- All document mutations log to `activity_logs` table with `userId`, `action`, `details` (JSONB)

---

*Architecture analysis: 2026-02-27*
