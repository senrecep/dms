---
name: add-feature
description: Guided workflow for adding a new feature to DMS
---
When adding a new feature to DMS, follow this checklist:

1. **Branch**: Create `feature/short-description` from main
2. **Schema** (if needed):
   - Add/modify tables in `src/lib/db/schema/`
   - Update relations in `src/lib/db/schema/relations.ts`
   - Export from `src/lib/db/schema/index.ts`
   - Run `bun run db:generate` and `bun run db:push`
3. **Server Actions**: Create in `src/actions/[feature].ts`
   - Validate input with Zod
   - Check session auth + role
   - Log to activity_logs table
   - Invalidate Redis cache if needed
4. **Components**:
   - Page: `src/app/(dashboard)/[feature]/page.tsx` (Server Component)
   - Feature components: `src/components/[feature]/`
   - Use shadcn/ui components from `src/components/ui/`
5. **i18n**: Add all strings to `src/i18n/messages/en.json`
6. **Navigation**: Add sidebar link in `src/components/layout/sidebar.tsx`
7. **Tests**: Unit tests in `__tests__/` next to source, > 80% coverage
8. **Commit**: `feat(scope): description` format
