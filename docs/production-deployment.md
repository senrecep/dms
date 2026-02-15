# Production Deployment

## Overview

DMS is deployed as a Docker Compose stack with four services:

- **app** — Next.js application (Bun runtime)
- **worker** — BullMQ background job processor (email + notifications)
- **db** — PostgreSQL 17 (Alpine)
- **redis** — Redis 7 (Alpine, AOF persistence, password auth)

### Compose Files

Two production compose files are provided:

| File | Use Case | Ports |
|------|----------|-------|
| `docker-compose.production.yml` | Self-hosted VPS / bare-metal | `${APP_PORT:-3000}:3000` — configurable via env |
| `docker-compose.dokploy.yml` | Dokploy | None — Dokploy's Traefik reverse proxy handles domain routing, SSL, and container networking internally |

> Local development uses `docker-compose.yml` (only db + redis, app runs via `bun dev`).

Choose the appropriate file based on your deployment target. The sections below cover both approaches.

## 1. Server Requirements

- Docker & Docker Compose v2+
- Minimum 2 GB RAM, 2 vCPU
- [Dokploy](https://dokploy.com) installed (optional — can also deploy manually)

## 2. Environment Variables

Create a `.env` file on the server or configure via Dokploy panel:

```env
# Required — use strong, unique values!
POSTGRES_PASSWORD=<generate_strong_password>
REDIS_PASSWORD=<generate_strong_password>
BETTER_AUTH_SECRET=<openssl rand -base64 32>

# App
BETTER_AUTH_URL=https://dms.yourdomain.com
NEXT_PUBLIC_APP_URL=https://dms.yourdomain.com
NEXT_PUBLIC_APP_NAME=DMS

# File Storage
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE_MB=500

# Cron job authentication
CRON_SECRET=<generate_strong_secret>

# Seed (Initial Admin User)
SEED_ADMIN_NAME=System Admin
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=<generate_strong_password>
```

> **Note on email settings:** Email configuration (provider, API keys, SMTP credentials, sender address, language) is managed through the **admin panel** at `/settings` after first login. The seed script creates sensible defaults. You do **not** need email-related environment variables in production — configure everything from the UI.

To generate strong secrets:

```bash
openssl rand -base64 32
```

## 3. Deploy with Docker Compose

### File Structure

The following files should be present on the server:

```
/opt/dms/
├── docker-compose.production.yml   # Production compose (all services)
├── Dockerfile                      # Multi-stage build (app + worker targets)
├── .env                            # Production environment variables
└── src/                            # Application source code
```

### Start the Stack

```bash
cd /opt/dms

# Build and start all services
docker compose -f docker-compose.production.yml up -d --build
```

### Automatic Database Setup

The `init` service runs automatically on every deploy:
1. **db:push** — Applies the latest schema to PostgreSQL (idempotent, only applies changes)
2. **db:seed** — Creates admin user, departments, and default settings (skips if already exist)

The `app` and `worker` services wait for `init` to complete before starting (`service_completed_successfully`).

> The seed uses `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from your environment. After logging in, the admin can create additional users from `/users` and configure email settings from `/settings`.

## 4. Deploy via Dokploy

### Step 1: Create a Project
1. Open the Dokploy panel
2. Select **New Project** > **Docker Compose**
3. Enter the Git repository URL

### Step 2: Compose Settings
- **Compose file**: `./docker-compose.dokploy.yml`
- **Build context**: `.` (root)

### Step 3: Environment Variables
Add all environment variables from the list above via the Dokploy panel.

### Step 4: Domain & SSL
1. Configure your domain in Dokploy: `dms.yourdomain.com`
2. SSL is provisioned automatically via Let's Encrypt
3. Update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to match the domain

### Step 5: Deploy
Click **Deploy**. Dokploy will automatically:
- Build the Docker images
- Start all containers
- Wait for health checks to pass
- Route the domain to the app

## 5. Docker Compose Production Architecture

```yaml
# docker-compose.production.yml:
services:
  db:
    image: postgres:17-alpine
    restart: always
    environment:
      POSTGRES_DB: dms
      POSTGRES_USER: dms
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dms -d dms"]

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://dms:${POSTGRES_PASSWORD}@db:5432/dms
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      UPLOAD_DIR: /app/uploads
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }

  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: worker
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://dms:${POSTGRES_PASSWORD}@db:5432/dms
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }

