# API & Server Action Patterns

## Server Actions (src/actions/)
- All mutations go through Server Actions, not API routes
- Always validate session first: `const session = await auth.api.getSession()`
- Check role permissions before data access
- Validate all input with Zod schemas
- Return typed responses: `{ success: true, data }` or `{ success: false, error }`

## API Routes (src/app/api/)
- Reserved for: auth catch-all, SSE endpoint, file serving
- Auth routes: /api/auth/[...all] (Better Auth handles)
- SSE: /api/sse (GET, requires session auth)
- Files: /api/files/[...path] (GET, requires session auth, supports range requests)

## Redis Cache Pattern
- Cache key format: `dms:{entity}:{id}` or `dms:{entity}:list:{filters}`
- Default TTL: configure per entity type
- Invalidation: pattern-based via SCAN on mutations
- Never cache sensitive data (passwords, tokens)

## Error Handling
- Server Actions: try/catch, return error object (never throw to client)
- API Routes: proper HTTP status codes (401, 403, 404, 500)
- Log errors server-side, return safe messages to client

## Rate Limiting
- Auth endpoints: strict rate limiting
- File upload: rate limit per user
- Use Redis for rate limit counters
