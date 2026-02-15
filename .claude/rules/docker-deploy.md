# Docker & Deployment Rules

## Local Development
- `docker compose up -d` starts PostgreSQL 17 + Redis 7
- App runs outside Docker via `bun dev` (Turbopack)
- .env.local for local secrets (never committed)

## Production (Dokploy)
- Single Docker Compose: PostgreSQL + Redis + App + Worker
- Use docker-compose.production.yml (single self-contained file)
- Multi-stage Dockerfile: deps → build → runner + worker (bun)
- NEXT_TELEMETRY_DISABLED=1 in production

## Build
- `bun run build` for production build
- `bun run db:generate` before build if schema changed
- Standalone output mode for Docker

## Environment Variables
- DATABASE_URL: PostgreSQL connection string
- REDIS_URL: Redis connection string
- BETTER_AUTH_SECRET: Auth secret (generate with openssl rand -base64 32)
- BETTER_AUTH_URL: Public app URL
- UPLOAD_DIR: File storage path (default: ./uploads)
- CRON_SECRET: Cron job authentication secret
- Email settings: Configured via admin panel (/settings), not env vars
- All validated at startup via src/lib/env.ts (Zod)

## Health Checks
- PostgreSQL: pg_isready
- Redis: redis-cli ping
- App: HTTP GET to / or custom health endpoint

## File Storage
- Path: ./uploads/{year}/{month}/{docId}/
- Mount as Docker volume in production
- Never serve files directly - always through /api/files/ with auth
