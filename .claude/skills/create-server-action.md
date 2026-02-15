---
name: create-server-action
description: Create a new Server Action with auth, validation, logging, and cache invalidation
---
Create a new Server Action for the DMS project.

Ask the user for:
1. Action name and purpose (e.g., "createDocument", "approveDocument")
2. Input fields and their types
3. Required role (ADMIN, MANAGER, USER)

Then create in `src/actions/{feature}.ts`:

```typescript
"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { headers } from "next/headers"
import { z } from "zod"
```

Every Server Action MUST:
1. Start with `"use server"` directive
2. Get and validate session: `const session = await auth.api.getSession({ headers: await headers() })`
3. Check role authorization
4. Validate input with a Zod schema
5. Perform the database operation via Drizzle
6. Log to activity_logs table
7. Invalidate relevant Redis cache
8. Return typed result: `{ success: true, data }` or `{ success: false, error: string }`
9. Never throw errors to client - always catch and return error objects

Follow conventions in `.claude/rules/api-patterns.md` and `.claude/rules/security.md`.
