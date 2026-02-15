# Contributing to DMS

Thank you for your interest in contributing to the Document Management System. This guide will help you get started.

## Prerequisites

- [Bun](https://bun.sh/) v1.x+
- [Docker](https://www.docker.com/) & Docker Compose
- Git

For detailed setup instructions, see [docs/local-development.md](docs/local-development.md).

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:

| Prefix | Use Case |
| ----------- | --------------------------------- |
| `feature/`  | New functionality                 |
| `fix/`      | Bug fixes                         |
| `refactor/` | Code restructuring                |

### 2. Make Your Changes

- Follow the code style guidelines below
- Write tests for new functionality
- Ensure all existing tests pass

### 3. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat(documents): add bulk download support"
```

**Commit types:**

- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code restructuring (no behavior change)
- `style` — Formatting, whitespace
- `docs` — Documentation only
- `test` — Adding or updating tests
- `chore` — Tooling, config, dependencies

**Scopes:** `auth`, `documents`, `approvals`, `notifications`, `db`, `ui`, `api`, `config`, `i18n`

### 4. Create a Pull Request

- One feature/fix per PR
- Include a clear description of changes
- Add a testing checklist
- Reference any related issues

## Code Style

### TypeScript

- Strict mode enabled — no `any` types
- Use Zod for runtime validation at system boundaries
- Prefer `type` over `interface` unless extending
- Use path aliases: `@/` maps to `src/`

### React / Next.js

- Server Components by default
- `"use client"` only when needed (hooks, event handlers, browser APIs)
- Server Actions for all mutations (`src/actions/`)

### Naming Conventions

| Element | Convention | Example |
| -------------- | ---------- | ----------------------- |
| Files          | kebab-case | `document-list.tsx`     |
| Components     | PascalCase | `DocumentList`          |
| Functions/Vars | camelCase  | `getDocuments`          |
| DB columns     | camelCase  | Drizzle (snake in PG)   |
| i18n keys      | dot-nested | `documents.status.draft` |

### Styling

- Tailwind CSS v4 with shadcn/ui (new-york variant)
- Mobile-first approach (min-width breakpoints)
- Check `src/components/ui/` before building custom components

## Key Rules

### Always

- Use `useTranslations()` for all user-facing strings (never hardcode)
- Log mutations to `activity_logs` table
- Use soft delete (`isDeleted = true`) instead of `DELETE`
- Validate session and role at the Server Action level
- Use `enqueueEmail` / `enqueueNotification` for async delivery

### Never

- Use raw SQL — always use Drizzle query builder
- Hard-delete database records
- Skip authentication/authorization checks
- Commit `.env.local` or secrets to Git
- Push directly to `main`

## Testing

- Unit tests next to source files in `__tests__/` directories
- Integration tests in `tests/` at project root
- New features should have > 80% coverage
- Bug fixes should include a test reproducing the bug

```bash
# Run tests
bun test

# Run linter
bun run lint
```

## Project Structure

See the [README.md](README.md) for a detailed project structure overview.

## Questions?

If something is unclear, open an issue or reach out to the maintainers.
