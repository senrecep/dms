---
name: create-component
description: Create a React component following DMS conventions with shadcn/ui and i18n
---
Create a new React component for the DMS project.

Ask the user for:
1. Component name and purpose
2. Whether it needs client-side interactivity (hooks, events)
3. Which shadcn/ui components it should use

Then create in the appropriate location:
- Feature-specific: `src/components/{feature}/{component-name}.tsx`
- Shared: `src/components/shared/{component-name}.tsx`

Component conventions:
1. **Server Component** by default (no directive needed)
2. Add `"use client"` ONLY if it uses: hooks, event handlers, browser APIs, Zustand
3. File name: kebab-case (e.g., `document-card.tsx`)
4. Component name: PascalCase (e.g., `DocumentCard`)
5. All user-facing strings via useTranslations() or getTranslations()
6. Use shadcn/ui components from src/components/ui/ - never rebuild what shadcn provides
7. Props type defined with `type` keyword (not interface)
8. Corporate theme colors via CSS variables (not hardcoded hex)
9. Responsive: mobile-first with Tailwind breakpoints

Add i18n keys to `src/i18n/messages/en.json` if new strings are needed.
