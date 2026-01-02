import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  muscleGroups: jsonb("muscle_groups").notNull().default([]),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  exerciseType: text("exercise_type").notNull().default("weight_reps"),
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
});

export const completedWorkouts = pgTable("completed_workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  displayId: text("display_id").notNull(),
  name: text("name").notNull(),
  exercises: jsonb("exercises").notNull(),
  completedAt: timestamp("completed_at").notNull().default(sql`now()`),
  calendarEventId: varchar("calendar_event_id"),
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  selectedCalendarId: varchar("selected_calendar_id"),
  selectedCalendarName: text("selected_calendar_name"),
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true });
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true });
export const insertWorkoutTemplateSchema = createInsertSchema(workoutTemplates).omit({ id: true });
export const insertScheduledWorkoutSchema = createInsertSchema(scheduledWorkouts).omit({ id: true });
export const insertCompletedWorkoutSchema = createInsertSchema(completedWorkouts).omit({ id: true });

export type Exercise = typeof exercises.$inferSelect;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type ScheduledWorkout = typeof scheduledWorkouts.$inferSelect;
export type CompletedWorkout = typeof completedWorkouts.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type InsertWorkoutTemplate = z.infer<typeof insertWorkoutTemplateSchema>;
export type InsertScheduledWorkout = z.infer<typeof insertScheduledWorkoutSchema>;
export type InsertCompletedWorkout = z.infer<typeof insertCompletedWorkoutSchema>;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export * from "./models/chat";
export * from "./models/auth";
