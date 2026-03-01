# Codebase Concerns

**Analysis Date:** 2026-02-27

## Tech Debt

**Duplicated Document Upload Logic:**
- Issue: The document creation logic (approval flow creation, notification enqueueing, validation) is duplicated between `src/actions/documents.ts` (`createDocument`) and `src/app/api/documents/upload/route.ts` (the API route). Both implement the full `createDocument` workflow independently with ~identical code.
- Files: `src/actions/documents.ts` (lines 305-421), `src/app/api/documents/upload/route.ts` (all ~283 lines)
- Impact: Bugs fixed in one place may not be fixed in the other. Business logic drift is likely as the codebase grows. The API route's DB operations are NOT wrapped in a transaction (unlike the Server Action which uses `db.transaction`).
- Fix approach: Consolidate into a single shared `createDocumentCore()` utility in `src/lib/` that both the Server Action and API route call. Delete one duplicate.

**Massive Server Action File:**
- Issue: `src/actions/documents.ts` is 1172 lines — contains queries, mutations, approval flow logic, distribution logic, export logic, and data loaders all in one file.
- Files: `src/actions/documents.ts`
- Impact: Hard to navigate, test, and maintain. PRs touching this file will have high conflict probability.
- Fix approach: Split into `src/actions/documents-queries.ts`, `src/actions/documents-mutations.ts`, `src/actions/documents-approval.ts`, and `src/actions/documents-export.ts`.

**In-Memory Email Config Cache:**
- Issue: `src/lib/email/config.ts` uses module-level `let cachedConfig` variables for caching. In a multi-instance deployment, each instance has its own cache. Invalidation (`invalidateEmailConfigCache()`) only clears the local instance's cache.
- Files: `src/lib/email/config.ts`
- Impact: After admin updates email settings, other instances continue using stale config for up to 60 seconds. In single-instance Dokploy deployment this is acceptable, but breaks in horizontal scaling.
- Fix approach: Move cache to Redis with a short TTL, or reduce TTL and accept eventual consistency.

**`as never` Type Casts in Worker:**
- Issue: `src/lib/queue/worker.ts` uses `job as never` to cast jobs to their specific type in the switch statement, bypassing TypeScript's type system.
- Files: `src/lib/queue/worker.ts` (lines 20-23)
- Impact: Loss of type safety in job processor dispatch. Runtime errors from wrong job shapes won't be caught at compile time.
- Fix approach: Use discriminated union and proper type narrowing with a typed dispatch pattern.

## Known Bugs

**API Upload Route Missing Transaction:**
- Symptoms: If the API route at `src/app/api/documents/upload/route.ts` fails after file save but before all DB inserts complete, the filesystem has an orphaned file and the DB may have partial records.
- Files: `src/app/api/documents/upload/route.ts` (lines 93-162)
- Trigger: DB insert failure mid-sequence (FK constraint, network drop, etc.)
- Workaround: Use Server Action `createDocument` instead of the API route when possible (it uses `db.transaction`).

**Read Confirmations Filtered to MANAGER Only:**
- Symptoms: When a document is published, read confirmations are only created for MANAGER-role users in the distribution list. Regular USER-role users in distribution never get read tasks.
- Files: `src/actions/documents.ts` (lines 614, 624)
- Trigger: Publishing a document with USER-role recipients in distribution lists or departments.
- Workaround: Assign MANAGER role to users who need read confirmations. May be intentional business rule — needs clarification.

## Security Considerations

**Rate Limiting Not Implemented:**
- Risk: Auth endpoints (`/api/auth/*`), file upload (`/api/documents/upload`), and the cron endpoint have no rate limiting despite being called out in `.claude/rules/api-patterns.md` and `.claude/rules/security.md`.
- Files: `src/app/api/documents/upload/route.ts`, `src/app/api/auth/[...all]/route.ts`, `src/app/api/cron/route.ts`
- Current mitigation: Cron endpoint has `CRON_SECRET` Bearer token check. Auth uses Better Auth's built-in CSRF protection. No other rate limiting.
- Recommendations: Add Redis-backed rate limiting middleware for auth and upload endpoints. Consider using `express-rate-limit`-style middleware or a Vercel/Dokploy edge rate limit.

