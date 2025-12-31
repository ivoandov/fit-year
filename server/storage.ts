import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  exercises,
  scheduledWorkouts,
  completedWorkouts,
  type Exercise,
  type ScheduledWorkout,
  type CompletedWorkout,
  type InsertExercise,
  type InsertScheduledWorkout,
  type InsertCompletedWorkout,
} from "@shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });

export interface IStorage {
  getExercises(): Promise<Exercise[]>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  updateExercise(id: string, exercise: Partial<InsertExercise>): Promise<Exercise | undefined>;
  deleteExercise(id: string): Promise<boolean>;
  
  getScheduledWorkouts(): Promise<ScheduledWorkout[]>;
  getScheduledWorkout(id: string): Promise<ScheduledWorkout | undefined>;
  createScheduledWorkout(workout: InsertScheduledWorkout): Promise<ScheduledWorkout>;
  updateScheduledWorkout(id: string, workout: Partial<InsertScheduledWorkout>): Promise<ScheduledWorkout | undefined>;
  deleteScheduledWorkout(id: string): Promise<boolean>;
  
  getCompletedWorkouts(): Promise<CompletedWorkout[]>;
  createCompletedWorkout(workout: InsertCompletedWorkout): Promise<CompletedWorkout>;
  deleteCompletedWorkout(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getExercises(): Promise<Exercise[]> {
    try {
      const results = await db.select().from(exercises).orderBy(exercises.name);
      return results || [];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        console.warn("Known Neon empty result issue, returning empty array");
        return [];
      }
      throw error;
    }
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const results = await db.insert(exercises).values(exercise).returning();
    return results[0];
  }

  async updateExercise(id: string, exercise: Partial<InsertExercise>): Promise<Exercise | undefined> {
    const results = await db.update(exercises).set(exercise).where(eq(exercises.id, id)).returning();
    return results[0];
  }

  async deleteExercise(id: string): Promise<boolean> {
    const results = await db.delete(exercises).where(eq(exercises.id, id)).returning();
    return results.length > 0;
  }

  async getScheduledWorkouts(): Promise<ScheduledWorkout[]> {
    try {
      const results = await db.select().from(scheduledWorkouts).orderBy(scheduledWorkouts.date);
      return results || [];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        console.warn("Known Neon empty result issue, returning empty array");
        return [];
      }
      throw error;
    }
  }

  async getScheduledWorkout(id: string): Promise<ScheduledWorkout | undefined> {
    const results = await db.select().from(scheduledWorkouts).where(eq(scheduledWorkouts.id, id));
    return results[0];
  }

  async createScheduledWorkout(workout: InsertScheduledWorkout): Promise<ScheduledWorkout> {
    const results = await db.insert(scheduledWorkouts).values(workout).returning();
    return results[0];
  }

  async updateScheduledWorkout(id: string, workout: Partial<InsertScheduledWorkout>): Promise<ScheduledWorkout | undefined> {
    const results = await db.update(scheduledWorkouts).set(workout).where(eq(scheduledWorkouts.id, id)).returning();
    return results[0];
  }

  async deleteScheduledWorkout(id: string): Promise<boolean> {
    const results = await db.delete(scheduledWorkouts).where(eq(scheduledWorkouts.id, id)).returning();
    return results.length > 0;
  }

  async getCompletedWorkouts(): Promise<CompletedWorkout[]> {
    try {
      const results = await db.select().from(completedWorkouts).orderBy(desc(completedWorkouts.completedAt));
      return results || [];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        console.warn("Known Neon empty result issue, returning empty array");
        return [];
      }
      throw error;
    }
  }

  async createCompletedWorkout(workout: InsertCompletedWorkout): Promise<CompletedWorkout> {
    const results = await db.insert(completedWorkouts).values(workout).returning();
    return results[0];
  }

  async deleteCompletedWorkout(id: string): Promise<boolean> {
    const results = await db.delete(completedWorkouts).where(eq(completedWorkouts.id, id)).returning();
    return results.length > 0;
  }
}

export const storage = new DatabaseStorage();
