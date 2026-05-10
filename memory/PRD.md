# LifeStack — Premium Visual + Interaction Redesign

## Original Problem Statement
Design and build a premium visual and interaction upgrade for LifeStack — a student-athlete productivity app. NO functionality changes. Vibe: Nike Training Club × AAA video-game HUD × luxury sports dashboard. Every interaction has weight.

## Stack & Architecture (unchanged)
- Vite + React 18 + TypeScript + Tailwind + shadcn/ui + framer-motion
- Supabase (auth + DB) — untouched
- React Router v6 — untouched
- Vite dev server on port 3000, supervisor-managed via `/app/frontend` shim

## What's Implemented

### Pass 1 — Foundation (May 8, 2026)
- LifeStack palette mapped to `:root` / `[data-theme="midnight"]`: bg `#080C10`, cyan `#00E5FF`, neon `#00FF87`, gold `#FBBF24`, danger `#FF4D4D`
- Typography stack: Bebas Neue (display) · Barlow Condensed (stat) · Barlow (body) · JetBrains Mono (scoreboard)
- Global breathing radial gradients (cyan + neon) at opposite corners
- 4-px cyan custom scrollbar
- `prefers-reduced-motion` honoured
- Comprehensive utility set: `.glass`, `.glass-strong`, `.lift`, `.holo-border`, `.holo-sheen`, `.shimmer-text`, `.shimmer-surface`, `.xp-bar-track`/`.xp-bar-fill`, `.live-dot`, `.btn-primary-glow`, `.stagger`, `.grid-overlay`, `.ripple-ring`, `.slow-spin`, `.check-pop`, `.trophy-bounce`, `.scoreboard`
- AppShell: frosted sidebar, cyan accent line, mobile bottom nav with sliding pill
- Bug fix: removed unused `PERIOD_DAYS_EXPORT` re-export that caused a circular-import TDZ

### Pass 2 — Polishing (May 9, 2026)
- Rank-tier journey strip (5 tiers, current pulses, completed glow, future dim)
- Workouts: stagger entrance, gold-tinted PR rows with bouncing trophy
- DailyPlanner: gradient greeting, scoreboard summary cards, schedule pills with colored tints
- Nutrition: MacroRing with SVG glow filter; spec colors (Calories=cyan, Protein=orange, Carbs=neon, Fat=gold)
- WaterTracker: bottom-up `.water-card` liquid fill, animated wave, `.water-flood` flood pulse on goal-hit
- New utilities: `.water-card`, `.water-flood`, `.time-block`, `.timer-hero`, `.pill-indicator`

### Pass 3 — Interaction & Motion (May 10, 2026)
**Core interaction layer:**
- **Custom cursor (desktop only)**: outer ring with spring lag (0.18) + inner dot at 1:1; grows to 44 px on hoverables, morphs to vertical bar on text inputs, ripple pulse on press; auto-disabled on `(hover: none)` / `(pointer: coarse)`
- **Universal `.press`**: hover translateY(-2 px) + brightness, active scale(0.97) + push-down with spring overshoot
- **Click ripple**: every `<Button>` spawns a 600 ms radial ripple at the click point (pointer-down driven, respects `prefers-reduced-motion`)
- **Primary shimmer**: default & premium `<Button>` variants get the 4-second cyan→neon sweeping `.btn-shimmer` background
- **Page transitions**: refined to spec — outgoing fade + slide-up 12 px (180 ms) → incoming fade + slide-up from below (220 ms) + light blur for stretchy motion-blur feel

**Sidebar + nav:**
- **Sliding active pill** in the desktop sidebar via framer-motion `layoutId="sidebar-active-pill"` (spring 380/30) — physically slides between items
- Active nav icon scales 1.10 + glows in accent color
- Mobile bottom nav: layoutId pill (`mobile-nav-pill`), active icon scale 1.15 with glow + label slide-up; **`navigator.vibrate(20)` haptic** on tap

**Rank card (the championship trophy):**
- 4-color holographic rotating border (cyan → neon → gold → purple) with synchronized outer glow that breathes through the same hues
- Rank icon bumped to 52 px with a 3-second breathing soft glow in rank color
- Rank name: Bebas Neue 40 px with shimmer-sweep
- XP count-up over 1.2 s (cubic ease-out) on first paint and any change
- Liquid-fill XP bar with a brighter leading-edge highlight that travels with the fill
- Rising spark particles (`<RankParticles />`) emitting from the bar, randomised drift/duration per spark
- Rank-up flash: when `rankName` changes, card runs `.ranking-up` (fast-spinning border + scale-bounce 1.2 s)
- Rank tier journey strip below (5 tiers with current pulse + gradient connectors)

