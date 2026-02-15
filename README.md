# DMS — Document Management System

[![GitHub](https://img.shields.io/badge/GitHub-senrecep%2Fdms-181717?logo=github)](https://github.com/senrecep/dms)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A full-featured, enterprise-grade document management system built for organizations that need structured document creation, multi-level approval workflows, controlled distribution, and auditable read confirmations. Designed with a corporate aesthetic and role-based access control.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Commands](#available-commands)
- [Document Lifecycle](#document-lifecycle)
- [Authentication & Roles](#authentication--roles)
- [Email System](#email-system)
- [Real-Time Notifications](#real-time-notifications)
- [Background Jobs](#background-jobs)
- [Internationalization](#internationalization)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Role-Based Permissions](#role-based-permissions)
- [Documentation](#documentation)
- [License](#license)

## Features

- **Document Management** — Upload, version, and organize documents with unique codes and classification (Procedure, Instruction, Form)
- **Multi-Level Approval Workflow** — Intermediate and final approval stages with configurable approvers
- **Controlled Distribution** — Distribute published documents to specific departments and/or individual users
- **Read Confirmation Tracking** — Track who has read published documents in real time
- **Automated Reminders & Escalation** — Configurable reminder periods for unread documents and pending approvals, with automatic escalation to management
- **Revision Control** — Full revision history with automatic archiving of previous versions
- **Role-Based Access Control** — Three roles (Admin, Manager, User) with granular permissions enforced at the server level
- **Real-Time Notifications** — Server-Sent Events (SSE) powered by Redis Pub/Sub for instant in-app notifications
- **Async Email Delivery** — All emails processed through BullMQ job queue for reliability and retry support
- **Multi-Language Support** — Full TR/EN support for both the UI (next-intl) and email templates (standalone dictionary)
- **Audit Trail** — Every mutation logged to an activity log with before/after state
- **Soft Delete** — No data is ever permanently deleted; all records use soft-delete flags
- **Dark Mode** — Full dark mode support via CSS variables
- **Mobile-Responsive** — Mobile-first design with responsive breakpoints

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| Language | [TypeScript](https://www.typescriptlang.org/) (strict mode) |
| Runtime | [Bun](https://bun.sh/) (dev, build & Docker runtime) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (new-york variant) |
| Database | [PostgreSQL 17](https://www.postgresql.org/) via [Drizzle ORM](https://orm.drizzle.team/) |
| Authentication | [Better Auth](https://www.better-auth.com/) (email + password, session-based) |
| State Management | [Zustand 5](https://zustand.docs.pmnd.rs/) |
| Cache / PubSub | [Redis 7](https://redis.io/) via [ioredis](https://github.com/redis/ioredis) |
| Job Queue | [BullMQ](https://bullmq.io/) (email + notification workers) |
| Real-Time | SSE (Server-Sent Events) + Redis Pub/Sub |
| Email | [Resend](https://resend.com/) / SMTP + [React Email](https://react.email/) |
| i18n | [next-intl](https://next-intl.dev/) (UI) + standalone dictionary (emails) |
| Tables | [TanStack Table](https://tanstack.com/table/) |
| Validation | [Zod](https://zod.dev/) |
| Containerization | Docker + Docker Compose |

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                  │
│  React 19 · Zustand · SSE EventSource · next-intl   │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
          HTTP/HTTPS              SSE Stream
               │                      │
┌──────────────▼──────────────────────▼───────────────┐
│              Next.js App Server                      │
│  App Router · Server Components · Server Actions     │
│  Better Auth · API Routes (/auth, /files, /sse)      │
└───────┬────────────┬─────────────┬──────────────────┘
        │            │             │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
   │ Postgres │  │  Redis  │  │  Local  │
   │  (data)  │  │ (cache, │  │ Storage │
   │ Drizzle  │  │  pubsub,│  │(uploads)│
   │   ORM    │  │  queue) │  │         │
   └──────────┘  └────┬────┘  └─────────┘
                      │
              ┌───────▼────────┐
              │  BullMQ Worker │
              │  (standalone)  │
              │  Email + Notif │
              └────────────────┘
```

**Key architectural decisions:**

- **Server Components by default** — Pages and layouts are Server Components; `"use client"` only when hooks, event handlers, or browser APIs are needed.
- **Server Actions for mutations** — All data mutations go through Server Actions (`src/actions/`), never through API routes.
- **Async job processing** — Emails and notifications are enqueued via BullMQ and processed by a standalone worker process, keeping Server Actions fast.
- **SSE over WebSockets** — Simpler to deploy behind reverse proxies; Redis Pub/Sub bridges multiple server instances.

## Project Structure

```
src/
├── app/                          # Next.js pages and API routes
│   ├── (dashboard)/              # Authenticated dashboard layout
│   │   ├── approvals/            #   Approval management
│   │   ├── dashboard/            #   Stats overview
│   │   ├── departments/          #   Department CRUD
│   │   ├── documents/            #   Document list, detail, upload, revise
│   │   ├── guide/                #   User guide page
│   │   ├── notifications/        #   Notification center
│   │   ├── profile/              #   User profile & password change
│   │   ├── read-tasks/           #   Read confirmation tasks
│   │   ├── settings/             #   System settings (admin only)
│   │   └── users/                #   User management (admin only)
│   ├── api/
│   │   ├── auth/[...all]/        #   Better Auth catch-all
│   │   ├── documents/upload/     #   File upload endpoint
│   │   ├── files/[...path]/      #   Authenticated file serving
│   │   └── sse/                  #   Real-time notification stream
│   └── login/                    # Public login page
├── actions/                      # Server Actions (all mutations)
│   ├── approvals.ts              #   Approve, reject documents
│   ├── documents.ts              #   Create, cancel, publish, revise
│   ├── read-confirmations.ts     #   Confirm document reading
│   └── settings.ts               #   System & email settings
├── components/
│   ├── layout/                   #   App shell, sidebar, header
│   └── ui/                       #   shadcn/ui components
├── hooks/                        # Custom React hooks
├── i18n/messages/                # Translation files
│   ├── en.json                   #   English translations
│   └── tr.json                   #   Turkish translations
├── lib/
│   ├── auth/                     #   Better Auth configuration
│   ├── db/
│   │   ├── schema/               #   Drizzle schema (15 files)
│   │   ├── index.ts              #   Database connection
│   │   └── seed.ts               #   Initial data seeding
│   ├── email/
│   │   ├── config.ts             #   Email provider config + language cache
│   │   ├── index.ts              #   sendEmail() core function
│   │   ├── translations.ts       #   Email string dictionary (TR + EN)
│   │   └── templates/            #   11 React Email templates
│   ├── jobs/                     #   BullMQ job handlers
│   │   ├── approval-escalation.ts
│   │   ├── approval-reminder.ts
│   │   └── read-reminder.ts
│   ├── queue/                    #   BullMQ queue infrastructure
│   │   ├── index.ts              #   enqueueEmail / enqueueNotification
│   │   ├── templates.ts          #   Template resolver
│   │   ├── types.ts              #   Payload type definitions
│   │   └── worker.ts             #   Worker job routing
│   ├── redis/                    #   Redis client, cache, pub/sub
│   ├── sse/                      #   SSE server utilities
│   └── storage/                  #   Local file upload/download
├── stores/                       # Zustand stores
└── worker.ts                     # Standalone worker entry point
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.x+
- [Docker](https://www.docker.com/) & Docker Compose
- Git

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/senrecep/dms.git
cd dms

# 2. Create environment file
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables section)

# 3. Start PostgreSQL and Redis
docker compose up -d

# 4. Install dependencies
bun install

# 5. Push database schema
bun run db:push

# 6. Seed initial data (admin user + departments)
bun run db:seed

# 7. Start the development server
bun dev

# 8. (In a separate terminal) Start the background worker
bun run worker:dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the credentials from your `.env.local` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

> For a comprehensive local setup guide with troubleshooting, see **[docs/local-development.md](docs/local-development.md)**.

## Available Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server (Turbopack) |
| `bun run build` | Create production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:push` | Push schema directly to database |
| `bun run db:studio` | Open Drizzle Studio GUI |
| `bun run db:seed` | Seed admin user, departments, and settings |
| `bun run worker` | Start BullMQ worker (production) |
| `bun run worker:dev` | Start BullMQ worker (watch mode) |

## Document Lifecycle

Every document follows a structured lifecycle with full audit trail:

```
  ┌─────────┐     Submit      ┌──────────────────┐
  │  Draft   │───────────────▶│ Pending Approval  │
  └─────────┘                 └────────┬─────────┘
       ▲                               │
       │ Rejected               Intermediate
       │                        Approval ↓
       │                     ┌──────────────────────┐
       └─────────────────────│Intermediate Approval  │
                             └──────────┬───────────┘
                                        │
                                  Final Approval
                                        ↓
                              ┌──────────────────┐      Publish     ┌───────────┐
                              │     Approved     │─────────────────▶│ Published │
                              └──────────────────┘                  └─────┬─────┘
                                                                          │
                                                                    Revise │
                                                                          ↓
                                                                   ┌───────────┐
                                                        Old rev →  │ Revision  │
                                                        Passive    └───────────┘
```

**Post-publish automation:**
1. All users in the distribution list receive email notifications
2. Read tasks are created for each recipient
3. Automated reminders are sent after configurable days
4. Unread tasks escalate to department managers

## Authentication & Roles

Built on [Better Auth](https://www.better-auth.com/) with email + password authentication and session-based authorization.

| Role | Capabilities |
|------|-------------|
| **Admin** | Full system access: manage users, departments, settings, all documents |
| **Manager** | Approve/reject documents, manage department documents, view reports |
| **User** | Upload documents, view published documents, confirm reading |

- All routes require an authenticated session
- Role checks are enforced at the Server Action level (never client-side only)
- Admin creates initial users; users receive a welcome email with password setup link

## Email System

DMS supports two email providers, configurable from the admin settings panel:

- **Resend** — API-based delivery (recommended for most deployments)
- **SMTP** — Traditional SMTP for on-premise or custom mail servers

All 11 email templates are built with [React Email](https://react.email/) and support **TR/EN localization** via a standalone translation dictionary (since templates render in the BullMQ worker process where React context is unavailable).

**Email templates:**
| Template | Trigger |
|----------|---------|
| Welcome | New user created |
| Approval Request | Document submitted for approval |
| Approval Reminder | Pending approval exceeds reminder threshold |
| Document Approved | Approver approves a document |
| Document Rejected | Approver rejects a document |
| Document Revised | New revision uploaded |
| Document Cancelled | Document cancelled by owner |
| Read Assignment | Document published to distribution list |
| Read Reminder | Unread document exceeds reminder threshold |
| Escalation Notice | Unread/unapproved item escalated to management |
| Test Email | Sent from admin settings to verify configuration |

The email language is configurable from **Settings > Email Settings** and defaults to Turkish.

## Real-Time Notifications

DMS uses **Server-Sent Events (SSE)** with **Redis Pub/Sub** for real-time in-app notifications:

1. A Server Action enqueues a notification via BullMQ
2. The worker processes it, saves to database, and publishes to Redis Pub/Sub
3. The SSE endpoint (`/api/sse`) streams events to connected clients
4. Zustand store updates the notification badge in real time

This architecture scales to multiple server instances since Redis Pub/Sub bridges all SSE connections.

## Background Jobs

The standalone BullMQ worker (`src/worker.ts`) handles:

| Job Type | Description |
|----------|-------------|
| `send-email` | Render React Email template and send via Resend/SMTP |
| `send-notification` | Create notification record + publish SSE event |
| `approval-reminder` | Periodic check for stale pending approvals |
| `read-reminder` | Periodic check for unconfirmed read tasks |
| `approval-escalation` | Escalate long-pending approvals to management |

Start the worker alongside the app server:
```bash
# Development (auto-restart on changes)
bun run worker:dev

# Production
bun run worker
```

## Internationalization

### UI (next-intl)

All user-facing strings use `useTranslations()` with nested keys:

```typescript
const t = useTranslations("documents.status");
t("draft");      // "Draft" (en) | "Taslak" (tr)
t("published");  // "Published" (en) | "Yayinlandi" (tr)
```

Translation files: `src/i18n/messages/en.json` and `src/i18n/messages/tr.json`

### Email Templates (standalone dictionary)

Since email templates render in the worker process (no React context), they use a standalone translation dictionary:

```typescript
import { emailStrings } from "@/lib/email/translations";

const t = emailStrings[locale].approvalRequest;
// t.heading, t.greeting, t.body, etc.
```

The email language is stored in `system_settings` (`email_language` key) and cached with a 60-second TTL.

## Database Schema

PostgreSQL 17 with 15 schema files managed by Drizzle ORM:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles (extends Better Auth) |
| `sessions` / `accounts` / `verifications` | Better Auth session management |
| `departments` | Organizational departments |
| `documents` | Core document records with status, code, type |
| `document_revisions` | Version history with file references |
| `approvals` | Approval records (intermediate + final) |
| `distribution_lists` | Department-level document distribution |
| `distribution_users` | User-level document distribution |
| `read_confirmations` | Read confirmation tracking per user |
| `notifications` | In-app notification records |
| `activity_logs` | Full audit trail (JSONB details) |
| `system_settings` | Key-value system configuration |

**Key conventions:**
- Soft delete everywhere (`isDeleted` + `deletedAt`)
- All mutations log to `activity_logs`
- `camelCase` in Drizzle, `snake_case` in PostgreSQL
- Schema files: `src/lib/db/schema/`

## Deployment

DMS is containerized with a multi-stage Dockerfile:

| Stage | Base | Purpose |
|-------|------|---------|
| `deps` | `oven/bun:1` | Install dependencies (fast lockfile + native dep handling) |
| `build` | `oven/bun:1` | Build Next.js application (@parcel/watcher compatibility) |
| `runner` | `oven/bun:1-slim` | Production app server |
| `worker` | `oven/bun:1-slim` | Background job worker |
| `init` | `oven/bun:1-slim` | One-shot: db:push + db:seed |

Production deploys as five Docker Compose services:
- **db** — PostgreSQL 17 (Alpine)
- **redis** — Redis 7 (Alpine, AOF persistence, password auth)
- **init** — One-shot container: runs `db:push` + `db:seed` on every deploy (idempotent), then exits
- **app** — Next.js application (Bun runtime), starts after init completes
- **worker** — BullMQ background job processor (Bun runtime), starts after init completes

### Compose Files

The project provides three compose files for different environments:

| File | Environment | Ports | Use Case |
|------|-------------|-------|----------|
| `docker-compose.yml` | Local development | db: 5432, redis: 6379 | Only starts db + redis; app runs via `bun dev` |
| `docker-compose.production.yml` | Self-hosted VPS | `${APP_PORT:-3000}:3000` | All 4 services, port configurable via env |
| `docker-compose.dokploy.yml` | Dokploy | None (internal) | All 4 services, no ports exposed — Dokploy's Traefik reverse proxy handles domain routing and SSL |

**Self-hosted VPS:**

```bash
docker compose -f docker-compose.production.yml up -d --build
```

**Dokploy:** Set `Compose Path` to `./docker-compose.dokploy.yml` in the Dokploy panel. Dokploy handles domain routing, SSL (Let's Encrypt), and container networking automatically.

> For the complete deployment guide including Dokploy step-by-step, backup/restore, monitoring, and security checklist, see **[docs/production-deployment.md](docs/production-deployment.md)**.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (min 32 chars, `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Yes | Public application URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Public application URL (client-side) |
| `NEXT_PUBLIC_APP_NAME` | No | Display name (default: `DMS`) |
| `UPLOAD_DIR` | No | File storage path (default: `./uploads`) |
| `MAX_FILE_SIZE_MB` | No | Max upload size in MB (default: `500`) |
| `DEFAULT_REMINDER_DAYS` | No | Days before unread reminders (default: `3`) |
| `DEFAULT_ESCALATION_DAYS` | No | Days before approval escalation (default: `7`) |
| `CRON_SECRET` | No | Secret for authenticating cron job requests |
| `SEED_ADMIN_NAME` | No | Initial admin name (default: `System Admin`) |
| `SEED_ADMIN_EMAIL` | No | Initial admin email (default: `admin@dms.com`) |
| `SEED_ADMIN_PASSWORD` | Seed | Initial admin password (required for seeding) |

> **Email configuration** (provider, API keys, SMTP credentials, sender address, language) is managed through the admin panel at `/settings` — not via environment variables. The seed script creates sensible defaults.

All variables are validated at startup via Zod (`src/lib/env.ts`).

## Documentation

| Document                                                       | Description                                                                                                                      |
|----------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| [docs/local-development.md](docs/local-development.md)         | Complete local development setup guide with prerequisites, step-by-step instructions, Drizzle Studio usage, and troubleshooting  |
| [docs/production-deployment.md](docs/production-deployment.md) | Production deployment guide covering Docker Compose configuration, Dokploy integration, volume management, backup/restore, and security checklist |

## Role-Based Permissions

DMS has three roles with distinct capabilities. Permissions are enforced at the Server Action level — UI elements are hidden for convenience, but security is never client-side only.

### Pages & Navigation

| Page | Admin | Manager | User |
|------|:-----:|:-------:|:----:|
| Dashboard | Yes | Yes | Yes |
| Documents (list & detail) | Yes | Yes | Yes |
| Upload Document | Yes | Yes | Yes |
| Approvals | Yes | Yes | Yes |
| Read Tasks | Yes | Yes | Yes |
| Notifications | Yes | Yes | Yes |
| Profile & Password | Yes | Yes | Yes |
| Guide | Yes | Yes | Yes |
| **Departments** | **Yes** | No | No |
| **Users** | **Yes** | No | No |
| **Settings** | **Yes** | No | No |

### Document Actions

| Action | Admin | Manager | User |
|--------|:-----:|:-------:|:----:|
| Create / upload document | Yes | Yes | Yes |
| View own documents | Yes | Yes | Yes |
| View all documents | Yes | Yes | Yes |
| Cancel own document | Yes | Yes | Yes |
| Publish approved document | Yes | Yes | Yes |
| Create revision | Yes | Yes | Yes |
| Be selected as approver | Yes | Yes | No |

### Approval Actions

| Action | Admin | Manager | User |
|--------|:-----:|:-------:|:----:|
| Approve / reject documents | Yes | Yes | No |
| View pending approvals | Yes | Yes | Yes |
| View completed approvals | Yes | Yes | Yes |

### Read Confirmation

| Action | Admin | Manager | User |
|--------|:-----:|:-------:|:----:|
| View assigned read tasks | Yes | Yes | Yes |
| Confirm document reading | Yes | Yes | Yes |
| View read status of documents | Yes | Yes | Yes |

### Administration

| Action | Admin | Manager | User |
|--------|:-----:|:-------:|:----:|
| Create / edit / delete departments | **Yes** | No | No |
| Create / edit / deactivate users | **Yes** | No | No |
| Assign roles to users | **Yes** | No | No |
| Configure system settings | **Yes** | No | No |
| Configure email settings | **Yes** | No | No |
| Send test emails | **Yes** | No | No |
| View system-wide statistics | **Yes** | No | No |

### Notifications & Escalation

| Event | Who Receives |
|-------|-------------|
| Document submitted for approval | Assigned approver |
| Document approved | Document owner |
| Document rejected | Document owner |
| Document published | All users in distribution list |
| Read reminder (after N days) | Users who haven't confirmed reading |
| Approval reminder (after N days) | Approver with pending approval |
| Escalation notice | Admin (when approval/read exceeds escalation threshold) |

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2026 DMS Contributors.
