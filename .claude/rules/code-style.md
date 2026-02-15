# Code Style

## TypeScript
- Strict mode enabled, no `any` types
- Use Zod for runtime validation at system boundaries
- Prefer `type` over `interface` unless extending
- Use path aliases: `@/` maps to `src/`

## React / Next.js
- Server Components by default, "use client" only when needed
- Server Actions for mutations (src/actions/)
- Co-locate components with their pages when page-specific
- Shared components in src/components/

## Database (Drizzle)
- Schema files in src/lib/db/schema/
- Never use raw SQL - always use Drizzle query builder
- Soft-delete: set isDeleted=true, never DELETE
- All mutations must log to activity_logs table

## Naming
- Files: kebab-case (document-list.tsx)
- Components: PascalCase (DocumentList)
- Functions/variables: camelCase (getDocuments)
- DB columns: camelCase in Drizzle, snake_case in PostgreSQL
- i18n keys: dot-nested (documents.status.draft)

## i18n
- All user-facing strings MUST use next-intl useTranslations()
- Keys defined in src/i18n/messages/en.json
- Nested structure: section.subsection.key
