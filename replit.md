# Ace Your Day (LifeStack)

Student-athlete companion app — daily planner, workouts, nutrition, AI tutor, academic tools, and gamified learning. Originally built on Lovable.dev and ported to the Replit pnpm workspace.

## Project structure

- `artifacts/ace-your-day/` — React + Vite frontend (the main app, served at `/`)
- `artifacts/api-server/` — Express server at `/api` (hosts the podcast TTS endpoint)
- `artifacts/mockup-sandbox/` — design sandbox (unused)
- `lib/api-spec/`, `lib/api-client-react/`, `lib/api-zod/`, `lib/db/` — shared scaffolding (unused so far)

## Backend

The app talks to the **original Supabase project** (`vgqtoqskssjdkzmsegck.supabase.co`) for auth, data, storage, and most AI edge functions. The Supabase URL and anon key are configured as shared env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`).

User confirmed (Apr 29, 2026) to ship as-is on Supabase rather than rewriting tables / auth / edge functions onto Replit primitives.

New Replit-native features are added under `artifacts/api-server/` (Express). Currently:

- `POST /api/podcast/generate` — body `{ text, title, voiceId? }`, returns `audio/mpeg`. Uses the `ELEVENLABS_API_KEY` secret. Default voice id `JBFqnCBsd6RMkjVDRZzb` (works on free tier; "library" voices like Rachel `21m00Tcm4TlvDq8ikWAM` return 402 on free plans). Wired into the Notes page ("Generate Podcast" button).
- `GET /api/weather/forecast?lat=&lon=&date=YYYY-MM-DD` — Open-Meteo (no key needed). Returns daily forecast plus an `isOutdoorSafe` verdict and human-readable reason. Used by `WeatherCheckCard` on the Daily Planner to flag outdoor sports practices and one-click cancel them when conditions are unsafe.
- `GET /api/youtube/search?query=&maxResults=` — uses the `YOUTUBE_API_KEY` secret (YouTube Data API v3). Returns `{ videos: [{id,title,channel,thumbnail,url}] }`. Replaces the old `youtube-search` Supabase edge function — used by the tutor's `VideoResults` component for inline video suggestions.

## Tech

- React 18 + Vite 7 + TypeScript
- Tailwind v3 + shadcn/ui
- react-router-dom v7
- Framer Motion, Recharts, KaTeX, react-markdown
- Supabase JS client (auth + data + storage + functions)
