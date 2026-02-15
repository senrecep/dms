---
name: review
description: Code review checklist for DMS pull requests
---
Review the current changes against this DMS-specific checklist:

## Security
- [ ] Server Actions validate session and check role permissions
- [ ] All user input validated with Zod schemas
- [ ] No raw SQL, only Drizzle query builder
- [ ] File operations prevent path traversal
- [ ] No sensitive data exposed to client

## Code Quality
- [ ] TypeScript strict mode - no `any` types
- [ ] Server Components by default, "use client" only when needed
- [ ] Path aliases used (`@/` not relative `../../../`)
- [ ] Naming: kebab-case files, PascalCase components, camelCase functions

## Database
- [ ] Soft-delete pattern used (isDeleted=true, never DELETE)
- [ ] Mutations logged to activity_logs
- [ ] Relations updated if schema changed

## UI/UX
- [ ] All strings use next-intl translations (no hardcoded text)
- [ ] shadcn/ui components used (no custom when shadcn has it)
- [ ] Responsive: tested at 375px, 768px, 1024px, 1440px
- [ ] Role-based visibility enforced

## Testing
- [ ] New features have > 80% coverage
- [ ] Bug fixes include regression test
- [ ] No .skip or .only in committed tests
