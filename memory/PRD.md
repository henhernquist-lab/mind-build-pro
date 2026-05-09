# LifeStack — Premium Visual Redesign

## Original Problem Statement
Design and build a premium visual redesign of LifeStack — a student athlete productivity app. NO functionality changes. Vibe: Nike Training Club × AAA video-game HUD × luxury sports dashboard. Glassy, tactile, premium, every interaction has weight.

## Stack & Architecture (unchanged)
- **Frontend**: Vite + React 18 + TypeScript + Tailwind + shadcn/ui + framer-motion (single-app, code lives at `/app/src`, dev server runs on port 3000)
- **Auth/DB**: Supabase (`@supabase/supabase-js`) — left untouched
- **Routing**: React Router v6 — left untouched
- **Animations**: framer-motion + canvas-confetti (already installed) + new CSS keyframes

## What's Implemented

### Pass 1 — Foundation (May 8, 2026)
- LifeStack palette mapped to `:root` / `[data-theme="midnight"]`: bg `#080C10`, cyan `#00E5FF`, neon green `#00FF87`, gold `#FBBF24`, danger `#FF4D4D`, text `#E2E8F0`, muted `#64748B`
- Typography: Bebas Neue (display) + Barlow Condensed (stat) + Barlow (body) + JetBrains Mono (scoreboard) — Google Fonts
- Global breathing radial gradients (cyan + neon) at opposite corners
- 4-px cyan custom scrollbar
- `prefers-reduced-motion` honored
- Comprehensive utility set: `.glass`, `.glass-strong`, `.lift`, `.holo-border`, `.holo-sheen`, `.shimmer-text`, `.shimmer-surface`, `.xp-bar-track`/`.xp-bar-fill` (+ `.urgent`), `.live-dot`, `.btn-primary-glow`, `.stagger`, `.grid-overlay`, `.ripple-ring`, `.slow-spin`, `.check-pop`, `.trophy-bounce`, `.scoreboard`
- AppShell sidebar (frosted glass, accent line, glowing active pill, grid overlay) + animated mobile bottom nav
- GlowingXpBar — holographic rotating border, Bebas Neue rank name with shimmer-sweep, monospaced count-up XP, live-broadcast dot, urgent pulse
- RankCountdown — broadcast pill (red border + pulsing dot + scoreboard timer)
- AthleteCard — holographic sheen sweep on hover + glowing avatar ring
- Auth — Bebas Neue wordmark, glass card, gradient glow submit
- AceAssistant FAB — cyan→neon gradient, ripple ring on suggestion, slow-spin hover
- Bug fix: removed unused `PERIOD_DAYS_EXPORT` re-export in `lib/seasons/hallOfFame.ts` that caused circular-import TDZ blank screen

### Pass 2 — Polishing (May 9, 2026)
- **Rank tier journey strip** added below each GlowingXpBar — 5 tiers horizontally; completed glow in their color, current pulses (scaled 110%), future ones dim/grayscale; gradient connector lines between tiers
- **Workouts** — Bebas Neue header, gradient title, stagger entrance, set-row transformed: cyan-tinted left border for sets, gold-tinted left border + glow + bouncing trophy icon + gold-tinted text for PR rows
- **DailyPlanner** — Bebas Neue greeting with gradient text, scoreboard 0.0h summary cards with colored top border + glow, schedule rows redesigned as tinted pills with left-accent + soft glow + Bebas Neue label
- **Nutrition** — MacroRing upgraded with SVG glow filter, scoreboard percentage, Bebas Neue value, smoother 800ms ease-out animation; macro colors aligned to spec (Calories=cyan, Protein=orange, Carbs=neon green, Fat=gold)
- **WaterTracker** — `.water-card` wrapper with bottom-up liquid fill via `--water-fill` CSS var, animated wave at fill line, `.water-flood` pulse when goal-hit threshold is crossed, scoreboard L value with cyan glow, gradient progress bar with shimmer
- New utilities: `.water-card`, `.water-flood`, `.time-block`, `.timer-hero`, `.pill-indicator`

## Key Files Touched
- `src/index.css` (rewrite — tokens, fonts, utilities, animations)
- `src/components/planner/AppShell.tsx`
- `src/components/profile/GlowingXpBar.tsx` (rewrite + tier journey)
- `src/components/profile/RankCountdown.tsx` (rewrite)
- `src/components/profile/AthleteCard.tsx`
- `src/components/ace/AceAssistant.tsx`
- `src/components/nutrition/WaterTracker.tsx` (water-card + flood)
- `src/pages/Auth.tsx`
- `src/pages/Profile.tsx` (stagger + ranks prop)
- `src/pages/Workouts.tsx` (stagger + PR/set row redesign)
- `src/pages/DailyPlanner.tsx` (header + summary + schedule pills)
- `src/pages/Nutrition.tsx` (MacroRing + spec colors)
- `src/lib/seasons/hallOfFame.ts` (removed dead re-export)
- `vite.config.ts` (port 3000 for ingress)

## Functional Code — Untouched
Routing, Supabase auth, Claude API calls, XP calc, rank reset, workout logging, nutrition tracking, Desmos, mind-map, achievements — all preserved.

## Backlog / P1
- Tie confetti rank-up overlay to `xp-bar-fill.urgent` → 100% threshold event (use existing canvas-confetti)
- Floating-XP color tiers (+10 cyan, +50 gold for PRs) in `FloatingXp.tsx`
- AI Tutor message bubbles: cyan glassmorphism (user, right) + dark frosted left-border (AI, left) with directional slide-in
- Apply `.timer-hero` to active workout session timer (when started)

## Backlog / P2
- Game-cover dramatic gradient cards (Boss Battles / Algebra Dungeon / Georgia Conquest / Flashcard Battle) when Games section is added
- Current-time horizontal red indicator line in DailyPlanner schedule
- Macro micro-interactions: ring pulse when target crossed

## Test Credentials
None seeded. Supabase project still requires real signup; tested via on-the-fly account creation during implementation. Email confirmation NOT required (signUp returns session immediately).
