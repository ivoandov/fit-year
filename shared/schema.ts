import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
});

export const workouts = pgTable("workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  exercises: text("exercises").array().notNull(),
});

export const scheduledWorkouts = pgTable("scheduled_workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutId: varchar("workout_id").notNull(),
  workoutName: text("workout_name").notNull(),
  date: timestamp("date").notNull(),
  calendarEventId: text("calendar_event_id"),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutId: varchar("workout_id").notNull(),
  workoutName: text("workout_name").notNull(),
  date: timestamp("date").notNull(),
  duration: integer("duration"),
});

export const sets = pgTable("sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  exerciseId: varchar("exercise_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  setNumber: integer("set_number").notNull(),
  weight: integer("weight"),
  reps: integer("reps").notNull(),
  completed: integer("completed").notNull().default(0),
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true });
export const insertWorkoutSchema = createInsertSchema(workouts).omit({ id: true });
export const insertScheduledWorkoutSchema = createInsertSchema(scheduledWorkouts).omit({ id: true });
export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({ id: true });
export const insertSetSchema = createInsertSchema(sets).omit({ id: true });

export type Exercise = typeof exercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type ScheduledWorkout = typeof scheduledWorkouts.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type Set = typeof sets.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type InsertScheduledWorkout = z.infer<typeof insertScheduledWorkoutSchema>;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type InsertSet = z.infer<typeof insertSetSchema>;
