# FitYear — UI/UX Redesign Handoff

## Overview

This package contains a **high-fidelity interactive prototype** of UI/UX improvements for the FitYear fitness tracking app. The prototype was built to explore and validate design decisions before implementation. It covers every screen in the app plus several new features.

The existing codebase lives on Replit and uses:
- **Frontend**: React + TypeScript + TailwindCSS + shadcn/ui + Wouter routing
- **Backend**: Express + Drizzle ORM + PostgreSQL
- **Auth**: Google OAuth (only login option)
- **Existing design system**: Dark theme, neon yellow (`#E5FF00`) accent, DM Sans font

---

## About the Design Files

The HTML files in this bundle are **design references** — interactive prototypes showing intended look, feel, and behavior. They are **not** production code to copy directly. The task is to **recreate these designs inside the existing React/TypeScript codebase** using its established Tailwind + shadcn/ui patterns.

Open `FitYear UX Recommendations.html` in a browser to explore all screens. Use the **Tweaks panel** (toolbar button) to toggle design variations on/off. The bottom nav lets you switch between all screens.

**Fidelity: HIGH** — Colors, typography, spacing, interactions, and copy are all final. Recreate pixel-accurately.

---

## Design Tokens (from existing `index.css`)

```
Background:     #0F0F0E   (hsl 60 5% 6%)
Card:           #1E1E1C   (hsl 0 0% 19% approx)
Card elevated:  #2A2A28
Border:         #2E2E2C   (hsl 60 5% 15%)
Primary/Accent: #E5FF00   (hsl 66 100% 50%)
Primary FG:     #0F0F0E   (dark text on yellow)
Text:           #F2F2F2
Muted:          #6E6E6C
Success:        #5DB87A
Destructive:    #D95555
Font:           DM Sans (Google Fonts)
Mono:           JetBrains Mono
Border radius:  14px cards, 9px buttons/inputs, 20px pills
```

---

## New Features to Build

### 1. Workout Complete Screen
**File reference**: `FitYear UX Recommendations.html` → End Workout or Finish Workout on Track screen

**Trigger**: After `completeWorkout()` or `endWorkout()` resolves in `WorkoutContext`

**Displays**:
- Trophy header with workout name + date
- Streak badge ("13 day streak — keep it up!")
- 4-stat grid: Duration (completedAt - startedAt), Sets (sum completed sets), Volume (sum weight×reps), Exercises count
- Muscles Trained: aggregate completed sets by muscleGroup from exerciseSets ÷ 20 weekly target → neon progress bars
- Personal Best callout: compare each set vs historical MAX(weight) and MAX(weight×reps) per exerciseId
- Share Workout button → opens share sheet

**New DB requirement**: Store `startedAt` timestamp in WorkoutContext when `startWorkout()` fires. Add to `completedWorkouts` table.

**New DB requirement**: PR history log — when a set beats MAX(weight) or MAX(weight×reps) for that exerciseId, write a record: `{ exerciseId, workoutId, prType: 'weight'|'volume', newValue, previousValue, achievedAt }`. This enables the History PR tab.

---

### 2. In-Workout PR Notification
**File reference**: Track screen → complete a set

**Logic** (in `markDone()` in TrackPage.tsx):
```ts
// Before workout starts, query:
const prevBestWeight = await getMaxWeight(exerciseId, userId);
const prevBestVolume = await getMaxVolume(exerciseId, userId); // MAX(weight * reps)

// On set completion:
if (set.weight > prevBestWeight) {
  showPRToast({ type: 'weight', value: `${set.weight}kg — new weight PR! 🏆` });
  setPRSetIndex(currentSetIndex); // persist yellow border on that row
  logPR({ exerciseId, type: 'weight', newValue: set.weight, prev: prevBestWeight });
}
if ((set.weight * set.reps) > prevBestVolume) {
  showPRToast({ type: 'volume', value: `${set.weight}kg × ${set.reps} — new volume PR! ⭐` });
  logPR({ exerciseId, type: 'volume', newValue: set.weight * set.reps, prev: prevBestVolume });
}
```

**UI**: Slide-in toast from top (3.5s auto-dismiss, `slideDown` CSS animation). PR set row: solid neon border + "PR" badge next to set number + 🏆 in check button. Active (not-yet-done) set: dashed neon border. These must be visually distinct.

---

### 3. History — PR Tab
**File reference**: History screen → "🏆 PRs" tab

Segmented tab control (History | PRs) at top of History screen.

**PR tab content**: Recent PR timeline, capped at 5 most recent. Each row shows:
- Icon: 🏆 (weight PR, neon yellow tint) or ⭐ (volume PR, green tint)
- Exercise name + WEIGHT/VOLUME badge
- New record value + reps
- Date achieved + previous record