**AI Tutor / Ace chat:**
- Bubble pop animations: user bubbles slide in from the right, AI bubbles slide in from the left (`.bubble-pop-right` / `.bubble-pop-left`, spring 360 ms)
- User bubble: cyan-glassmorphism (rgba cyan + cyan border + cyan glow)
- AI bubble: dark frosted glass with **cyan left border** + drop shadow
- Typing indicator: three dots in a wave (`.typing-dot` with staggered delays — 0 / 150 / 300 ms)
- Deep Search keeps the existing breathing border (`.deep-search-glow`)

**Inputs:**
- Focus → cyan border + 3 px glow ring + 24 px ambient halo (no layout shift)
- `error` prop adds red border + 300 ms shake (`@keyframes inputShake`)
- `success` prop adds green border + 600 ms blip pulse

**Toast (Sonner):**
- Top-right position, glassmorphic dark background with inset top-highlight + bottom-shadow
- Spring slide-in via `bubble-pop-right` class
- Hover: lifts 2 px + cyan glow; success/error variants get neon-green / red border tints
- Action button uses `btn-shimmer`

**Floating XP tiers:**
- `showFloatingXp(amount, { type })` — `'normal'` (green), `'pr'` (gold, larger 26 px), `'academic'` (blue)
- Bebas Neue, drop-shadow that matches the type colour

**New components added:**
- `src/components/fx/CustomCursor.tsx` — desktop premium cursor
- `src/components/fx/CountUp.tsx` — IntersectionObserver-driven number count-up (drop-in `<CountUp value={…} />`)
- `src/components/fx/RankParticles.tsx` — rising-sparks overlay for the XP bar

## Key Files Touched
- `src/index.css` (rewritten + appended Pass 3 utility block — ~1100 lines)
- `src/App.tsx` (mounts CustomCursor)
- `src/components/ui/button.tsx` (rewrite — ripple + shimmer + variants)
- `src/components/ui/input.tsx` (rewrite — focus glow, error/success props)
- `src/components/ui/sonner.tsx` (rewrite — premium toast styling)
- `src/components/fx/FloatingXp.tsx` (rewrite — type tiers)
- `src/components/fx/CustomCursor.tsx` (NEW)
- `src/components/fx/CountUp.tsx` (NEW)
- `src/components/fx/RankParticles.tsx` (NEW)
- `src/components/profile/GlowingXpBar.tsx` (rewrite — particles + 52/40 px sizes + rank-up burst)
- `src/components/profile/AthleteCard.tsx`, `RankCountdown.tsx` (Pass 1/2)
- `src/components/planner/AppShell.tsx` (sidebar layoutId pill, mobile haptic)
- `src/components/ace/AceAssistant.tsx` (FAB + bubble redesign + typing wave)
- `src/components/transitions/PageTransition.tsx` (timing 180/220 ms)
- `src/components/nutrition/WaterTracker.tsx` (water-card flood)
- `src/pages/Auth.tsx`, `Profile.tsx`, `Workouts.tsx`, `DailyPlanner.tsx`, `Nutrition.tsx`
- `src/lib/seasons/hallOfFame.ts` (removed dead re-export)
- `vite.config.ts` (port 3000)
- `package.json` (`start` script)
- `frontend/package.json` (supervisor shim)

## Functional Code — Untouched
Routing, Supabase auth, Claude API calls, XP calc, rank reset, workout logging, nutrition tracking, Desmos, mind-map, achievements — all preserved.

## Backlog / P1
- Active workout session timer: apply `.timer-hero` (88 px Bebas Neue glowing cyan, monospaced) when a session starts
- Rest-timer circular ring with `.rest-urgent` in final 10 s
- Set-row `.set-complete` flash on checkmark tap (utility ready)
- Tie canvas-confetti rank-up overlay to the new `.ranking-up` event
- 3D card tilt + cursor spotlight on Game Selection cards (utility ready: `.card-tilt`, `.card-tilt-spotlight`)
- Universal `<CountUp />` adoption across stat numbers (component ready)

## Backlog / P2
- Boss Battles / Algebra Dungeon dramatic gradient game cards
- Real-time horizontal red current-time line in DailyPlanner schedule

## Test Credentials
None seeded. Supabase still requires real signup; tested via on-the-fly account creation.
