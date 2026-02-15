---
name: db-migrate
description: Generate and run database migrations safely
---
Execute these steps:
1. Run `bun run db:generate` to generate migration files
2. Review generated SQL in ./drizzle/ directory
3. Show the migration SQL to user for approval
4. If approved, run `bun run db:migrate` to apply
5. Verify with `bun run db:studio` that schema is correct
