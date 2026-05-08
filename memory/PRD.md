# LifeStack — Premium Visual Redesign

## Original Problem Statement
Design and build a premium visual redesign of LifeStack — a student athlete productivity app. NO functionality changes. Vibe: Nike Training Club × AAA video-game HUD × luxury sports dashboard. Glassy, tactile, premium, every interaction has weight.

## Stack & Architecture (unchanged)
- **Frontend**: Vite + React 18 + TypeScript + Tailwind + shadcn/ui + framer-motion (single-app, code lives at `/app/src`, dev server runs on port 3000)
- **Auth/DB**: Supabase (`@supabase/supabase-js`) — left untouched
- **Routing**: React Router v6 — left untouched
- **Animations**: framer-motion + canvas-confetti (already installed) + new CSS keyframes

## What's Implemented (May 8, 2026)

### Design tokens (`src/index.css`)
- New LifeStack palette mapped to `:root` / `[data-theme="midnight"]`:
  - background `#080C10` (deep space black)
  - cyan `#00E5FF`, neon green `#00FF87`, gold `#FBBF24`, danger red `#FF4D4D`
  - text `#E2E8F0`, muted `#64748B`
  - surfaces `rgba(255,255,255,0.03)` glass + `rgba(255,255,255,0.06)` borders
- Typography: **Bebas Neue** (display) + **Barlow Condensed** (stat/labels) + **Barlow** (body) + **JetBrains Mono** (scoreboard numbers) — loaded from Google Fonts
- All five existing themes preserved with the LifeStack font family

### Global atmosphere
- Two breathing radial gradients (cyan + neon green) at opposite corners — subtle, pulse 14–16s
- Custom 4-px cyan scrollbar from spec
- `prefers-reduced-motion` honored across every animation

### Utilities (drop-in classes)
- `.glass` / `.glass-strong` — frosted surfaces
- `.lift` — 4-px hover lift with cyan border + soft glow
- `.holo-border` — rotating conic-gradient (cyan→green→gold) trophy border
- `.holo-sheen` — 115° light-sweep on hover (athlete card)
- `.shimmer-text` / `.shimmer-surface` — sweep animations
- `.xp-bar-track` + `.xp-bar-fill` (+ `.urgent` near rank-up) — liquid gradient + shimmer
- `.live-dot` — red pulsing broadcast dot
- `.btn-primary-glow` — gradient cyan→neon button with shimmer + lift
- `.stagger > *` — page-load staggered entrance
- `.grid-overlay` — 3% subtle grid texture
- `.ripple-ring`, `.slow-spin`, `.check-pop`, `.trophy-bounce` — micro-interactions
- `.scoreboard` — monospaced tabular numbers

### Component upgrades (visual only)
- **`AppShell`** — frosted glass sidebar with cyan accent line, glowing pill active nav, grid overlay, animated mobile bottom nav with sliding indicator + scaling icons
- **`GlowingXpBar`** — full rank-card crown jewel: holographic rotating border, 48-px rank icon glow, Bebas Neue rank name with shimmer-sweep, monospaced count-up XP, broadcast live-dot label, urgent pulse near threshold
- **`RankCountdown`** — live broadcast pill (red border + pulsing dot + scoreboard timer)
- **`AthleteCard`** — holographic sheen sweep on hover, glowing avatar ring in rank color, glassy backdrop
- **`Auth`** — Bebas Neue LIFESTACK wordmark, premium glass card, gradient glow submit button
- **`AceAssistant`** FAB — cyan→neon gradient with ripple ring when proactive, slow-spin on hover

### Critical bug fix (blocking before redesign)
- **Circular import TDZ**: removed unused `PERIOD_DAYS_EXPORT` re-export in `lib/seasons/hallOfFame.ts` that caused `Cannot access 'PERIOD_DAYS' before initialization` and rendered a blank screen. App now boots cleanly.

## Key Files Touched
- `src/index.css` (rewrite — tokens, fonts, utilities, animations)
- `src/components/planner/AppShell.tsx` (sidebar + mobile nav)
- `src/components/profile/GlowingXpBar.tsx` (rewrite)
- `src/components/profile/RankCountdown.tsx` (rewrite)
- `src/components/profile/AthleteCard.tsx` (holo sheen + lift)
- `src/components/ace/AceAssistant.tsx` (FAB)
- `src/pages/Auth.tsx` (header + button)
- `src/lib/seasons/hallOfFame.ts` (removed dead re-export)
- `src/lib/ranks2.ts` (kept — only re-ordered import for clarity)
- `vite.config.ts` (port 3000 for ingress)

## Functional Code — Untouched
Routing, Supabase auth, Claude API calls, XP calc, rank reset, workout logging, nutrition, Desmos, mind-map, achievements — all preserved.

## Backlog / P1
- Hook `.stagger` onto Profile / Workouts page roots for the spec's 1.5-s page-load sequence
- Wire `check-pop` / `trophy-bounce` into workout-set completion + PR row
- Macro rings (cyan/orange/green/yellow) — circular SVG ring in `Nutrition.tsx`
- Liquid water-fill on water-tracker card
- Game-cover dramatic gradient cards in Games section (when added)
- Time-block left-accent pill styling in DailyPlanner schedule rows

## Backlog / P2
- Confetti rank-up overlay tie-in to `xp-bar-fill.urgent` → 100%
- Boss Battles / Algebra Dungeon themed cards
- Floating-XP color tiers (+10 cyan, +50 gold for PRs)

## Test Credentials
None seeded. Supabase project still requires real signup; tested via on-the-fly account creation during implementation.
