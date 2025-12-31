import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, sql as drizzleSql } from "drizzle-orm";
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

const neonClient = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: neonClient, schema });

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
    try {
      const id = crypto.randomUUID();
      const muscleGroupsJson = JSON.stringify(exercise.muscleGroups || []);
      
      await neonClient`
        INSERT INTO exercises (id, name, muscle_groups, description, image_url, exercise_type)
        VALUES (${id}, ${exercise.name}, ${muscleGroupsJson}::jsonb, ${exercise.description}, ${exercise.imageUrl || null}, ${exercise.exerciseType || "weight_reps"})
      `;
      
      const newExercise: Exercise = {
        id,
        name: exercise.name,
        muscleGroups: exercise.muscleGroups || [],
        description: exercise.description,
        imageUrl: exercise.imageUrl || null,
        exerciseType: exercise.exerciseType || "weight_reps",
      };
      
      console.log("Created exercise:", newExercise);
      return newExercise;
    } catch (error) {
      console.error("Error in createExercise:", error);
      throw error;
    }
  }

  async updateExercise(id: string, exercise: Partial<InsertExercise>): Promise<Exercise | undefined> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (exercise.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(exercise.name);
    }
    if (exercise.muscleGroups !== undefined) {
      setClauses.push(`muscle_groups = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(exercise.muscleGroups));
    }
    if (exercise.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      params.push(exercise.description);
    }
    if (exercise.imageUrl !== undefined) {
      setClauses.push(`image_url = $${paramIndex++}`);
      params.push(exercise.imageUrl);
    }
    if (exercise.exerciseType !== undefined) {
      setClauses.push(`exercise_type = $${paramIndex++}`);
      params.push(exercise.exerciseType);
    }
    
    if (setClauses.length === 0) return undefined;
    
    params.push(id);
    const query = `UPDATE exercises SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING id, name, muscle_groups as "muscleGroups", description, image_url as "imageUrl", exercise_type as "exerciseType"`;
    
    const results = await neonClient(query, params);
    return results[0] as Exercise;
  }

  async deleteExercise(id: string): Promise<boolean> {
    try {
      await neonClient`DELETE FROM exercises WHERE id = ${id}`;
      return true;
    } catch (error) {
      console.error("Error deleting exercise:", error);
      return false;
    }
  }

  async getScheduledWorkouts(): Promise<ScheduledWorkout[]> {
    try {
      const results = await neonClient`
        SELECT id, name, date, exercises 
        FROM scheduled_workouts 
        ORDER BY date
      `;
      return (results || []) as ScheduledWorkout[];
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
    try {
      const results = await neonClient`
        DELETE FROM scheduled_workouts WHERE id = ${id} RETURNING id
      `;
      console.log("Delete results:", results);
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      return false;
    }
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
