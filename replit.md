# Fitness Tracking Application

## Overview

This is a full-stack fitness tracking web application built with React, Express, and PostgreSQL. The application allows users to manage workouts, track exercises, schedule training sessions, and review their workout history. It follows Material Design principles blended with fitness app best practices, inspired by applications like Strong, Apple Fitness, and Nike Training Club.

The app is structured as a utility-focused productivity tool with clear information hierarchy, efficient data entry, and seamless transitions between planning, tracking, and reviewing modes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing (alternative to React Router)
- File-based routing with main pages: Workouts, Exercises, Track, and History

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management and caching
- Custom query client configured with infinite stale time and disabled automatic refetching
- Local component state using React hooks for UI interactions

**UI Component System**
- Shadcn/ui component library with Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Theme system supporting light and dark modes via context provider
- Responsive design with mobile-first approach and desktop sidebar navigation

**Design System**
- Inter font family as the primary typeface
- Custom color palette using HSL color space with CSS custom properties
- Elevation system using shadow and opacity-based overlays
- Spacing based on Tailwind's spacing scale (2, 3, 4, 6, 8, 12, 16)
- Border radius customization (lg: 9px, md: 6px, sm: 3px)

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server framework
- HTTP server wrapped with Express for potential WebSocket upgrades
- Middleware for JSON body parsing with raw body preservation
- Request/response logging middleware for API endpoints

**Data Access Layer**
- In-memory storage implementation (MemStorage) as the current storage backend
- Storage interface (IStorage) designed for easy swapping to database persistence
- CRUD methods abstracted behind the storage interface
- Ready for migration to Drizzle ORM with PostgreSQL

**API Design**
- RESTful API structure with `/api` prefix for all application routes
- Route registration separated into dedicated routes module
- JSON response logging for debugging (truncated at 80 characters)
- Request duration tracking and logging

### Database Schema

**ORM & Migration System**
- Drizzle ORM configured for PostgreSQL dialect
- Schema-first approach with TypeScript type generation
- Drizzle Kit for database migrations (output to `./migrations` directory)
- Zod integration for runtime schema validation

**Data Models**
1. **Exercises** - Exercise library with categories, muscle groups, descriptions, and images
2. **Workouts** - Named workout plans containing arrays of exercise IDs
3. **Scheduled Workouts** - Calendar-based workout scheduling with optional calendar event integration
4. **Workout Sessions** - Completed workout records with date and duration
5. **Sets** - Individual set tracking with exercise reference, weight, reps, and completion status
6. **User Settings** - Per-user preferences including selected Google Calendar for workout sync

**Exercise Data Pattern**
- All exercises (both built-in and custom) are stored in the PostgreSQL database
- Built-in exercises are seeded on server startup from `server/data/builtInExercises.ts`
- Exercise images are served statically from `/generated_images/` (maps to `attached_assets/generated_images/`)
- The frontend fetches all exercises from `/api/exercises` - no client-side merging needed
- Image regeneration via AI is available for all exercises (both built-in and custom)

**Schema Features**
- UUID primary keys using PostgreSQL's `gen_random_uuid()`
- Text arrays for storing exercise collections in workouts
- Timestamp columns for date tracking
- Integer columns for numeric metrics (weight, reps, duration)
- Normalized design with denormalized fields for performance (e.g., workoutName, exerciseName)

### External Dependencies

**Database**
- Neon Database serverless PostgreSQL driver (@neondatabase/serverless)
- Connection via DATABASE_URL environment variable
- Drizzle ORM for type-safe database queries

**UI Component Libraries**
- Radix UI primitives for accessible, unstyled components
- Embla Carousel for carousel functionality
- cmdk for command palette interfaces
- date-fns for date manipulation and formatting

**Form Handling**
- React Hook Form with Zod resolvers for validation
- @hookform/resolvers for schema-based validation integration

**Development Tools**
- Replit-specific plugins for development banners and error overlays
- Cartographer plugin for enhanced development experience
- TypeScript for type checking without emission
- ESBuild for server bundling in production

**Styling**
- Tailwind CSS with PostCSS processing
- Autoprefixer for CSS compatibility
- class-variance-authority for component variant management
- clsx and tailwind-merge utilities for conditional class names

**Authentication & Authorization**
- Replit Auth integration for user login (supports Google, GitHub, Apple, email)
- Session-based authentication with PostgreSQL-backed session storage
- User data isolation: workout templates, scheduled workouts, and completed workouts are scoped by userId
- All CRUD operations verify ownership before allowing modifications (403 if unauthorized)

**Google Calendar Integration**
- Completed workouts automatically create all-day events in user's Google Calendar
- Users can select which Google Calendar receives workout sync events via Settings page
- User calendar preferences stored in `user_settings` table (selectedCalendarId, selectedCalendarName)
- Defaults to primary calendar if no selection is made
- Uses OAuth2 with Google Calendar API via Replit's connector integration
- Events include workout name and completion date
- Calendar events are deleted when workouts are removed

**Font Loading**
- Google Fonts CDN for Inter, DM Sans, Fira Code, and Geist Mono font families
- Architects Daughter font for potential handwritten elements