volumes:
  postgres_data:    # Database files
  redis_data:       # Redis AOF persistence
  uploads_data:     # Uploaded documents
```

> **Worker service:** The worker processes email delivery and notification jobs from the BullMQ queue. It uses a separate Dockerfile stage (`target: worker`) and runs as a standalone Bun process. Without the worker, emails and notifications will be queued but not delivered.

## 6. Volumes and Data Persistence

| Volume | Contents | Importance |
|--------|----------|------------|
| `postgres_data` | All database records | **Critical** — back up regularly |
| `redis_data` | Redis AOF files, session data, cache | Medium |
| `uploads_data` | User-uploaded files (PDF, Office, etc.) | **Critical** — back up regularly |

### Backup

```bash
# PostgreSQL backup
docker compose exec db pg_dump -U dms dms > backup_$(date +%Y%m%d).sql

# Uploaded files backup
docker compose exec app tar czf - /app/uploads > uploads_$(date +%Y%m%d).tar.gz

# Full volume backup
docker run --rm -v dms_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data.tar.gz /data
```

### Restore

```bash
# Restore PostgreSQL
cat backup_20260214.sql | docker compose exec -T db psql -U dms dms

# Restore uploaded files
cat uploads_20260214.tar.gz | docker compose exec -T app tar xzf - -C /
```

## 7. Updates (Zero-Downtime)

```bash
cd /opt/dms

# Pull the latest code
git pull origin main

# Rebuild and redeploy (only app + worker, db/redis untouched)
docker compose -f docker-compose.production.yml up -d --build app worker

# If the schema changed, run migrations
docker compose exec app bun run db:push
```

## 8. Monitoring and Logs

```bash
# Follow all service logs
docker compose logs -f

# Follow only the app logs
docker compose logs -f app

# Follow only the worker logs
docker compose logs -f worker

# Check service status
docker compose ps

# Monitor container resource usage
docker stats
```

## 9. Troubleshooting

### App Not Starting

```bash
# Check app logs
docker compose logs app

# Check if db and redis are healthy
docker compose ps

# Shell into the app container
docker compose exec app sh
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker compose logs worker

# Restart the worker
docker compose restart worker

# Check pending email jobs in Redis
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} LLEN bull:email:wait
```

### Database Connection Issues

```bash
# Connect to the database directly
docker compose exec db psql -U dms dms

# Check active connections
docker compose exec db psql -U dms -c "SELECT count(*) FROM pg_stat_activity;"
```

### Redis Issues

```bash
# Connect to Redis
docker compose exec redis redis-cli -a ${REDIS_PASSWORD}

# Check memory usage
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} INFO memory
```

### Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused images
docker system prune -f
```

## 10. Security Checklist

- [ ] All passwords are strong and unique (min 32 characters)
- [ ] `BETTER_AUTH_SECRET` is unique and secure
- [ ] `CRON_SECRET` is unique and secure
- [ ] SSL/TLS is enabled (Dokploy + Let's Encrypt)
- [ ] `.env` file is not committed to Git (listed in `.gitignore`)
- [ ] PostgreSQL is not accessible externally (only via Docker network)
- [ ] Redis is password-protected (`--requirepass`)
- [ ] `SEED_ADMIN_PASSWORD` is strong (change after first login)
- [ ] `UPLOAD_DIR` has correct write permissions
- [ ] Regular backup plan is in place (daily DB + weekly uploads)
- [ ] Log rotation is configured (set in `docker-compose.production.yml`)
- [ ] Email settings are configured via admin panel (`/settings`)