**File Path Traversal Risk (Partial):**
- Risk: File serving route at `src/app/api/files/[...path]/route.ts` serves files from the uploads directory. If `sanitizeFileName` in storage utils has gaps, path traversal could be possible.
- Files: `src/app/api/files/[...path]/route.ts`, `src/lib/storage/` (path utilities)
- Current mitigation: `sanitizeFileName` exists in `src/lib/storage/path.ts`. Files are stored with nanoid directory names. Session auth required to access any file.
- Recommendations: Add explicit path prefix validation (`path.resolve(filePath).startsWith(path.resolve(UPLOAD_DIR))`). Add tests for path traversal attempts.

**SMTP Password Stored Plaintext in DB:**
- Risk: SMTP password is stored as plaintext in the `system_settings` table (`email_smtp_pass` key).
- Files: `src/lib/email/config.ts`, `src/lib/db/schema/system-settings.ts`
- Current mitigation: DB access requires authentication. Admin panel access requires ADMIN role.
- Recommendations: Encrypt sensitive settings at rest using an application-level encryption key from env. Consider moving email credentials back to env vars and only storing non-sensitive settings (provider choice, from address) in DB.

**Missing Authorization on Some Admin Actions:**
- Risk: Some Server Actions may not enforce role-based access beyond session check.
- Files: `src/actions/settings.ts`, `src/actions/users.ts`
- Current mitigation: Dashboard layout ensures authenticated users only. Individual actions need review.
- Recommendations: Audit all Server Actions to confirm ADMIN-only actions reject MANAGER/USER roles explicitly.

## Performance Bottlenecks

**N+1 Query Pattern in `getDocuments`:**
- Problem: `getDocuments` in `src/actions/documents.ts` runs 3-4 separate queries per call (main list + read stats + previous revisions), executed sequentially in some code paths.
- Files: `src/actions/documents.ts` (lines 130-244)
- Cause: The read stats and previous revision queries are separate `await` calls after the main query (not parallelized in all paths).
- Improvement path: Use `Promise.all([mainQuery, readStatsQuery, prevRevisionsQuery])` to run the three queries in parallel. Consider adding a DB view or materialized view for the document list.

**No Redis Caching for Frequently Read Data:**
- Problem: Every page render hits PostgreSQL directly for frequently read, rarely changed data (department lists, user lists, settings).
- Files: `src/actions/documents.ts` (`getDepartments`, `getApprovers`), `src/lib/email/config.ts`
- Cause: No Redis cache layer for read queries (only email config has in-memory cache).
- Improvement path: Add Redis caching for `getDepartments()` and `getApprovers()` with invalidation on mutation. Cache key pattern: `dms:departments:list`, `dms:users:approvers`.

**Large File Handling:**
- Problem: `saveFile` in `src/lib/storage/index.ts` reads entire file into `Buffer` before writing (`file.arrayBuffer()`). For large files (up to 500 MB), this consumes significant memory.
- Files: `src/lib/storage/index.ts` (lines 37-38)
- Cause: Web API `File.arrayBuffer()` loads entire file into memory.
- Improvement path: Use streaming write (`Writable` stream) for files above a size threshold. Consider chunked upload for large files.

## Fragile Areas

**SSE Connection Management:**
- Files: `src/lib/sse/index.ts`
- Why fragile: In-memory `Map<string, Set<Connection>>` for active SSE connections. In multi-instance deployments, connections are not shared across instances. Redis pub/sub handles cross-instance delivery but the connection registry is per-process.
- Safe modification: Test all SSE event types after any change. Do not refactor without adding reconnection and delivery guarantee tests.
- Test coverage: Zero — no tests for SSE connection lifecycle.

**Approval State Machine:**
- Files: `src/actions/documents.ts` (`createApprovalFlow`, `publishDocument`), `src/actions/approvals.ts`
- Why fragile: The two-step vs single-step approval branching (preparer=approver check) is implemented in multiple places without a centralized state machine. Status transitions (`DRAFT` → `PENDING_APPROVAL` → `PREPARER_APPROVED` → `APPROVED` → `PUBLISHED`) are scattered across actions.
- Safe modification: Always trace all status transition paths before modifying. Add tests that cover the full DRAFT→PUBLISHED and DRAFT→REJECTED paths before refactoring.
- Test coverage: Zero — no tests for state transitions.

**Email Config Cache Race Condition:**
- Files: `src/lib/email/config.ts`
- Why fragile: Module-level mutable state (`cachedConfig`, `cacheTime`) is not protected against concurrent access. In high-concurrency scenarios, multiple requests could simultaneously trigger cache refresh.
- Safe modification: Acceptable in current single-instance deployment. If scaling to multiple workers, migrate to Redis cache.
- Test coverage: Zero.

