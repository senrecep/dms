---
name: create-page
description: Scaffold a new dashboard page with Server Component, i18n, and role-based access
---
Create a new dashboard page for the DMS project.

Ask the user for:
1. Feature name (e.g., "documents", "departments", "settings")
2. Required role (ADMIN, MANAGER, or USER - default USER)

Then create:

1. **Page file**: `src/app/(dashboard)/{feature}/page.tsx`
   - Server Component (no "use client")
   - Use getTranslations() from next-intl/server
   - Add role check if restricted
   - Import and render the feature's main component

2. **Main component**: `src/components/{feature}/{feature}-list.tsx` or appropriate name
   - Use shadcn/ui components (Card, Table, Button, etc.)
   - Use useTranslations() for all strings
   - TanStack Table for data grids if applicable

3. **i18n keys**: Add necessary keys to `src/i18n/messages/en.json` under the feature section

4. **Sidebar link**: Add navigation item in `src/components/layout/sidebar.tsx` with appropriate lucide-react icon

Follow conventions in `.claude/rules/code-style.md` and `.claude/rules/ui-patterns.md`.
