# Fit Year Fitness App - Design Guidelines

## Design Philosophy
Modern, energetic dark theme fitness application with neon yellow accents. The design emphasizes a bold, sporty aesthetic with high contrast and clean data visualization. Inspired by premium fitness apps with a focus on utility and ease of use.

---

## Color Palette

### Primary Colors
- **Background**: Deep charcoal black (`hsl(60 5% 6%)` / ~#0F0F0E)
- **Card Background**: Slightly elevated dark (`hsl(60 5% 10%)` / ~#1A1A18)
- **Primary Accent**: Neon yellow/lime (`hsl(66 100% 50%)` / ~#E5FF00)

### Text Colors
- **Primary Text**: White (`hsl(0 0% 95%)`)
- **Secondary/Muted Text**: Gray (`hsl(0 0% 60%)`)
- **Accent Text**: Neon yellow for highlights and emphasis

### Semantic Colors
- **Success**: Neon yellow (primary)
- **Destructive**: Red (`hsl(0 70% 50%)`)
- **Border**: Subtle dark (`hsl(60 5% 15%)`)
- **Input**: Dark gray (`hsl(60 5% 18%)`)

---

## Typography System

### Font Family
- **Primary**: DM Sans (via Google Fonts CDN)
- **Monospace**: JetBrains Mono

### Font Weights
- Headings: 600-700 (semibold to bold)
- Body: 400-500 (regular to medium)
- Labels/Meta: 400 (regular)

### Hierarchy
- Page Headers: text-3xl font-bold
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-semibold
- Body Text: text-base font-medium
- Metadata/Labels: text-sm font-medium
- Helper Text: text-sm text-muted-foreground

---

## Layout System

### Spacing Scale
- xs: 4px (gap-1)
- sm: 8px (gap-2)
- md: 12px (gap-3)
- lg: 16px (gap-4)
- xl: 24px (gap-6)

### Border Radius
- Large elements (cards, modals): 14px (`rounded-xl`)
- Medium elements (buttons, inputs): 9px (`rounded-lg`)
- Small elements (badges, chips): 6px (`rounded-md`)
- Pills/active tabs: Full rounded (`rounded-full`)

### Container Strategy
- App Container: Full width with bottom nav
- Content padding: px-4 py-4
- Bottom padding: pb-20 (to clear nav bar)

---

## Navigation Structure

### Bottom Tab Bar (Primary Navigation)
Fixed to bottom of screen with 5 items:
1. **Home** (Home icon) - Workouts/Dashboard
2. **Track** (Dumbbell/Muscle icon) - Active workout mode
3. **Exercises** (PersonStanding icon) - Exercise library
4. **Routines** (ClipboardList icon) - Multi-day programs
5. **History** (BarChart3 icon) - Past workouts and stats

**Styling:**
- Dark background matching card color
- Icons only, no labels
- Active state: Neon yellow circular background with dark icon
- Inactive state: Muted gray icons

### Header Bar
- App title (left)
- Theme toggle and user menu (right)
- Settings accessible via user dropdown

---

## Core Components

### Cards
- Dark background (`bg-card`)
- Subtle border (`border-border`)
- Generous padding (p-4 to p-6)
- Large rounded corners (`rounded-xl`)
- No heavy shadows (dark theme)

### Buttons
- **Primary**: Neon yellow background with dark text
- **Secondary**: Dark background with subtle border, light text
- **Ghost**: Transparent, light text, subtle hover elevation
- **Destructive**: Red background with white text
- Pill-shaped for navigation, rounded-lg for actions

### Filter Chips/Pills
- Active: Neon yellow fill (`bg-primary`) with dark text
- Inactive: Dark fill with border, light text
- Fully rounded (`rounded-full`)
- Horizontal scrollable list

### Inputs
- Dark background (`bg-input`)
- Subtle border
- Height: h-10 to h-12
- Padding: px-4
- Rounded: rounded-lg

### Data Visualization
- Charts use neon yellow as primary color
- Subtle grid lines in muted colors
- Progress rings with yellow fill
- Bar charts with gradient yellow tones

---

## Interactive States

### Hover
- Subtle brightness increase
- Use built-in `hover-elevate` utility

### Active/Pressed
- More pronounced brightness increase
- Use built-in `active-elevate-2` utility

### Selected/Active Tab
- Neon yellow circular background
- Dark text (primary-foreground)

### Disabled
- Reduced opacity (50%)
- No cursor interaction

---

## Dark Theme Notes
- This is a dark-first design - the app defaults to dark mode
- All colors are designed for maximum contrast on dark backgrounds
- Yellow accent provides energy and visibility without being harsh
- Cards and surfaces use subtle elevation via background color, not shadows

---

## Accessibility
- All interactive elements: min-height h-10 (40px touch target)
- Form labels: Visible and associated with inputs
- Focus states: Clear focus rings (`ring-2 ring-ring`)
- High contrast text on dark backgrounds
- Keyboard navigation: All features accessible without mouse

---

## Key UX Patterns

### Empty States
- Encouraging messaging with "Add your first..." CTAs
- Icon or illustration with muted colors

### Loading States
- Spinner with primary color
- Skeleton screens for lists

### Success Feedback
- Checkmarks with primary color
- Toast notifications for actions

### Quick Actions
- Bottom sheet dialogs for mobile
- Modal dialogs for complex forms
- Inline editing where appropriate
