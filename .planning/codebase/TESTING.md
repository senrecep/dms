# Testing Patterns

**Analysis Date:** 2026-02-27

## Test Framework

**Runner:**
- Not configured — no test runner detected in `package.json`, no `jest.config.*`, `vitest.config.*`, or `playwright.config.*` found
- No test files (`*.test.*`, `*.spec.*`) found anywhere in the codebase

**Assertion Library:**
- Not applicable

**Run Commands:**
```bash
# No test commands configured in package.json
# Scripts available: dev, build, start, lint, db:generate, db:migrate, db:push, db:studio, db:seed, worker, worker:dev
```

## Test Infrastructure — Intended (from `.claude/rules/testing.md`)

The project has documented testing conventions even though tests have not been written yet. When implementing tests, follow these rules:

**Framework Intent:**
- Unit tests: co-located in `__tests__/` directories next to source files
- Integration tests: in `tests/` at project root
- Coverage target: >80% for new features

**Naming Convention (intended):**
- Describe behavior in `it()` descriptions: `it('should return documents when user is authorized')`
- Bug fixes: write test reproducing the bug first

**Mocking Intent:**
- Mock external services in unit tests: Redis, PostgreSQL, Resend
- Do not mock in integration tests (use real services or test containers)

## Test File Organization

**Current State:**
- No `__tests__/` directories exist anywhere
- No `tests/` root directory exists
- Zero test files in the codebase

**Intended Structure (per `.claude/rules/testing.md`):**
```
src/
├── actions/
│   └── __tests__/
│       └── documents.test.ts     # Unit tests for Server Actions
├── lib/
│   └── __tests__/
│       └── errors.test.ts        # Unit tests for lib utilities
tests/
└── integration/                  # Integration tests (not yet created)
```

## What Should Be Tested (Priority Order)

**High Priority — Core Business Logic:**
- `src/actions/documents.ts` — Document CRUD, approval flow branching (preparer=approver vs different), publish logic, revision logic
- `src/actions/approvals.ts` — Approval accept/reject state transitions
- `src/lib/errors.ts` — Error classification (PostgreSQL codes, FS errors, auth errors)
- `src/lib/storage/index.ts` — File save, path sanitization, hash computation

**High Priority — Security-Critical:**
- `src/lib/storage/path.ts` — Path traversal prevention (sanitizeFileName)
- Session validation in Server Actions (unauthorized access)
- Role-based access checks (ADMIN/MANAGER/USER)

**Medium Priority — Infrastructure:**
- `src/lib/email/config.ts` — Email config cache behavior
- `src/lib/queue/` — Job enqueueing
- `src/lib/jobs/approval-reminder.ts` — Reminder cutoff date logic
- `src/lib/jobs/approval-escalation.ts` — Escalation logic

**Low Priority — UI:**
- Component rendering (shadcn-based components are stable)
- i18n key coverage

## Mocking Strategy (When Tests Are Added)

**What to Mock:**
```typescript
// PostgreSQL / Drizzle
vi.mock("@/lib/db", () => ({ db: mockDrizzleClient }));

// Redis
vi.mock("@/lib/redis", () => ({ getRedis: () => mockRedisClient }));

// Email (Resend)
vi.mock("resend", () => ({ Resend: vi.fn().mockImplementation(() => mockResend) }));

// BullMQ Queue
vi.mock("@/lib/queue", () => ({
  enqueueEmail: vi.fn(),
  enqueueNotification: vi.fn(),
  enqueueBulkEmail: vi.fn(),
  enqueueBulkNotifications: vi.fn(),
}));

// Better Auth session
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(mockSession) } }
}));

// next/headers (for Server Actions)
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));

// next/cache
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
```

**What NOT to Mock:**
- `src/lib/errors.ts` — Pure functions, test directly
- `src/lib/utils.ts` — Pure functions, test directly
- Zod schemas — Test with real Zod

## Setting Up Testing (Recommended)

```bash
# Install Vitest (recommended for Next.js + Bun)
bun add -d vitest @vitejs/plugin-react vite-tsconfig-paths

# Or Jest with Next.js preset
bun add -d jest jest-environment-node @types/jest ts-jest
```

**Recommended `vitest.config.ts`:**
```typescript
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      threshold: { lines: 80, functions: 80, branches: 80 },
    },
  },
});
```

## Coverage

**Requirements:** >80% for new features (documented in `.claude/rules/testing.md`, not yet enforced)

**Current Coverage:** 0% (no tests exist)

## Test Types

**Unit Tests:**
- Scope: Individual functions (Server Actions, lib utilities, job logic)
- Location: `__tests__/` next to source files (intended, not yet created)
- Mock: All external dependencies (DB, Redis, email)

**Integration Tests:**
- Scope: Full request/response cycles, DB + queue interactions
- Location: `tests/` at project root (intended, not yet created)
- Mock: None (real PostgreSQL + Redis via test containers or local Docker)

**E2E Tests:**
- Not configured (no Playwright/Cypress detected)

## Common Patterns (When Implemented)

**Server Action Testing:**
```typescript
import { createDocument } from "@/actions/documents";

describe("createDocument", () => {
  it("should return UNAUTHORIZED when no session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const formData = new FormData();
    const result = await createDocument(formData);
    expect(result).toEqual({ success: false, errorCode: "UNAUTHORIZED" });
  });

  it("should return VALIDATION_ERROR for missing required fields", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);
    const result = await createDocument(new FormData());
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("VALIDATION_ERROR");
  });
});
```

**Error Classification Testing:**
```typescript
import { classifyError } from "@/lib/errors";

describe("classifyError", () => {
  it("should classify PostgreSQL unique constraint as DOCUMENT_CODE_EXISTS", () => {
    const error = Object.assign(new Error("duplicate key value violates unique constraint document_code"), { code: "23505" });
    expect(classifyError(error)).toEqual({
      success: false,
      errorCode: "DOCUMENT_CODE_EXISTS",
      error: "Document code already exists",
    });
  });
});
```

---

*Testing analysis: 2026-02-27*
