---
name: dev-setup
description: Set up local development environment for DMS
---
Follow these steps to set up the DMS development environment:

1. **Prerequisites check**: Verify bun, Docker, and Docker Compose are installed
2. **Start services**: Run `docker compose up -d` to start PostgreSQL 17 and Redis 7
3. **Environment**: Copy `.env.example` to `.env.local` if not exists, verify DATABASE_URL and REDIS_URL
4. **Database setup**: Run `bun run db:push` to sync schema to PostgreSQL
5. **Seed data** (if seed script exists): Run `bun run db:seed`
6. **Install deps**: Run `bun install` if node_modules is missing
7. **Dev server**: Run `bun dev` to start Next.js with Turbopack
8. **Verify**: Check http://localhost:3000 is accessible

Troubleshooting:
- Port conflicts: Check if 5432 (PostgreSQL) or 6379 (Redis) are already in use
- DB connection: Verify PostgreSQL container is healthy with `docker compose ps`
- Schema issues: Run `bun run db:generate` then `bun run db:push`
