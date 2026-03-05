# Coding Conventions

**Analysis Date:** 2026-02-27

## Naming Patterns

**Files:**
- kebab-case always: `document-detail-view.tsx`, `approval-reminder.ts`, `use-sse.ts`
- Next.js reserved: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `not-found.tsx`
- Schema files: named after entity (`document-revisions.ts`, not `documentRevisions.ts`)

**Components:**
- PascalCase named exports: `export function DocumentDetailView()`
- Match filename: `document-detail-view.tsx` exports `DocumentDetailView`

**Functions/Variables:**
- camelCase: `getDocuments`, `createDocument`, `escapeLikePattern`, `classifyError`
- Server Actions prefixed with verb: `createDocument`, `updateUser`, `deleteDocument`, `getDocuments`
- Helpers suffixed with descriptor: `createApprovalFlow`, `getEmailConfig`, `getFilePath`

**Types:**
- Prefer `type` over `interface` (rule from `.claude/rules/code-style.md`)
- PascalCase: `ActionResult`, `DocumentFilters`, `FileMetadata`, `SSEEvent`
- Exported types near their usage: `DocumentListItem` and `DocumentDetail` in `src/actions/documents.ts`

**Database:**
- Drizzle TypeScript: camelCase column names (`documentCode`, `isDeleted`, `createdAt`)
- PostgreSQL actual columns: snake_case (`document_code`, `is_deleted`, `created_at`)
- Table names: plural snake_case (`document_revisions`, `distribution_lists`)
- Exception: `user` table (singular - required by Better Auth adapter)

**i18n Keys:**
- Dot-nested flat structure: `documents.status.draft`, `approvals.actions.approve`
- Defined in `src/i18n/messages/en.json` (English is source of truth)
- Mirrored in `src/i18n/messages/tr.json`

## Code Style

**Formatting:**
- ESLint with Next.js core-web-vitals + TypeScript rules (`eslint.config.mjs`)
- No Biome/Prettier detected - ESLint handles style
- Run: `bun run lint`

**TypeScript:**
- Strict mode enabled (`tsconfig.json`)
- No `any` types (rule: `.claude/rules/code-style.md`) - 37 instances found in non-critical paths (manifest, i18n internals, Drizzle relations)
- Path alias: `@/` maps to `src/` - used everywhere instead of relative imports
- Zod v4 for runtime validation: `import { z } from "zod/v4"`

## Import Organization

**Pattern observed:**
1. Framework/Node builtins (`node:fs`, `node:path`, `node:crypto`)
2. Third-party packages (`next/`, `react`, `drizzle-orm`, `better-auth`, `bullmq`)
3. Internal via `@/` alias (`@/lib/db`, `@/lib/auth`, `@/actions/documents`)

**Path Aliases:**
- `@/` → `src/` (only alias configured)
- Never use relative paths like `../../lib/db`

## Server Action Pattern

All mutations go through Server Actions in `src/actions/`. Every action follows this pattern:

```typescript
"use server";

export async function createSomething(formData: FormData) {
  try {
    // 1. Validate session
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new Error("Unauthorized");

    // 2. Validate input with Zod
    const parsed = schema.parse(raw);

    // 3. DB operations (use transaction for multi-step)
    const result = await db.transaction(async (tx) => {
      // ...
    });

    // 4. Enqueue async jobs (outside transaction)
    await enqueueEmail({ ... });
    await enqueueNotification({ ... });

    // 5. Revalidate cache
    revalidatePath("/path");

    // 6. Return typed success
    return { success: true, id: result.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map(i => i.message).join(", "), errorCode: "VALIDATION_ERROR" };
    }
    return classifyError(error);
  }
}
```

## Error Handling

**Server Actions:**
- Always `try/catch` the entire body
- Never throw to client - return `ActionError` object
- Use `classifyError(error)` from `src/lib/errors.ts` for the catch block
- Zod errors caught explicitly before `classifyError`
- Return shape: `{ success: false, error: string, errorCode: string }`

