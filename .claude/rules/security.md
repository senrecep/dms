# Security Rules

## Authentication
- All API routes (except /api/auth/*) require authenticated session
- Role checks: ADMIN, MANAGER, USER - enforce at Server Action level
- Never trust client-side role claims

## File Upload
- Validate file path: no path traversal (../, absolute paths)
- Store files outside web root, serve via API route with auth check
- Generate unique filenames, sanitize original names

## Database
- Never use raw SQL, always parameterized queries via Drizzle
- Soft delete only - never hard DELETE
- Validate all input with Zod before database operations

## API
- Rate limit sensitive endpoints (auth, file upload)
- CSRF protection via Better Auth
- Validate Content-Type headers
