# Codebase Structure

**Analysis Date:** 2026-02-27

## Directory Layout

```
dms/
├── src/                        # All application source code
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth route group (login, set-password)
│   │   ├── (dashboard)/        # Protected app route group
│   │   └── api/                # API routes only (auth, SSE, files, cron, upload)
│   ├── actions/                # Server Actions (all mutations)
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   └── {domain}/           # Feature components (documents, approvals, users, etc.)
│   ├── hooks/                  # Custom React hooks
│   ├── i18n/                   # Internationalization
│   │   └── messages/           # en.json, tr.json
│   ├── lib/                    # Infrastructure and utilities
│   │   ├── auth/               # Better Auth config + session helper
│   │   ├── db/                 # Drizzle client + schema + seed
│   │   │   └── schema/         # One file per entity (15 files)
│   │   ├── email/              # Email sending + templates + config
│   │   │   └── templates/      # React Email templates (11 templates)
│   │   ├── jobs/               # Cron job business logic
│   │   ├── queue/              # BullMQ queue, worker, job processors
│   │   │   └── jobs/           # Individual job handlers
│   │   ├── redis/              # Redis client + pub/sub
│   │   ├── sse/                # SSE connection management
│   │   └── storage/            # Local filesystem file operations
│   ├── stores/                 # Zustand client-side stores
│   └── worker.ts               # BullMQ worker process entry point
├── drizzle/                    # Generated SQL migrations
│   └── meta/                   # Drizzle migration metadata
├── public/                     # Static assets
│   └── icons/                  # PWA icons
├── scripts/                    # Build-time scripts
├── uploads/                    # File storage (runtime, not committed)
├── docs/                       # Developer documentation
├── .claude/                    # Claude AI rules and agents
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Local development services
├── docker-compose.production.yml
├── docker-compose.dokploy.yml  # Dokploy production deployment
├── drizzle.config.ts           # Drizzle ORM config
├── next.config.ts              # Next.js config
├── package.json                # Bun package manifest
├── components.json             # shadcn/ui config
└── eslint.config.mjs           # ESLint config
```

## Directory Purposes

**`src/app/(auth)/`:**
- Purpose: Public auth pages (no authentication required)
- Contains: `login/page.tsx`, `set-password/page.tsx`, `layout.tsx`
- Key files: `src/app/(auth)/login/page.tsx`

**`src/app/(dashboard)/`:**
- Purpose: All protected application pages (requires active session)
- Contains: Feature pages organized by domain
- Key files: `src/app/(dashboard)/layout.tsx` (auth guard + sidebar + i18n)
- Routes: `/dashboard`, `/documents`, `/documents/[id]`, `/documents/upload`, `/documents/[id]/revise`, `/approvals`, `/departments`, `/departments/[id]`, `/users`, `/users/[id]`, `/notifications`, `/read-tasks`, `/profile`, `/settings`, `/guide`

**`src/app/api/`:**
- Purpose: HTTP API routes only (not for business logic mutations)
- Contains: Auth handler, SSE, file serving, cron trigger, document upload
- Key files:
  - `src/app/api/auth/[...all]/route.ts` — Better Auth
  - `src/app/api/sse/route.ts` — Real-time events
  - `src/app/api/files/[...path]/route.ts` — Authenticated file download
  - `src/app/api/cron/route.ts` — Scheduled job runner
  - `src/app/api/documents/upload/route.ts` — Multipart upload endpoint

**`src/actions/`:**
- Purpose: All Server Actions for mutations and data queries
- Contains: One file per domain (13 files)
- Key files: `src/actions/documents.ts`, `src/actions/approvals.ts`, `src/actions/users.ts`, `src/actions/departments.ts`, `src/actions/notifications.ts`, `src/actions/settings.ts`

**`src/components/ui/`:**
- Purpose: shadcn/ui component library (do not modify manually)
- Contains: Primitive UI components (button, dialog, table, form, etc.)

**`src/components/{domain}/`:**
- Purpose: Feature-specific React components
- Domains: `documents/`, `approvals/`, `users/`, `departments/`, `notifications/`, `read-tasks/`, `profile/`, `settings/`, `layout/`, `guide/`

**`src/lib/db/schema/`:**
- Purpose: Drizzle ORM schema definitions, one file per database table
- Contains: `documents.ts`, `document-revisions.ts`, `approvals.ts`, `users.ts`, `departments.ts`, `distribution-lists.ts`, `distribution-users.ts`, `read-confirmations.ts`, `notifications.ts`, `activity-logs.ts`, `system-settings.ts`, `auth-tables.ts`, `enums.ts`, `relations.ts`, `index.ts`

**`src/lib/queue/`:**
- Purpose: BullMQ queue infrastructure
- Key files: `src/lib/queue/index.ts` (enqueue helpers), `src/lib/queue/worker.ts` (Worker factory), `src/lib/queue/types.ts` (job type definitions), `src/lib/queue/templates.ts` (email template resolver)
- Subdirectory: `jobs/` — individual job processors

**`src/lib/jobs/`:**
- Purpose: Cron job business logic (approval reminders, escalations, read reminders)
- Key files: `src/lib/jobs/approval-reminder.ts`, `src/lib/jobs/approval-escalation.ts`, `src/lib/jobs/read-reminder.ts`

**`src/stores/`:**
- Purpose: Zustand client-side state stores
- Key files: `src/stores/notification-store.ts`, `src/stores/filter-store.ts`, `src/stores/ui-store.ts`

