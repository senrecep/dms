---
name: create-schema
description: Add a new Drizzle ORM table with relations, enums, and migration
---
Create a new database table for the DMS project.

Ask the user for:
1. Table name and purpose
2. Column definitions (name, type, constraints)
3. Relations to existing tables

Then:

1. **Schema file**: Create `src/lib/db/schema/{table-name}.ts`
   - Use pgTable from drizzle-orm/pg-core
   - Include: id (nanoid), createdAt, updatedAt timestamps
   - Include: isDeleted, deletedAt for soft-delete pattern
   - Use camelCase in Drizzle (maps to snake_case in PostgreSQL)

2. **Relations**: Update `src/lib/db/schema/relations.ts`
   - Define relations using Drizzle's relations() helper
   - Add both sides of relationships

3. **Export**: Add to `src/lib/db/schema/index.ts` barrel export

4. **Enums** (if needed): Add to `src/lib/db/schema/enums.ts`

5. **Migration**: Run `bun run db:generate` then `bun run db:push`

Follow conventions in `.claude/rules/code-style.md` (Database section).