**Query**: `SELECT * FROM pr_history WHERE userId = ? ORDER BY achievedAt DESC LIMIT 5`

---

### 4. Onboarding Flow (first launch only)
**File reference**: Opens automatically on first launch in prototype. Use Tweaks → "Show Onboarding" to replay.

**3 steps — all auto-advance on selection:**

**Step 1**: "How often do you want to train?" → 2/3/4/5/6 days/week grid (auto-advances on tap)
**Step 2**: "How long is your next program?" → 30/60/90/120 days grid (auto-advances on tap). Back button below.
**Step 3**: "Want to build a personalized program with AI?" → Fit Bot teaser card. Two CTAs: "Build My Program with Fit Bot" (→ Fit Bot builder) or "I'll set up my routine manually" (→ Home). Back button below.

**Persistent skip**: "Skip for now" in top-right at every step → goes straight to Home.

**Storage**: Save `{ daysPerWeek, programLength }` to user settings (`/api/user-settings`). Flag `hasCompletedOnboarding: true` to prevent re-showing.

**First launch detection**: Check `hasCompletedOnboarding` from `/api/user-settings` on app load. If false/null → show onboarding.

---

### 5. Home Screen — Goals Strip
**File reference**: Home screen → below greeting when goals are set via onboarding

**Shows when**: `userGoals.daysPerWeek` and `userGoals.programLength` are set in user settings.

Two side-by-side cards below the greeting:
- **Weekly target**: "3 / 4 days" with progress bar (completedWorkouts this week ÷ daysPerWeek)
- **Program**: "Day 14" with progress bar (current routine day ÷ programLength)

**Hides when**: No goals set (empty state shown instead with CTAs).

---

### 6. Home Screen — Routine Day in Hero Card
**File reference**: Home screen hero card (when routine is active)

**When a routine instance is active**, the hero card shows:
- Small label above workout name: "Day 14 of 42 · PPL 6-Day Split" (routineInstance day + name)
- Progress bar showing overall routine completion % below the workout name
- Existing Start button unchanged

**Query**: `SELECT * FROM routineInstances WHERE userId = ? AND status = 'active' LIMIT 1`

---

### 7. Routine Day Completion Toast
**Trigger**: After `completeWorkout()` when an active routine instance exists

**Show**: Toast notification — "Day 14 complete — Day 15 unlocked 🎯"

**No full-screen needed** — the Workout Complete screen handles the main celebration. This is a lightweight layer-on-top toast specific to routine context.

---

### 8. Fit Bot — AI Program Builder
**File reference**: Routines screen → "Build with Fit Bot" CTA, also in onboarding step 3 and Home empty state

**6-step flow** (all except Experience auto-advance):
1. **Training focus** (multi-select chips): Strength, Hypertrophy, Calisthenics, Flexibility, Mixed, Athletic
2. **Equipment** (multi-select): Full Gym, Home + Weights, Bodyweight, Resistance Bands
3. **Experience level** (single select, auto-advances): Beginner, Intermediate, Advanced, Competitive
4. **Anything else?** (multi-select + custom text input + removable chips): preset goals + freeform entry
5. **[Conditional] Muscle imbalances**: shown only if "Fix muscle imbalances" selected. Multi-select muscle chips + freeform textarea for extra context
6. **[Conditional] Injury details**: shown only if "Train around injury" selected. Multi-select body area chips + freeform textarea

Then: **Summary screen** showing all choices with Edit links per section → "Generate My Program" button (no emoji)

Then: **Generating screen** with animated progress bar + stage labels

Then: **Preview screen** showing Week 1 day-by-day + Fit Bot note + "Add to My Routines" CTA

**Server implementation**:
```ts
// POST /api/ai/generate-program
const prompt = `
You are an expert fitness coach. Generate a ${programLength}-day ${focus.join(' + ')} training program.

USER PROFILE:
- Experience: ${experience}
- Training days/week: ${daysPerWeek}
- Equipment: ${equipment.join(', ')}
- Additional goals: ${extras.join(', ') || 'none'}
${imbalanceMuscles.length ? `- Muscle imbalances: ${imbalanceMuscles.join(', ')}. Notes: ${imbalanceNotes}` : ''}
${injuryDetails.length ? `- Training around: ${injuryDetails.join(', ')}. Notes: ${injuryNotes}` : ''}

Return ONLY valid JSON:
{
  "name": "string",
  "weeks": [{
    "weekNum": 1,
    "days": [{
      "dayOfWeek": "Monday",
      "workoutName": "string",
      "isRest": false,
      "exercises": [{ "name": "string", "sets": 4, "reps": "5", "rest": 180, "notes": "" }]
    }]
  }]
}