**`uploads/`:**
- Purpose: Runtime file storage for uploaded documents
- Generated: Yes (runtime)
- Committed: No (in `.gitignore`)
- Structure: `uploads/{year}/{month}/{nanoid}/{filename}`

**`drizzle/`:**
- Purpose: Generated SQL migrations from `drizzle-kit`
- Generated: Yes (via `bun run db:generate`)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx` — Root HTML layout (fonts, PWA, metadata)
- `src/app/(dashboard)/layout.tsx` — Auth guard, sidebar, i18n provider
- `src/app/page.tsx` — Root page (likely redirects to dashboard or login)
- `src/worker.ts` — BullMQ worker process entry point

**Configuration:**
- `src/lib/env.ts` — All environment variable definitions and Zod validation
- `src/lib/auth/index.ts` — Better Auth configuration
- `src/lib/db/index.ts` — Drizzle DB client singleton
- `src/lib/redis/index.ts` — Redis client singleton
- `src/i18n/request.ts` — next-intl server config
- `src/i18n/messages/en.json` — English translations (source of truth)
- `src/i18n/messages/tr.json` — Turkish translations

**Core Logic:**
- `src/actions/documents.ts` — Document CRUD, approval flow, publish, revise (1172 lines)
- `src/actions/approvals.ts` — Approval accept/reject logic
- `src/lib/errors.ts` — Error classification shared by all actions and routes
- `src/lib/storage/index.ts` — File save/delete/stream operations
- `src/lib/sse/index.ts` — SSE connection management + Redis pub/sub bridge

**Schema:**
- `src/lib/db/schema/index.ts` — Re-exports all schema entities
- `src/lib/db/schema/enums.ts` — All PostgreSQL enums (roles, statuses, types)
- `src/lib/db/schema/relations.ts` — All Drizzle relation definitions

## Naming Conventions

**Files:**
- kebab-case for all files: `document-detail-view.tsx`, `approval-reminder.ts`
- Page files always named `page.tsx`, layout files `layout.tsx`
- Route handlers named `route.ts`
- Schema files named after the entity: `document-revisions.ts`

**Directories:**
- Route groups use parentheses: `(auth)`, `(dashboard)`
- Dynamic segments use brackets: `[id]`, `[...path]`, `[...all]`
- Feature directories in kebab-case: `read-tasks/`, `distribution-lists/`

**Components:**
- PascalCase exports: `DocumentDetailView`, `ApprovalActions`
- Default export matches component name

**Functions/Variables:**
- camelCase: `getDocuments`, `createDocument`, `escapeLikePattern`
- Server Actions start with verb: `create*`, `update*`, `delete*`, `get*`, `run*`

**Database:**
- Drizzle (TypeScript): camelCase column names (`documentCode`, `createdAt`)
- PostgreSQL (actual): snake_case (`document_code`, `created_at`)
- Table names: plural snake_case (`document_revisions`, `distribution_lists`)
- Exception: `user` table (singular, for Better Auth compatibility)

**i18n Keys:**
- Dot-nested: `documents.status.draft`, `approvals.actions.approve`

## Where to Add New Code

**New Feature Page:**
- Page server component: `src/app/(dashboard)/{feature}/page.tsx`
- Layout (if needed): `src/app/(dashboard)/{feature}/layout.tsx`
- Dynamic detail page: `src/app/(dashboard)/{feature}/[id]/page.tsx`

**New Server Action:**
- Add to existing domain file: `src/actions/{domain}.ts`
- Or create new: `src/actions/{new-domain}.ts`
- Pattern: validate session → validate with Zod → DB operations → enqueue jobs → revalidatePath → return ActionResult

**New Component:**
- Shared across pages: `src/components/{domain}/{component-name}.tsx`
- Page-specific: co-locate in `src/app/(dashboard)/{feature}/`
- UI primitive: add via `npx shadcn add {component}` to `src/components/ui/`

**New Database Table:**
- Schema file: `src/lib/db/schema/{entity}.ts`
- Add relations: `src/lib/db/schema/relations.ts`
- Export from: `src/lib/db/schema/index.ts`
- Run: `bun run db:generate && bun run db:migrate`

**New Email Template:**
- Template: `src/lib/email/templates/{name}.tsx`
- Register in template resolver: `src/lib/queue/templates.ts`

**New Background Job:**
- Job processor: `src/lib/queue/jobs/{job-name}.ts`
- Add to worker switch: `src/lib/queue/worker.ts`
- Add type: `src/lib/queue/types.ts`
- Add enqueue helper: `src/lib/queue/index.ts`

**New Cron Job:**
- Logic: `src/lib/jobs/{job-name}.ts`
- Register in cron route: `src/app/api/cron/route.ts`

**New i18n Keys:**
- Add to `src/i18n/messages/en.json` (English first, source of truth)
- Mirror in `src/i18n/messages/tr.json`

**Utilities:**
- Shared helpers: `src/lib/utils.ts`
- Domain-specific: `src/actions/{domain}-helpers.ts` (e.g., `src/actions/departments-helpers.ts`)

## Special Directories

**`uploads/`:**
- Purpose: Runtime uploaded file storage
- Generated: Yes (at runtime by storage layer)
- Committed: No

**`drizzle/`:**
- Purpose: SQL migration files generated by drizzle-kit
- Generated: Yes (via `bun run db:generate`)
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

**`.claude/`:**
- Purpose: Claude AI agent definitions, rules, skills, commands
- Committed: Yes (team-shared AI coding assistant config)

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents (this directory)
- Generated: Yes (by AI mapping agents)
- Committed: Yes

---

*Structure analysis: 2026-02-27*
