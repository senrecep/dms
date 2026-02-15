# UI Patterns

## Component Architecture
- Server Components by default for pages and layouts
- "use client" only for: hooks, event handlers, browser APIs, Zustand stores
- Co-locate page-specific components with their pages
- Shared components in src/components/ui/ (shadcn) or src/components/shared/

## shadcn/ui Usage
- Style: new-york variant
- Always check src/components/ui/ before building custom components
- Form pattern: react-hook-form + @hookform/resolvers/zod + shadcn Form
- Table pattern: TanStack Table + shadcn data-table
- Dialog, Sheet, DropdownMenu for overlays and menus

## Corporate Theme (OkLCh)
- Primary: #2C3E50 (navy) - headers, primary actions
- Accent: #5DADE2 (blue) - links, highlights
- Danger: #E74C3C (red) - destructive actions, errors
- Success: #27AE60 (green) - confirmations, success states
- Dark mode: supported via CSS variables in globals.css

## Responsive Design
- Mobile-first approach (min-width breakpoints)
- Test at: 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop)
- Sidebar: collapsible on mobile, persistent on desktop
- Tables: horizontal scroll on mobile, full width on desktop

## Role-Based UI
- Hide admin-only elements based on user role
- Navigation items filtered by role in sidebar
- Action buttons conditional on permissions
- Never rely on UI hiding for security (enforce at Server Action level)

## State Management
- Zustand stores for client state (notifications, UI, filters)
- Server state via Server Components (no client-side data fetching for initial load)
- SSE + Zustand for real-time notification updates
