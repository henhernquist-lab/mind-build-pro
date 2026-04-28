# Ace Your Day (LifeStack)

Student-athlete companion app — daily planner, workouts, nutrition, AI tutor, academic tools, and gamified learning. Originally built on Lovable.dev and ported to the Replit pnpm workspace.

## Project structure

- `artifacts/ace-your-day/` — React + Vite frontend (the main app, served at `/`)
- `artifacts/api-server/` — empty Express scaffold (not used yet — backend is still Supabase)
- `artifacts/mockup-sandbox/` — design sandbox (unused)
- `lib/api-spec/`, `lib/api-client-react/`, `lib/api-zod/`, `lib/db/` — shared scaffolding (unused so far)

## Backend

The app currently talks to the **original Supabase project** (`vgqtoqskssjdkzmsegck.supabase.co`) for auth, data, storage, and edge functions. The Supabase URL and anon key are configured as shared env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`).

Migrating this off Supabase to Replit primitives (Postgres + Clerk + Express routes) is a large piece of work — there are 10+ tables, 10+ edge functions for AI, and Supabase auth across the app. Tracked as a follow-up task.

## Tech

- React 18 + Vite 7 + TypeScript
- Tailwind v3 + shadcn/ui
- react-router-dom v7
- Framer Motion, Recharts, KaTeX, react-markdown
- Supabase JS client (auth + data + storage + functions)
