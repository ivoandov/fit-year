import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import {
  scheduledWorkouts,
  completedWorkouts,
  type ScheduledWorkout,
  type CompletedWorkout,
  type InsertScheduledWorkout,
  type InsertCompletedWorkout,
} from "@shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
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
  async getScheduledWorkouts(): Promise<ScheduledWorkout[]> {
    return await db.select().from(scheduledWorkouts).orderBy(scheduledWorkouts.date);
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
    return await db.select().from(completedWorkouts).orderBy(desc(completedWorkouts.completedAt));
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
