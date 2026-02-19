# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fest-Planer Österreich — a web app for Austrian associations (Feuerwehr, music clubs, sports clubs, municipalities) to plan and organize festivals. Built with the Lovable platform. The UI and all user-facing text is in **German**.

## Commands

```bash
npm run dev        # Start dev server (port 8080)
npm run build      # Production build → dist/
npm run build:dev  # Development mode build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

There is no test suite configured.

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite (SWC)
- **UI**: shadcn-ui (Radix UI primitives) + Tailwind CSS
- **Routing**: React Router v6 (client-side)
- **State**: React Query (server state), React Hook Form + Zod (forms)
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: Mistral AI SDK (`mistral-small-latest`) with fallback templates

## Architecture

### Path alias
`@/*` maps to `./src/*` (configured in tsconfig and vite.config.ts).

### Routing (src/App.tsx)
All routes defined in a flat `<Routes>` block:
- `/` — Landing page
- `/auth` — Login/signup
- `/dashboard` — Festival list & creation
- `/festival-results?id=X` — Festival details (shift planning)
- `/members` — Global member management

### Data flow
1. `AuthProvider` (React Context) wraps the app and provides `useAuth()` hook
2. Pages call service functions in `src/lib/` for all Supabase operations
3. React Query caches server state; React Hook Form + Zod handle form validation
4. Supabase RLS policies enforce per-user data isolation at the DB level

### Key directories
- `src/pages/` — Route page components
- `src/components/` — Business components + `ui/` subdirectory (50+ shadcn-ui components)
- `src/lib/` — Service layer (all Supabase queries, AI calls, business logic)
- `src/hooks/` — Custom hooks (`use-toast`, `use-mobile`)
- `src/integrations/supabase/` — Supabase client init + generated types
- `supabase/migrations/` — SQL migration files

### Service files (src/lib/)
| File | Purpose |
|------|---------|
| `aiService.ts` | Mistral AI integration (stations, shifts, insights generation) |
| `festivalService.ts` | Festival CRUD & data loading |
| `memberService.ts` | Global member management & preferences |
| `shiftService.ts` | Shift & station operations |
| `automaticAssignmentService.ts` | Fairness-based member-to-shift assignment |

### Shift Planning (src/components/shift-planning/)
Decomposed component architecture for the shift planning feature:
- `ShiftPlanningView.tsx` — Orchestrator: layout, dialog state, drag & drop handler
- `ShiftPlanningHeader.tsx` — Title bar + action buttons
- `StationCard.tsx` / `StationShiftCard.tsx` — Station and shift display with drop zones
- `MemberSidebar.tsx` / `MemberCard.tsx` — Right panel with draggable member cards
- `dialogs/` — StationDialog, StationShiftDialog, MemberDialog, PreferenceDialog, AutoAssignDialog
- `hooks/useShiftPlanningData.ts` — React Query data fetching (stations, shifts, assignments, members, preferences)
- `hooks/useShiftPlanningActions.ts` — React Query mutations with cache invalidation

### Database (Supabase PostgreSQL)
Core tables: `festivals`, `members`, `stations`, `station_shifts`, `shift_assignments`, `festival_member_preferences`. All user-owned tables have RLS policies; `user_id` links to `auth.users`.

## Environment Variables

```
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
VITE_MISTRAL_API_KEY
```

## Conventions

- TypeScript strict mode is **off** — the project uses relaxed type checking
- ESLint flat config (`eslint.config.js`) with react-hooks and react-refresh plugins
- shadcn-ui components live in `src/components/ui/` and follow the default shadcn style
- Lovable tagger plugin is active in dev mode for component labeling
