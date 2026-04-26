# FitYear — Claude Code Instructions

## Design Reference
- **Prototype**: `/design_handoff_fityear/FitYear UX Recommendations.html` — open in browser to see every screen
- **Implementation spec**: `/design_handoff_fityear/README.md` — full feature specs, DB schema, API endpoints, prompts

## Stack
- Frontend: React + TypeScript + TailwindCSS + shadcn/ui + Wouter
- Backend: Express + Drizzle ORM + PostgreSQL
- Auth: Google OAuth only
- Deployment: Replit (.replit.app URL)

## Design System
- Dark theme, neon yellow `#E5FF00` accent
- Font: DM Sans (Google Fonts)
- Full token spec: `client/src/index.css`
- Component guidelines: `design_guidelines.md`

## Key Files
- `client/src/context/WorkoutContext.tsx` — all workout state + actions
- `client/src/context/TimerContext.tsx` — rest timer state
- `client/src/pages/TrackPage.tsx` — active workout tracking
- `client/src/pages/WorkoutsPage.tsx` — home/scheduled workouts
- `shared/schema.ts` — all DB schema (Drizzle)
- `server/routes.ts` — all API routes

## Conventions
- Weight stored in **lbs** in DB, converted for display based on user's unit setting
- All DB schema changes go in `shared/schema.ts` via Drizzle migrations
- New API routes go in `server/routes.ts`
- New context state goes in `WorkoutContext.tsx`
- New pages go in `client/src/pages/`, registered in `client/src/App.tsx`

## Active Feature Backlog
See `/design_handoff_fityear/README.md` → "New Features to Build" section.

Priority order:
1. Workout Complete screen (trigger after completeWorkout/endWorkout)
2. In-workout PR detection + toast + persistent set highlight
3. startedAt timestamp tracking in WorkoutContext
4. History PR tab
5. Onboarding flow (3 steps, first launch only)
6. Home goals strip + routine day in hero card
7. Fit Bot AI program builder (/api/ai/generate-program endpoint)
8. Settings screen additions (monthly goal, Fit Bot default)
9. Share workout card (html2canvas → Web Share API)
10. Bottom nav labels + elevated Track FAB

## DB Additions Needed
```sql
-- PR history
CREATE TABLE pr_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  workout_id TEXT NOT NULL,
  pr_type TEXT NOT NULL CHECK (pr_type IN ('weight', 'volume')),
  new_value REAL NOT NULL,
  previous_value REAL,
  achieved_at TIMESTAMP DEFAULT NOW()
);

-- User settings additions
ALTER TABLE user_settings
  ADD COLUMN monthly_workout_goal INTEGER DEFAULT 16,
  ADD COLUMN fitbot_default_focus TEXT DEFAULT 'strength',
  ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT FALSE,
  ADD COLUMN onboarding_days_per_week INTEGER,
  ADD COLUMN onboarding_program_length INTEGER;

-- Completed workouts: duration tracking
ALTER TABLE completed_workouts
  ADD COLUMN started_at TIMESTAMP,
  ADD COLUMN duration_seconds INTEGER;
```

## New API Endpoints Needed
```
POST /api/ai/generate-program     → Fit Bot program generation (Claude claude-opus-4-5)
GET  /api/pr-history?limit=5      → Recent PRs for History tab
POST /api/pr-history              → Log a new PR (called from markDone())
```

## Fit Bot Prompt Template
See `/design_handoff_fityear/README.md` → "Fit Bot" section for full prompt + JSON schema.
Model: `claude-opus-4-5`, max_tokens: 8192, server-side via Anthropic SDK.