Rules: ${daysPerWeek} training days/week, progressive overload every 1-2 weeks,
equipment-appropriate exercises only, ${experience}-level volume/intensity.
`;

const message = await anthropic.messages.create({
  model: 'claude-opus-4-5',
  max_tokens: 8192,
  messages: [{ role: 'user', content: prompt }]
});
const program = JSON.parse(message.content[0].text);
```

After parsing: create routine template + routine instance + schedule week 1 workouts (same pattern as existing routine scheduling code in `routes.ts`).

---

### 9. Share Workout Card
**File reference**: Workout Complete screen → "Share Workout" → bottom sheet

**Bottom sheet contains**:
- Shareable card (dark green gradient, grid texture, FitYear branding, workout name, date, 4 stats, muscle groups, PR + streak badges)
- Three buttons (all dark, on-brand — NOT colorful): Instagram 📸, WhatsApp 💬, Copy 🔗

**Implementation**:
- Use `html2canvas` on the card div to generate a PNG
- Instagram / WhatsApp: `navigator.share({ files: [imageFile] })` (Web Share API)
- Copy: `navigator.clipboard.writeText(summaryText)`

---

### 10. Settings Screen Additions
**File reference**: Settings screen (gear icon in home header)

**New settings to add** (on top of existing ones):
- **Monthly workout target**: integer stepper (default 16). Stored in user settings. Used for Home goals strip % calculation.
- **Fit Bot default focus**: dropdown/select for pre-selecting training focus when opening Fit Bot.

**Existing settings to polish** (all already in the app, just visual refresh):
- Week Start radio (existing ✅)
- Google Calendar Sync list with checkmark on selected calendar (existing ✅)
- Workout Tracking toggles + weight unit (existing ✅)
- Muscle Groups reorder list (existing ✅)
- Workout Template History sync (existing ✅)

---

## Navigation Changes

### Bottom Nav
- Add **text labels** under each icon (currently icon-only). Toggle via user preference.
- **Track button**: Float as an elevated pill (translateY -14px, neon fill, box-shadow glow) — acts as primary FAB. Visually distinct from active-tab indicator.
- **Active tab indicator**: Neon icon tint + small dot underneath (NOT filled neon circle). This differentiates "where you are" from the Track action button.
- **Exercises** tab icon: side-view barbell SVG (not a person figure — avoid circular head clashing with active dot)

---

## DB Schema Additions Needed

```sql
-- PR history log
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

-- User settings additions (add columns to existing user_settings table)
ALTER TABLE user_settings
  ADD COLUMN monthly_workout_goal INTEGER DEFAULT 16,
  ADD COLUMN fitbot_default_focus TEXT DEFAULT 'strength',
  ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT FALSE,
  ADD COLUMN onboarding_days_per_week INTEGER,
  ADD COLUMN onboarding_program_length INTEGER;

-- Completed workouts: add duration tracking
ALTER TABLE completed_workouts
  ADD COLUMN started_at TIMESTAMP,
  ADD COLUMN duration_seconds INTEGER;
```

---

## API Endpoints Needed

```
POST /api/ai/generate-program          → Fit Bot AI generation (see prompt above)
GET  /api/pr-history?limit=5           → Recent PRs for History PR tab
POST /api/pr-history                   → Log a new PR (called from markDone() on client)
GET  /api/user-settings                → Already exists, add new fields
PUT  /api/user-settings                → Already exists, handle new fields
```

---

## WorkoutContext Changes

```ts
// Add to startWorkout():
const startedAt = new Date();
// Store in context + localStorage

// Add to completeWorkout():
const duration = Math.floor((Date.now() - startedAt.getTime()) / 1000);
// Pass to completed workout record

// Add after completeWorkout() when routineInstance is active:
showToast(`Day ${currentDay} complete — Day ${currentDay + 1} unlocked 🎯`);
```

---

## Files in This Package

| File | Purpose |
|---|---|
| `FitYear UX Recommendations.html` | Main prototype — open in browser to explore all screens |
| `new-screens.jsx` | Onboarding, Fit Bot Builder, History with PR tab components |
| `settings-screen.jsx` | Settings screen component |
| `ios-frame.jsx` | iPhone device frame (prototype only — not for production) |
| `tweaks-panel.jsx` | Design tweaks panel (prototype only — not for production) |

---

## How to Use This Handoff

1. Open `FitYear UX Recommendations.html` in Chrome/Safari
2. Use bottom nav to explore each screen
3. Open Tweaks panel to toggle design variations
4. Use the prototype as pixel reference for every screen
5. Implement each feature in the existing codebase following the specs above
6. The existing codebase already has: `WorkoutContext`, `TimerContext`, rest timer, sets tracking, exercise library, routines, Google Calendar sync — extend those, don't replace them
