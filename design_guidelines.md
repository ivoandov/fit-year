# Fitness Tracking App Design Guidelines

## Design Approach

**System:** Material Design principles blended with fitness app best practices (inspired by Strong, Apple Fitness, Nike Training Club)

**Rationale:** This is a utility-focused productivity app requiring clear information hierarchy, efficient data entry, and seamless transitions between planning, tracking, and reviewing modes. Standard patterns optimized for usability.

---

## Typography System

**Font Family:** Inter (via Google Fonts CDN)
- Primary: Inter (weights: 400, 500, 600, 700)

**Hierarchy:**
- Page Headers: text-3xl font-bold (Workout Plan, Exercise Library)
- Section Headers: text-xl font-semibold (Today's Workout, Exercise Categories)
- Card Titles: text-lg font-semibold (Exercise names, Workout titles)
- Body Text: text-base font-medium (Exercise descriptions, instructions)
- Metadata/Labels: text-sm font-medium (Set numbers, rep counts, timestamps)
- Helper Text: text-sm (Form hints, rest timer instructions)

---

## Layout System

**Spacing Units:** Tailwind spacing scale focusing on 2, 3, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card gaps: gap-4, gap-6
- Tight spacing (lists): space-y-2, space-y-3

**Container Strategy:**
- App Container: max-w-7xl mx-auto px-4
- Content Cards: max-w-4xl for workout details
- Narrow Forms: max-w-md for focused inputs
- Full-width: Calendar views and active workout tracking

---

## Navigation Structure

**Primary Navigation:** Bottom tab bar (mobile-first) with 4 main sections:
1. **Workouts** (home icon) - Browse scheduled workouts
2. **Exercises** (database icon) - Exercise library
3. **Track** (play icon) - Active workout mode
4. **History** (chart icon) - Past workouts

**Desktop:** Side navigation (left sidebar, w-64) with same sections, collapsible

**Top Bar:** 
- Title of current section
- Action buttons (+ Add Workout, Calendar Sync status)
- Profile/Settings icon (right-aligned)

---

## Core Components

### Exercise Database
**Layout:** Grid-based browsing
- Desktop: grid-cols-3 gap-6
- Tablet: grid-cols-2 gap-4
- Mobile: grid-cols-1 gap-4

**Exercise Cards:**
- Rounded corners (rounded-lg)
- Border treatment (border-2)
- Padding: p-4
- Structure: Icon/category badge (top), exercise name (text-lg font-semibold), muscle group tags, brief description (text-sm), "Add to Workout" button

**Category Filters:** Horizontal scrollable chips (px-4 py-2, rounded-full)

### Workout Builder
**Layout:** Two-column split (desktop)
- Left (w-2/3): Selected exercises list (drag-and-drop reorderable)
- Right (w-1/3): Sticky exercise database browser

**Exercise List Items:**
- Drag handle (left, heroicons bars-3 icon)
- Exercise name and image thumbnail
- Set/Rep input fields (inline, text-base, w-16)
- Remove button (right, heroicons x-mark icon)

### Workout Scheduler
**Calendar View:**
- Full-width monthly grid
- Date cells: aspect-square, padding p-2
- Workout indicators: Small pills with workout names (text-xs, truncate)
- Add workout: Click empty date to create

**Weekly View (Alternative):**
- 7-column grid showing week at a glance
- Larger workout cards with preview (exercise count, estimated duration)

### Active Workout Tracker
**Full-Screen Mode:**
- Top: Exercise name (text-2xl font-bold), current set indicator
- Center: Large set/rep input fields
  - Number inputs with +/- buttons (text-3xl font-bold for numbers)
  - Quick-tap buttons for common weights
- Bottom: Rest timer (when activated)
  - Circular progress indicator
  - Large countdown (text-4xl)
  - Skip/Pause buttons

**Set Log Table:**
- Simple rows: Set number | Weight | Reps | Complete checkbox
- Alternating subtle backgrounds for readability
- Compact spacing (py-2)

### Rest Timer
**Overlay Component:**
- Bottom sheet style (mobile) or modal (desktop)
- Large circular progress ring
- Center: Countdown text (text-5xl font-bold)
- Controls: Pause, +15s, Skip buttons (icon buttons, large touch targets p-4)
- Haptic feedback on completion (browser vibration API)

### Workout History
**List View:**
- Card-based chronological list (space-y-4)
- Each card: Date header, workout name, duration, exercise count, total volume
- Expandable to show set-by-set details

**Metrics Display:**
- Key stats in grid: grid-cols-3 gap-4
- Each metric: Number (text-2xl font-bold), label (text-sm), trend indicator

---

## Form Elements

**Input Fields:**
- Standard height: h-12
- Padding: px-4
- Border width: border-2
- Rounded: rounded-lg
- Number inputs (sets/reps): Larger text (text-xl), centered, w-20

**Buttons:**
- Primary CTA: px-6 py-3, rounded-lg, font-semibold
- Secondary: px-4 py-2, rounded-lg, border-2
- Icon buttons: p-3, rounded-full
- Large touch targets for workout tracking: min-h-14

**Checkboxes (Set Completion):**
- Large size (w-6 h-6)
- Rounded: rounded-md
- Clear checked state

---

## Icons

**Library:** Heroicons (via CDN)
- Navigation: home, folder, play-circle, chart-bar
- Actions: plus, x-mark, check, chevron-right
- Workout: clock, fire, trophy
- UI: bars-3 (drag), ellipsis-vertical (menu)

---

## Images

**Exercise Thumbnails:**
- Ratio: aspect-video or aspect-square
- Size: Small (w-16 h-16) for list items, Medium (w-full max-h-48) for cards
- Rounded: rounded-md
- Placeholder: Use exercise type icon on solid background if no image

**No Hero Section:** This is a productivity app, not marketing - launch directly into functional interface

---

## Responsive Breakpoints

**Mobile-First Approach:**
- Base (mobile): Single column, bottom nav, full-width cards
- md (768px): Two columns for exercise grid, side-by-side layouts
- lg (1024px): Three columns, persistent sidebar navigation, workout builder split view

---

## Accessibility

- All interactive elements: min-height h-12 (48px touch target)
- Form labels: Visible and associated with inputs
- Focus states: Clear focus rings (ring-2 ring-offset-2)
- Timer alerts: Visual and text-based countdown
- Screen reader announcements for set completion
- Keyboard navigation: All features accessible without mouse

---

## Key UX Patterns

**State Management:**
- Empty states: Encouraging illustrations with "Add your first workout" CTAs
- Loading states: Skeleton screens for exercise grid
- Success feedback: Checkmarks and subtle notifications for completed sets

**Progressive Disclosure:**
- Collapsed exercise details in lists
- Expand cards to show full instructions
- Drawer pattern for exercise selection during workout

**Quick Actions:**
- Swipe gestures: Swipe exercise card left to delete
- Long-press: Quick add from exercise database
- Floating action button: Start workout (bottom-right, fixed)