**API Routes:**
- `try/catch` with HTTP status codes
- Error codes map to HTTP status via `ERROR_HTTP_STATUS` lookup table
- Pattern: `NextResponse.json({ error, errorCode }, { status })`

**Notification/Email Failures:**
- Wrapped in separate `try/catch` - never fail the main operation
- Use `Promise.allSettled()` for parallel notifications (not `Promise.all`)
- Log errors but continue: `console.error("[Action] Failed to notify:", error)`

**Error Classification (`src/lib/errors.ts`):**
- Maps PostgreSQL codes: `23505` → `DUPLICATE_ENTRY`, `23503` → `REFERENCE_ERROR`
- Maps filesystem codes: `EACCES` → `FILE_SYSTEM_ERROR`, `ENOSPC` → `DISK_FULL`
- Maps auth errors: `"Unauthorized"` → `UNAUTHORIZED`, `"Forbidden"` → `FORBIDDEN`

## Logging

**Framework:** `console.log/warn/error` (no structured logging library)

**Patterns:**
- Prefix with bracketed context: `[Redis]`, `[Worker]`, `[Email:Resend]`, `[Cron]`, `[ApprovalReminder]`
- Log at job/task boundaries: start, complete, error
- Never log sensitive data (passwords, tokens, full file paths with secrets)
- Use `console.error` for failures, `console.log` for informational

## React / Next.js Patterns

**Server vs Client Components:**
- Default: Server Component (no directive needed)
- Add `"use client"` only for: event handlers, browser APIs, hooks, Zustand stores
- 57 client components detected vs majority server components

**Data Fetching:**
- Server Components call Server Actions or Drizzle directly - no `fetch()` for initial data
- No SWR, React Query, or client-side data fetching for initial page loads

**Forms:**
- Pattern: `react-hook-form` + `@hookform/resolvers/zod` + shadcn `Form` component
- Server Actions called from form submit handlers via `startTransition` or `action` prop

**Tables:**
- TanStack Table (`@tanstack/react-table`) + shadcn table primitives
- Column definitions in `*-columns.tsx` files, table in `*-table.tsx`

**Toasts:**
- `sonner` library - `toast.success()`, `toast.error()`

## Database Conventions

**Queries:**
- Always use Drizzle query builder - never raw SQL (except for table aliases in complex joins)
- For relational queries: use `db.query.{table}.findFirst({ with: {} })` pattern
- For joins: use `db.select().from().innerJoin().leftJoin()` pattern

**Transactions:**
- Wrap multi-step mutations in `db.transaction(async (tx) => { ... })`
- File operations (filesystem) happen OUTSIDE transactions (can't rollback FS)
- Pattern: save file first, then DB transaction

**Soft Delete:**
- Set `isDeleted = true`, `deletedAt = new Date()` - never hard DELETE
- Always include `eq(table.isDeleted, false)` in queries

**Activity Logging:**
- Every document mutation inserts to `activity_logs` table
- Fields: `documentId`, `revisionId`, `userId`, `action`, `details` (JSON object)

**IDs:**
- All primary keys are `nanoid()` text strings - not auto-increment integers
- Pattern: `.$defaultFn(() => nanoid())`

**Timestamps:**
- All tables have `createdAt` with `defaultNow()`
- Mutable tables have `updatedAt` with `.$onUpdateFn(() => new Date())`
- Always use `{ withTimezone: true }` on timestamp columns

## Module Design

**Exports:**
- Named exports preferred
- `src/lib/db/schema/index.ts` uses barrel re-exports for all schema
- Server Actions exported individually from action files

**Barrel Files:**
- `src/lib/db/schema/index.ts` - schema barrel
- Individual lib directories export via `index.ts`

## File Upload Convention

1. Validate file exists and is non-empty
2. Validate size against `MAX_FILE_SIZE_MB`
3. Save to filesystem BEFORE DB transaction (filesystem can't rollback)
4. Store relative path in DB (relative to `UPLOAD_DIR`)
5. Serve files via authenticated `/api/files/[...path]` route only

---

*Convention analysis: 2026-02-27*
