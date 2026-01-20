import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  muscleGroups: jsonb("muscle_groups").notNull().default([]),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  exerciseType: text("exercise_type").notNull().default("weight_reps"),
  isAssisted: boolean("is_assisted").notNull().default(false),
});

export const workoutTemplates = pgTable("workout_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  exercises: jsonb("exercises").notNull(),
});

export const scheduledWorkouts = pgTable("scheduled_workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  templateId: varchar("template_id"),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  exercises: jsonb("exercises").notNull(),
  calendarEventId: varchar("calendar_event_id"),
  routineInstanceId: varchar("routine_instance_id"),
  routineDayIndex: integer("routine_day_index"),
});

export const completedWorkouts = pgTable("completed_workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  displayId: text("display_id").notNull(),
  name: text("name").notNull(),
  exercises: jsonb("exercises").notNull(),
  completedAt: timestamp("completed_at").notNull().default(sql`now()`),
  calendarEventId: varchar("calendar_event_id"),
  routineInstanceId: varchar("routine_instance_id"),
  routineDayIndex: integer("routine_day_index"),
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  selectedCalendarId: varchar("selected_calendar_id"),
  selectedCalendarName: text("selected_calendar_name"),
});

export const activeWorkouts = pgTable("active_workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  workoutData: jsonb("workout_data").notNull(),
  trackingProgress: jsonb("tracking_progress"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const routines = pgTable("routines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  defaultDurationDays: integer("default_duration_days").notNull().default(7),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const routineEntries = pgTable("routine_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routineId: varchar("routine_id").notNull(),
  dayIndex: integer("day_index").notNull(),
  workoutTemplateId: varchar("workout_template_id"),
  workoutName: text("workout_name"),
  exercises: jsonb("exercises"),
});

export const routineInstances = pgTable("routine_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routineId: varchar("routine_id").notNull(),
  userId: varchar("user_id").notNull(),
  routineName: text("routine_name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  durationDays: integer("duration_days").notNull(),
  totalWorkouts: integer("total_workouts").notNull().default(0),
  completedWorkouts: integer("completed_workouts").notNull().default(0),
  skippedWorkouts: integer("skipped_workouts").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
});

export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  refreshToken: text("refresh_token").notNull(),
  accessToken: text("access_token"),
  expiresAt: timestamp("expires_at"),
  connectedAt: timestamp("connected_at").notNull().default(sql`now()`),
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true });
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true });
export const insertWorkoutTemplateSchema = createInsertSchema(workoutTemplates).omit({ id: true });
export const insertScheduledWorkoutSchema = createInsertSchema(scheduledWorkouts).omit({ id: true });
export const insertCompletedWorkoutSchema = createInsertSchema(completedWorkouts).omit({ id: true });
export const insertActiveWorkoutSchema = createInsertSchema(activeWorkouts).omit({ id: true });
export const insertRoutineSchema = createInsertSchema(routines).omit({ id: true, createdAt: true });
export const insertRoutineEntrySchema = createInsertSchema(routineEntries).omit({ id: true });
export const insertRoutineInstanceSchema = createInsertSchema(routineInstances).omit({ id: true, createdAt: true, completedAt: true });
export const insertGoogleCalendarTokensSchema = createInsertSchema(googleCalendarTokens).omit({ id: true, connectedAt: true });

export type Exercise = typeof exercises.$inferSelect;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type ScheduledWorkout = typeof scheduledWorkouts.$inferSelect;
export type CompletedWorkout = typeof completedWorkouts.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type ActiveWorkout = typeof activeWorkouts.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type RoutineEntry = typeof routineEntries.$inferSelect;
export type RoutineInstance = typeof routineInstances.$inferSelect;
export type GoogleCalendarTokens = typeof googleCalendarTokens.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type InsertWorkoutTemplate = z.infer<typeof insertWorkoutTemplateSchema>;
export type InsertScheduledWorkout = z.infer<typeof insertScheduledWorkoutSchema>;
export type InsertCompletedWorkout = z.infer<typeof insertCompletedWorkoutSchema>;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type InsertActiveWorkout = z.infer<typeof insertActiveWorkoutSchema>;
export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type InsertRoutineEntry = z.infer<typeof insertRoutineEntrySchema>;
export type InsertRoutineInstance = z.infer<typeof insertRoutineInstanceSchema>;
export type InsertGoogleCalendarTokens = z.infer<typeof insertGoogleCalendarTokensSchema>;

export * from "./models/chat";
export * from "./models/auth";
