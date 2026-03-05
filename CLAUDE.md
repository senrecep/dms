# QMS - Quality Management System

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: PostgreSQL 17 via Drizzle ORM
- **Auth**: Better Auth (email+password, roles: ADMIN/MANAGER/USER)
- **State**: Zustand 5
- **Cache/Session/PubSub**: Redis (ioredis)
- **Job Queue**: BullMQ (async email + notifications via Redis)
- **Real-time**: SSE + Redis Pub/Sub
- **Email**: Resend + React Email
- **i18n**: next-intl (English first, nested keys)
- **Table**: TanStack Table
- **Package Manager**: bun
- **Deployment**: Docker Compose on Dokploy

## Commands
```bash
bun run dev          # Development server
bun run build        # Production build
bun run db:generate  # Generate Drizzle migrations
bun run db:push      # Push schema to DB
bun run db:studio    # Drizzle Studio GUI
bun run db:seed      # Seed database
bun run worker       # Start job queue worker
bun run worker:dev   # Start worker (watch mode)
```

## Project Structure
```
src/
├── app/              # Next.js pages and API routes
│   ├── (dashboard)/  # Authenticated dashboard layout
│   │   ├── documents/  # DMS pages
│   │   ├── approvals/  # Document approvals
│   │   ├── car/        # CAR module pages (dashboard, list, create, detail, print, my-tasks, guide)
│   │   └── settings/   # System & CAR settings
│   ├── api/auth/     # Better Auth endpoints
│   ├── api/files/    # File serving (authenticated)
│   └── api/sse/      # Real-time notifications
├── actions/          # Server Actions (mutations) - includes car-*.ts for CAR module
├── components/
│   ├── car/          # CAR components (form, detail, workflow stepper, dashboard, print, etc.)
│   ├── layout/       # Sidebar, header
│   ├── settings/     # Settings forms (general, email, CAR settings)
│   └── ui/           # shadcn/ui components
├── hooks/            # Custom React hooks
├── i18n/messages/    # Translation files (nested JSON, 1000+ keys)
├── lib/
│   ├── auth/         # Better Auth config
│   ├── car/          # CAR workflow engine (status transitions, validations)
│   ├── db/schema/    # Drizzle schema (25+ tables including CAR module)
│   ├── email/        # Resend + templates (DMS + CAR email templates)
│   ├── queue/        # BullMQ job queue (email + notifications)
│   ├── redis/        # Client, cache, pub/sub
│   ├── sse/          # SSE server utilities
│   └── storage/      # Local file upload/download
├── stores/           # Zustand stores
└── worker.ts         # Standalone queue worker entry point
```

## Critical Rules
1. **Soft Delete**: Never `DELETE` - use `isDeleted=true` + `deletedAt`
2. **Audit Trail**: Every mutation logs to `activity_logs` table
3. **i18n**: All user-facing strings via `useTranslations()`, never hardcoded
4. **Auth**: All routes require session, role-check at Server Action level
5. **Files**: Local storage at `./uploads/{year}/{month}/{docId}/`, serve via API
6. **Schema**: Document code is hybrid (auto-suggest + user-editable, unique)
7. **Async Jobs**: Email and notifications via BullMQ queue, never synchronous in server actions. Use `enqueueEmail`/`enqueueNotification` from `@/lib/queue`

## Communication
- Summaries and questions in Turkish
- Technical terms in English
- Code and commands in English

## Design System
- Primary: #2C3E50 (navy) | Accent: #5DADE2 (blue)
- Danger: #E74C3C (red) | Success: #27AE60 (green)
- Corporate, professional dashboard aesthetic

## Key Workflows

### DMS (Document Management)
- **Upload**: User/Admin uploads → selects approver → distribution list → submit
- **Approval**: Pending → Intermediate (proxy) → Final → Published
- **Rejection**: Red with reason → Draft → notify uploader
- **Revision**: New file → increment rev number → archive old
- **Read Tracking**: Published → notify distribution → confirm reading
- **Escalation**: Configurable reminders → escalate to upper management

### CAR (Corrective Action Request / DFI)
- **Workflow**: Open → Root Cause Analysis → Immediate Action → Planned Action → Action Results → Pending Closure → Closed
- **Root Cause**: Document and analyze root causes for nonconformities
- **Corrective Actions**: Assign actions with owners, teams, target dates, and cost tracking
- **Closure**: Request closure with approval notes, authorized closure by admin/manager
- **Reports**: Print/PDF report generation with full audit trail
- **Settings**: Configurable lookup tables (sources, systems, processes, customers, products, operations)

## Ecosystem (.claude/)
- **Agents**: code-reviewer, db-architect, workflow-designer, frontend-developer, security-auditor, i18n-specialist
- **Commands**: git-pr, db-migrate, dev-setup, add-feature, review
- **Rules**: code-style, git-workflow, security, testing, workflow-rules, api-patterns, ui-patterns, docker-deploy
- **Skills**: create-page, create-server-action, create-schema, create-component