## Scaling Limits

**Local Filesystem Storage:**
- Current capacity: Limited by server disk space. `UPLOAD_DIR` defaults to `./uploads` inside the container.
- Limit: Single-instance only — files on container filesystem are not shared across replicas.
- Scaling path: Migrate `src/lib/storage/` to an S3-compatible storage (AWS S3, MinIO, Cloudflare R2). Storage interface is already abstracted — replace implementation without changing callers.

**In-Process SSE Connections:**
- Current capacity: Limited by Node.js/Bun open connection limits per process.
- Limit: Cannot horizontally scale Next.js server without a sticky session load balancer (SSE connections are per-process).
- Scaling path: Move to a dedicated SSE service or use Redis Streams with polling fallback. Alternatively, use sticky sessions on the load balancer.

**BullMQ Worker Concurrency:**
- Current capacity: 5 concurrent jobs (`src/lib/queue/worker.ts`).
- Limit: Single worker process — scales vertically only.
- Scaling path: Run multiple worker containers (already supported since worker is a separate Docker stage).

## Dependencies at Risk

**`xlsx` 0.18.5:**
- Risk: The `xlsx` package (SheetJS Community Edition) has had security vulnerabilities (prototype pollution). Version 0.18.5 is not the latest. The package is used for Excel export in `src/actions/export.ts`.
- Impact: XSS or prototype pollution if user-controlled data is improperly sanitized before being passed to xlsx.
- Migration plan: Upgrade to latest `xlsx` or switch to `exceljs` which has better security track record.

**`next` 16.1.6:**
- Risk: Next.js 16 is a very recent major version. Some ecosystem tools (testing libraries, type definitions) may not yet fully support it.
- Impact: Dependency conflicts when adding new packages that require Next.js `^14` or `^15`.
- Migration plan: Monitor for stable releases. No immediate action needed.

## Missing Critical Features

**No Test Suite:**
- Problem: Zero tests exist despite documented testing conventions in `.claude/rules/testing.md`.
- Blocks: Confident refactoring, CI/CD pipeline, regression prevention.
- Priority: High — the approval workflow and document state machine are business-critical and entirely untested.

**No Rate Limiting:**
- Problem: Auth and upload endpoints have no rate limiting.
- Blocks: Production hardening. A brute-force attack on `/api/auth/sign-in/email` is unrestricted.
- Priority: High for production deployments.

**No Structured Logging / Error Tracking:**
- Problem: All logging is `console.log/error` with no aggregation, search, or alerting.
- Blocks: Production observability. Errors in the worker process or cron jobs are invisible unless logs are actively monitored.
- Priority: Medium — add Sentry or equivalent for error tracking. Add structured JSON logging for production.

**No CI/CD Pipeline:**
- Problem: No GitHub Actions or equivalent CI configuration detected.
- Blocks: Automated testing, linting, and deployment validation on PRs.
- Priority: Medium.

## Test Coverage Gaps

**Approval State Machine:**
- What's not tested: Two-step vs single-step approval branching, all status transitions, rejection flow, escalation logic
- Files: `src/actions/documents.ts`, `src/actions/approvals.ts`, `src/lib/jobs/approval-escalation.ts`
- Risk: Silent regressions in approval workflow — the most business-critical feature
- Priority: High

**Server Action Authorization:**
- What's not tested: Role-based access enforcement (ADMIN/MANAGER/USER), unauthorized access to admin actions
- Files: `src/actions/users.ts`, `src/actions/settings.ts`, `src/actions/departments.ts`
- Risk: Privilege escalation could go undetected
- Priority: High

**File Path Security:**
- What's not tested: Path traversal prevention in file serving and storage
- Files: `src/lib/storage/`, `src/app/api/files/[...path]/route.ts`
- Risk: Path traversal vulnerability undetected
- Priority: High

**Error Classification:**
- What's not tested: `classifyError()` mapping for all PostgreSQL error codes
- Files: `src/lib/errors.ts`
- Risk: Wrong error codes returned to client, poor UX on DB errors
- Priority: Medium

**Cron Job Logic:**
- What's not tested: Reminder cutoff date calculations, escalation threshold logic, deduplication (reminderSentAt check)
- Files: `src/lib/jobs/approval-reminder.ts`, `src/lib/jobs/approval-escalation.ts`, `src/lib/jobs/read-reminder.ts`
- Risk: Missed reminders or spam — both harmful to business operations
- Priority: Medium

---

*Concerns audit: 2026-02-27*
