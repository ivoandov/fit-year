import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, sql as drizzleSql } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  exercises,
  workoutTemplates,
  scheduledWorkouts,
  completedWorkouts,
  userSettings,
  activeWorkouts,
  routines,
  routineEntries,
  routineInstances,
  googleCalendarTokens,
  type Exercise,
  type WorkoutTemplate,
  type ScheduledWorkout,
  type CompletedWorkout,
  type UserSettings,
  type ActiveWorkout,
  type Routine,
  type RoutineEntry,
  type RoutineInstance,
  type GoogleCalendarTokens,
  type InsertExercise,
  type InsertWorkoutTemplate,
  type InsertScheduledWorkout,
  type InsertCompletedWorkout,
  type InsertUserSettings,
  type InsertActiveWorkout,
  type InsertRoutine,
  type InsertRoutineEntry,
  type InsertRoutineInstance,
  type InsertGoogleCalendarTokens,
} from "@shared/schema";
import * as crypto from "crypto";
import { builtInExercises } from "./data/builtInExercises";

const neonClient = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: neonClient, schema });

// Token encryption helpers
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.SESSION_SECRET;
  if (!key) {
    throw new Error('SESSION_SECRET environment variable is required for token encryption');
  }
  return crypto.scryptSync(key, 'salt', 32);
}

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptToken(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function seedBuiltInExercises(): Promise<void> {
  console.log("Checking for built-in exercises to seed...");
  
  try {
    for (const exercise of builtInExercises) {
      try {
        const existing = await neonClient`
          SELECT id FROM exercises WHERE id = ${exercise.id}
        `;
        
        if (!existing || existing.length === 0) {
          const muscleGroupsJson = JSON.stringify(exercise.muscleGroups);
          await neonClient`
            INSERT INTO exercises (id, name, muscle_groups, description, image_url, exercise_type, is_assisted)
            VALUES (${exercise.id}, ${exercise.name}, ${muscleGroupsJson}::jsonb, ${exercise.description}, ${exercise.imageUrl}, ${exercise.exerciseType}, ${exercise.isAssisted || false})
          `;
          console.log(`Seeded exercise: ${exercise.name}`);
        }
      } catch (innerError: any) {
        if (innerError?.message?.includes("Cannot read properties of null (reading 'map')")) {
          const muscleGroupsJson = JSON.stringify(exercise.muscleGroups);
          await neonClient`
            INSERT INTO exercises (id, name, muscle_groups, description, image_url, exercise_type, is_assisted)
            VALUES (${exercise.id}, ${exercise.name}, ${muscleGroupsJson}::jsonb, ${exercise.description}, ${exercise.imageUrl}, ${exercise.exerciseType}, ${exercise.isAssisted || false})
          `;
          console.log(`Seeded exercise: ${exercise.name}`);
        } else if (innerError?.code === '23505') {
          // Exercise already exists, skip silently
        } else {
          throw innerError;
        }
      }
    }
    console.log("Built-in exercises seeding complete.");
  } catch (error: any) {
    // Don't crash the app if seeding fails - log and continue
    if (error?.message?.includes('fetch failed') || error?.code === 'EAI_AGAIN') {
      console.warn("Database connection failed during seeding - will retry on next request");
    } else {
      console.error("Error seeding built-in exercises:", error);
    }
  }
}

export interface IStorage {
  getExercises(userId?: string): Promise<Exercise[]>;
  getExercisesWithBase64Images(): Promise<Exercise[]>;
  getExerciseWithImage(id: string): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  createExerciseWithId(id: string, exercise: InsertExercise): Promise<Exercise>;
  updateExercise(id: string, exercise: Partial<InsertExercise>): Promise<Exercise | undefined>;
  deleteExercise(id: string): Promise<boolean>;
  
  getWorkoutTemplates(userId?: string): Promise<WorkoutTemplate[]>;
  getWorkoutTemplate(id: string): Promise<WorkoutTemplate | undefined>;
  createWorkoutTemplate(template: InsertWorkoutTemplate): Promise<WorkoutTemplate>;
  updateWorkoutTemplate(id: string, template: Partial<InsertWorkoutTemplate>): Promise<WorkoutTemplate | undefined>;
  deleteWorkoutTemplate(id: string): Promise<boolean>;
  
  getScheduledWorkouts(userId?: string): Promise<ScheduledWorkout[]>;
  getScheduledWorkout(id: string): Promise<ScheduledWorkout | undefined>;
  createScheduledWorkout(workout: InsertScheduledWorkout): Promise<ScheduledWorkout>;
  updateScheduledWorkout(id: string, workout: Partial<InsertScheduledWorkout>): Promise<ScheduledWorkout | undefined>;
  updateScheduledWorkoutsByRoutineInstanceAndName(routineInstanceId: string, originalName: string, newName: string): Promise<number>;
  updateScheduledWorkoutsByTemplateAndName(templateId: string, originalName: string, newName: string): Promise<number>;
  updateFutureScheduledWorkoutsByTemplate(templateId: string, name: string, exercises: any): Promise<number>;
  updateFutureScheduledWorkoutsByRoutineInstance(routineInstanceId: string, routineEntries: { dayIndex: number; workoutName: string | null; exercises: any }[]): Promise<number>;
  updateScheduledWorkoutCalendarEventId(id: string, calendarEventId: string | null): Promise<void>;
  deleteScheduledWorkout(id: string): Promise<boolean>;
  
  getCompletedWorkouts(userId?: string): Promise<CompletedWorkout[]>;
  getCompletedWorkout(id: string): Promise<CompletedWorkout | undefined>;
  getCompletedWorkoutsByTemplateId(templateId: string, userId: string): Promise<CompletedWorkout[]>;
  createCompletedWorkout(workout: InsertCompletedWorkout): Promise<CompletedWorkout>;
  updateCompletedWorkout(id: string, workout: Partial<InsertCompletedWorkout>): Promise<CompletedWorkout | undefined>;
  updateCompletedWorkoutCalendarEventId(id: string, calendarEventId: string): Promise<void>;
  deleteCompletedWorkout(id: string): Promise<boolean>;
  
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings>;
  
  getActiveWorkout(userId: string): Promise<ActiveWorkout | undefined>;
  upsertActiveWorkout(userId: string, workoutData: any, trackingProgress?: any): Promise<ActiveWorkout>;
  deleteActiveWorkout(userId: string): Promise<boolean>;
  
  getRoutines(userId: string): Promise<Routine[]>;
  getPublicRoutines(): Promise<Routine[]>;
  getRoutine(id: string): Promise<Routine | undefined>;
  createRoutine(routine: InsertRoutine): Promise<Routine>;
  updateRoutine(id: string, routine: Partial<InsertRoutine>): Promise<Routine | undefined>;
  deleteRoutine(id: string): Promise<boolean>;
  
  getRoutineEntries(routineId: string): Promise<RoutineEntry[]>;
  createRoutineEntry(entry: InsertRoutineEntry): Promise<RoutineEntry>;
  updateRoutineEntry(id: string, entry: Partial<InsertRoutineEntry>): Promise<RoutineEntry | undefined>;
  deleteRoutineEntry(id: string): Promise<boolean>;
  deleteRoutineEntriesByRoutineId(routineId: string): Promise<boolean>;
  
  getRoutineInstances(userId: string): Promise<RoutineInstance[]>;
  getActiveRoutineInstances(userId: string): Promise<RoutineInstance[]>;
  getRoutineInstance(id: string): Promise<RoutineInstance | undefined>;
  createRoutineInstance(instance: InsertRoutineInstance): Promise<RoutineInstance>;
  updateRoutineInstance(id: string, instance: Partial<InsertRoutineInstance>): Promise<RoutineInstance | undefined>;
  incrementRoutineInstanceProgress(id: string): Promise<RoutineInstance | undefined>;
  incrementRoutineInstanceSkipped(id: string): Promise<RoutineInstance | undefined>;
  deleteRoutineInstance(id: string): Promise<boolean>;
  
  createScheduledWorkoutWithRoutine(workout: InsertScheduledWorkout & { routineInstanceId?: string | null; routineDayIndex?: number | null }): Promise<ScheduledWorkout>;
  
  getGoogleCalendarTokens(userId: string): Promise<GoogleCalendarTokens | undefined>;
  upsertGoogleCalendarTokens(userId: string, tokens: { refreshToken: string; accessToken?: string; expiresAt?: Date }): Promise<GoogleCalendarTokens>;
  updateGoogleCalendarAccessToken(userId: string, accessToken: string, expiresAt: Date): Promise<void>;
  deleteGoogleCalendarTokens(userId: string): Promise<boolean>;
  isCalendarConnected(userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getExercises(userId?: string): Promise<Exercise[]> {
    try {
      // Show:
      // 1. Built-in exercises (userId = null) - always visible
      // 2. User's own exercises (userId = currentUser)
      // 3. Public exercises from other users (isPublic = true)
      const results = userId 
        ? await neonClient`
            SELECT 
              id, 
              user_id as "userId",
              is_public as "isPublic",
              name, 
              muscle_groups as "muscleGroups", 
              description, 
              CASE 
                WHEN image_url LIKE 'data:image%' THEN NULL 
                ELSE image_url 
              END as "imageUrl", 
              exercise_type as "exerciseType",
              is_assisted as "isAssisted"
            FROM exercises 
            WHERE user_id IS NULL 
               OR user_id = ${userId}
               OR is_public = true
            ORDER BY name
          `
        : await neonClient`
            SELECT 
              id, 
              user_id as "userId",
              is_public as "isPublic",
              name, 
              muscle_groups as "muscleGroups", 
              description, 
              CASE 
                WHEN image_url LIKE 'data:image%' THEN NULL 
                ELSE image_url 
              END as "imageUrl", 
              exercise_type as "exerciseType",
              is_assisted as "isAssisted"
            FROM exercises 
            ORDER BY name
          `;
      return (results || []) as Exercise[];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        console.warn("Known Neon empty result issue, returning empty array");
        return [];
      }
      throw error;
    }
  }

  async getExercisesWithBase64Images(): Promise<Exercise[]> {
    try {
      // Query exercises one at a time that have base64 images
      const results = await neonClient`
        SELECT id, user_id as "userId", is_public as "isPublic", name, muscle_groups as "muscleGroups", description, image_url as "imageUrl", exercise_type as "exerciseType", is_assisted as "isAssisted"
        FROM exercises 
        WHERE image_url LIKE 'data:image%'
        ORDER BY name
      `;
      return (results || []) as Exercise[];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return [];
      }
      throw error;
    }
  }

  async getExerciseWithImage(id: string): Promise<Exercise | undefined> {
    try {
      const results = await neonClient`
        SELECT id, user_id as "userId", is_public as "isPublic", name, muscle_groups as "muscleGroups", description, image_url as "imageUrl", exercise_type as "exerciseType", is_assisted as "isAssisted"
        FROM exercises 
        WHERE id = ${id}
      `;
      if (results && results.length > 0) {
        return results[0] as Exercise;
      }
      return undefined;
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return undefined;
      }
      throw error;
    }
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    try {
      const id = crypto.randomUUID();
      const muscleGroupsJson = JSON.stringify(exercise.muscleGroups || []);
      const isPublic = exercise.isPublic ?? true;
      
      await neonClient`
        INSERT INTO exercises (id, user_id, is_public, name, muscle_groups, description, image_url, exercise_type, is_assisted)
        VALUES (${id}, ${exercise.userId || null}, ${isPublic}, ${exercise.name}, ${muscleGroupsJson}::jsonb, ${exercise.description}, ${exercise.imageUrl || null}, ${exercise.exerciseType || "weight_reps"}, ${exercise.isAssisted || false})
      `;
      
      const newExercise: Exercise = {
        id,
        userId: exercise.userId || null,
        isPublic,
        name: exercise.name,
        muscleGroups: exercise.muscleGroups || [],
        description: exercise.description,
        imageUrl: exercise.imageUrl || null,
        exerciseType: exercise.exerciseType || "weight_reps",
        isAssisted: exercise.isAssisted || false,
      };
      
      console.log("Created exercise:", newExercise);
      return newExercise;
    } catch (error) {
      console.error("Error in createExercise:", error);
      throw error;
    }
  }

  async createExerciseWithId(id: string, exercise: InsertExercise): Promise<Exercise> {
    try {
      const muscleGroupsJson = JSON.stringify(exercise.muscleGroups || []);
      const isPublic = exercise.isPublic ?? true;
      
      await neonClient`
        INSERT INTO exercises (id, user_id, is_public, name, muscle_groups, description, image_url, exercise_type, is_assisted)
        VALUES (${id}, ${exercise.userId || null}, ${isPublic}, ${exercise.name}, ${muscleGroupsJson}::jsonb, ${exercise.description}, ${exercise.imageUrl || null}, ${exercise.exerciseType || "weight_reps"}, ${exercise.isAssisted || false})
      `;
      
      const newExercise: Exercise = {
        id,
        userId: exercise.userId || null,
        isPublic,
        name: exercise.name,
        muscleGroups: exercise.muscleGroups || [],
        description: exercise.description,
        imageUrl: exercise.imageUrl || null,
        exerciseType: exercise.exerciseType || "weight_reps",
        isAssisted: exercise.isAssisted || false,
      };
      
      console.log("Created exercise with ID:", newExercise);
      return newExercise;
    } catch (error) {
      console.error("Error in createExerciseWithId:", error);
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
    if (exercise.isAssisted !== undefined) {
      setClauses.push(`is_assisted = $${paramIndex++}`);
      params.push(exercise.isAssisted);
    }
    if (exercise.isPublic !== undefined) {
      setClauses.push(`is_public = $${paramIndex++}`);
      params.push(exercise.isPublic);
    }
    
    if (setClauses.length === 0) return undefined;
    
    params.push(id);
    const query = `UPDATE exercises SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING id, user_id as "userId", is_public as "isPublic", name, muscle_groups as "muscleGroups", description, image_url as "imageUrl", exercise_type as "exerciseType", is_assisted as "isAssisted"`;
    
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

  async getWorkoutTemplates(userId?: string): Promise<WorkoutTemplate[]> {
    try {
      const results = userId 
        ? await neonClient`
            SELECT id, user_id as "userId", name, exercises 
            FROM workout_templates 
            WHERE user_id = ${userId}
            ORDER BY name
          `
        : await neonClient`
            SELECT id, user_id as "userId", name, exercises 
            FROM workout_templates 
            ORDER BY name
          `;
      return (results || []) as WorkoutTemplate[];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        console.warn("Known Neon empty result issue, returning empty array");
        return [];
      }
      throw error;
    }
  }

  async getWorkoutTemplate(id: string): Promise<WorkoutTemplate | undefined> {
    try {
      const results = await neonClient`
        SELECT id, user_id as "userId", name, exercises 
        FROM workout_templates 
        WHERE id = ${id}
      `;
      return results?.[0] as WorkoutTemplate | undefined;
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return undefined;
      }
      throw error;
    }
  }

  async createWorkoutTemplate(template: InsertWorkoutTemplate): Promise<WorkoutTemplate> {
    const id = crypto.randomUUID();
    const exercisesJson = JSON.stringify(template.exercises || []);
    await neonClient`
      INSERT INTO workout_templates (id, user_id, name, exercises)
      VALUES (${id}, ${template.userId || null}, ${template.name}, ${exercisesJson}::jsonb)
    `;
    return {
      id,
      userId: template.userId || null,
      name: template.name,
      exercises: template.exercises || [],
    };
  }

  async updateWorkoutTemplate(id: string, template: Partial<InsertWorkoutTemplate>): Promise<WorkoutTemplate | undefined> {
    const results = await db.update(workoutTemplates).set(template).where(eq(workoutTemplates.id, id)).returning();
    return results[0];
  }

  async deleteWorkoutTemplate(id: string): Promise<boolean> {
    try {
      await neonClient`DELETE FROM workout_templates WHERE id = ${id}`;
      return true;
    } catch (error) {
      console.error("Error deleting workout template:", error);
      return false;
    }
  }

  async getScheduledWorkouts(userId?: string): Promise<ScheduledWorkout[]> {
    try {
      const results = userId
        ? await neonClient`
            SELECT id, user_id as "userId", template_id as "templateId", name, date, exercises, calendar_event_id as "calendarEventId", routine_instance_id as "routineInstanceId", routine_day_index as "routineDayIndex"
            FROM scheduled_workouts 
            WHERE user_id = ${userId}
            ORDER BY date
          `
        : await neonClient`
            SELECT id, user_id as "userId", template_id as "templateId", name, date, exercises, calendar_event_id as "calendarEventId", routine_instance_id as "routineInstanceId", routine_day_index as "routineDayIndex"
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
    const results = await neonClient`
      SELECT id, user_id as "userId", template_id as "templateId", name, date, exercises, calendar_event_id as "calendarEventId", routine_instance_id as "routineInstanceId", routine_day_index as "routineDayIndex"
      FROM scheduled_workouts 
      WHERE id = ${id}
    `;
    if (results.length === 0) return undefined;
    const row = results[0];
    return {
      id: row.id,
      userId: row.userId,
      templateId: row.templateId,
      name: row.name,
      date: new Date(row.date),
      exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises,
      calendarEventId: row.calendarEventId,
      routineInstanceId: row.routineInstanceId,
      routineDayIndex: row.routineDayIndex,
    };
  }

  async createScheduledWorkout(workout: InsertScheduledWorkout): Promise<ScheduledWorkout> {
    const id = crypto.randomUUID();
    const exercisesJson = JSON.stringify(workout.exercises || []);
    const dateStr = workout.date instanceof Date ? workout.date.toISOString() : workout.date;
    await neonClient`
      INSERT INTO scheduled_workouts (id, user_id, name, date, exercises, template_id)
      VALUES (${id}, ${workout.userId || null}, ${workout.name}, ${dateStr}::timestamp, ${exercisesJson}::jsonb, ${workout.templateId || null})
    `;
    return {
      id,
      userId: workout.userId || null,
      name: workout.name,
      date: workout.date instanceof Date ? workout.date : new Date(workout.date),
      exercises: workout.exercises || [],
      templateId: workout.templateId || null,
      calendarEventId: null,
      routineInstanceId: null,
      routineDayIndex: null,
    };
  }

  async updateScheduledWorkout(id: string, workout: Partial<InsertScheduledWorkout>): Promise<ScheduledWorkout | undefined> {
    const results = await db.update(scheduledWorkouts).set(workout).where(eq(scheduledWorkouts.id, id)).returning();
    return results[0];
  }

  async updateScheduledWorkoutsByRoutineInstanceAndName(routineInstanceId: string, originalName: string, newName: string): Promise<number> {
    const results = await neonClient`
      UPDATE scheduled_workouts 
      SET name = ${newName} 
      WHERE routine_instance_id = ${routineInstanceId} AND name = ${originalName}
      RETURNING id
    `;
    return results.length;
  }

  async updateScheduledWorkoutsByTemplateAndName(templateId: string, originalName: string, newName: string): Promise<number> {
    const results = await neonClient`
      UPDATE scheduled_workouts 
      SET name = ${newName} 
      WHERE template_id = ${templateId} AND name = ${originalName}
      RETURNING id
    `;
    return results.length;
  }

  async updateFutureScheduledWorkoutsByTemplate(templateId: string, name: string, exercises: any): Promise<number> {
    const now = new Date();
    const results = await neonClient`
      UPDATE scheduled_workouts 
      SET name = ${name}, exercises = ${JSON.stringify(exercises)}
      WHERE template_id = ${templateId} AND date > ${now}
      RETURNING id
    `;
    return results.length;
  }

  async updateFutureScheduledWorkoutsByRoutineInstance(
    routineInstanceId: string, 
    routineEntries: { dayIndex: number; workoutName: string | null; exercises: any }[]
  ): Promise<number> {
    // Use start of today to include same-day scheduled workouts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let updatedCount = 0;
    
    // Get all future scheduled workouts for this routine instance (from today onwards)
    const futureWorkouts = await neonClient`
      SELECT id, routine_day_index as "routineDayIndex"
      FROM scheduled_workouts 
      WHERE routine_instance_id = ${routineInstanceId} AND date >= ${today}
    `;
    
    // Update each workout with the matching routine entry
    for (const workout of futureWorkouts) {
      const matchingEntry = routineEntries.find(e => e.dayIndex === workout.routineDayIndex);
      if (matchingEntry && matchingEntry.exercises) {
        await neonClient`
          UPDATE scheduled_workouts 
          SET name = ${matchingEntry.workoutName || 'Workout'}, 
              exercises = ${JSON.stringify(matchingEntry.exercises)}
          WHERE id = ${workout.id}
        `;
        updatedCount++;
      }
    }
    
    return updatedCount;
  }

  async updateScheduledWorkoutCalendarEventId(id: string, calendarEventId: string | null): Promise<void> {
    await neonClient`
      UPDATE scheduled_workouts SET calendar_event_id = ${calendarEventId} WHERE id = ${id}
    `;
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

  async getCompletedWorkouts(userId?: string): Promise<CompletedWorkout[]> {
    try {
      const results = userId
        ? await neonClient`
            SELECT 
              id, 
              user_id as "userId",
              template_id as "templateId",
              display_id as "displayId", 
              name, 
              exercises, 
              completed_at as "completedAt",
              calendar_event_id as "calendarEventId"
            FROM completed_workouts 
            WHERE user_id = ${userId}
            ORDER BY completed_at DESC
          `
        : await neonClient`
            SELECT 
              id, 
              user_id as "userId",
              template_id as "templateId",
              display_id as "displayId", 
              name, 
              exercises, 
              completed_at as "completedAt",
              calendar_event_id as "calendarEventId"
            FROM completed_workouts 
            ORDER BY completed_at DESC
          `;
      return (results || []) as CompletedWorkout[];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        console.warn("Known Neon empty result issue, returning empty array");
        return [];
      }
      throw error;
    }
  }

  async getCompletedWorkout(id: string): Promise<CompletedWorkout | undefined> {
    try {
      const results = await neonClient`
        SELECT 
          id, 
          user_id as "userId",
          template_id as "templateId",
          display_id as "displayId", 
          name, 
          exercises, 
          completed_at as "completedAt",
          calendar_event_id as "calendarEventId"
        FROM completed_workouts 
        WHERE id = ${id}
      `;
      return results?.[0] as CompletedWorkout | undefined;
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return undefined;
      }
      throw error;
    }
  }

  async getCompletedWorkoutsByTemplateId(templateId: string, userId: string): Promise<CompletedWorkout[]> {
    try {
      const results = await neonClient`
        SELECT 
          id, 
          user_id as "userId",
          template_id as "templateId",
          display_id as "displayId", 
          name, 
          exercises, 
          completed_at as "completedAt",
          calendar_event_id as "calendarEventId"
        FROM completed_workouts 
        WHERE template_id = ${templateId} AND user_id = ${userId}
        ORDER BY completed_at DESC
      `;
      return (results || []) as CompletedWorkout[];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return [];
      }
      throw error;
    }
  }

  async createCompletedWorkout(workout: InsertCompletedWorkout): Promise<CompletedWorkout> {
    const id = crypto.randomUUID();
    const exercisesJson = JSON.stringify(workout.exercises || []);
    const completedAtStr = workout.completedAt instanceof Date 
      ? workout.completedAt.toISOString() 
      : (workout.completedAt || new Date().toISOString());
    
    await neonClient`
      INSERT INTO completed_workouts (id, user_id, template_id, display_id, name, exercises, completed_at)
      VALUES (${id}, ${workout.userId || null}, ${workout.templateId || null}, ${workout.displayId}, ${workout.name}, ${exercisesJson}::jsonb, ${completedAtStr}::timestamp)
    `;
    
    return {
      id,
      userId: workout.userId || null,
      templateId: workout.templateId || null,
      displayId: workout.displayId,
      name: workout.name,
      exercises: workout.exercises,
      completedAt: workout.completedAt instanceof Date ? workout.completedAt : new Date(completedAtStr),
      calendarEventId: null,
      routineInstanceId: null,
      routineDayIndex: null,
    };
  }

  async updateCompletedWorkout(id: string, workout: Partial<InsertCompletedWorkout>): Promise<CompletedWorkout | undefined> {
    const existing = await this.getCompletedWorkout(id);
    if (!existing) return undefined;
    
    const name = workout.name !== undefined ? workout.name : existing.name;
    const exercises = workout.exercises !== undefined ? workout.exercises : existing.exercises;
    
    await neonClient`
      UPDATE completed_workouts 
      SET name = ${name}, exercises = ${JSON.stringify(exercises)}
      WHERE id = ${id}
    `;
    
    return {
      ...existing,
      name,
      exercises,
    };
  }

  async updateCompletedWorkoutCalendarEventId(id: string, calendarEventId: string): Promise<void> {
    await neonClient`
      UPDATE completed_workouts SET calendar_event_id = ${calendarEventId} WHERE id = ${id}
    `;
  }

  async deleteCompletedWorkout(id: string): Promise<boolean> {
    const results = await db.delete(completedWorkouts).where(eq(completedWorkouts.id, id)).returning();
    return results.length > 0;
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    try {
      const results = await neonClient`
        SELECT 
          id,
          user_id as "userId",
          selected_calendar_id as "selectedCalendarId",
          selected_calendar_name as "selectedCalendarName"
        FROM user_settings 
        WHERE user_id = ${userId}
      `;
      return results?.[0] as UserSettings | undefined;
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return undefined;
      }
      throw error;
    }
  }

  async upsertUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    
    const calendarId = settings.selectedCalendarId !== undefined ? settings.selectedCalendarId : (existing?.selectedCalendarId ?? null);
    const calendarName = settings.selectedCalendarName !== undefined ? settings.selectedCalendarName : (existing?.selectedCalendarName ?? null);
    
    if (existing) {
      const results = await neonClient`
        UPDATE user_settings 
        SET 
          selected_calendar_id = ${calendarId},
          selected_calendar_name = ${calendarName}
        WHERE user_id = ${userId}
        RETURNING 
          id,
          user_id as "userId",
          selected_calendar_id as "selectedCalendarId",
          selected_calendar_name as "selectedCalendarName"
      `;
      return results[0] as UserSettings;
    } else {
      const id = crypto.randomUUID();
      await neonClient`
        INSERT INTO user_settings (id, user_id, selected_calendar_id, selected_calendar_name)
        VALUES (${id}, ${userId}, ${calendarId}, ${calendarName})
      `;
      return {
        id,
        userId,
        selectedCalendarId: calendarId,
        selectedCalendarName: calendarName,
      };
    }
  }

  async getActiveWorkout(userId: string): Promise<ActiveWorkout | undefined> {
    try {
      const results = await neonClient`
        SELECT 
          id,
          user_id as "userId",
          workout_data as "workoutData",
          tracking_progress as "trackingProgress",
          updated_at as "updatedAt"
        FROM active_workouts 
        WHERE user_id = ${userId}
      `;
      return results?.[0] as ActiveWorkout | undefined;
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return undefined;
      }
      throw error;
    }
  }

  async upsertActiveWorkout(userId: string, workoutData: any, trackingProgress?: any): Promise<ActiveWorkout> {
    const existing = await this.getActiveWorkout(userId);
    const workoutDataJson = JSON.stringify(workoutData);
    const trackingProgressJson = trackingProgress ? JSON.stringify(trackingProgress) : null;
    
    if (existing) {
      const results = await neonClient`
        UPDATE active_workouts 
        SET 
          workout_data = ${workoutDataJson}::jsonb,
          tracking_progress = ${trackingProgressJson}::jsonb,
          updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING 
          id,
          user_id as "userId",
          workout_data as "workoutData",
          tracking_progress as "trackingProgress",
          updated_at as "updatedAt"
      `;
      return results[0] as ActiveWorkout;
    } else {
      const id = crypto.randomUUID();
      await neonClient`
        INSERT INTO active_workouts (id, user_id, workout_data, tracking_progress, updated_at)
        VALUES (${id}, ${userId}, ${workoutDataJson}::jsonb, ${trackingProgressJson}::jsonb, NOW())
      `;
      return {
        id,
        userId,
        workoutData,
        trackingProgress,
        updatedAt: new Date(),
      };
    }
  }

  async deleteActiveWorkout(userId: string): Promise<boolean> {
    try {
      await neonClient`DELETE FROM active_workouts WHERE user_id = ${userId}`;
      return true;
    } catch (error) {
      console.error("Error deleting active workout:", error);
      return false;
    }
  }

  async getRoutines(userId: string): Promise<Routine[]> {
    try {
      const results = await neonClient`
        SELECT 
          id,
          user_id as "userId",
          name,
          description,
          default_duration_days as "defaultDurationDays",
          is_public as "isPublic",
          created_at as "createdAt"
        FROM routines 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      return (results || []) as Routine[];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return [];
      }
      throw error;
    }
  }

  async getPublicRoutines(): Promise<Routine[]> {
    try {
      const results = await neonClient`
        SELECT 
          id,
          user_id as "userId",
          name,
          description,
          default_duration_days as "defaultDurationDays",
          is_public as "isPublic",
          created_at as "createdAt"
        FROM routines 
        WHERE is_public = true
        ORDER BY created_at DESC
      `;
      return (results || []) as Routine[];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return [];
      }
      throw error;
    }
  }

  async getRoutine(id: string): Promise<Routine | undefined> {
    try {
      const results = await neonClient`
        SELECT 
          id,
          user_id as "userId",
          name,
          description,
          default_duration_days as "defaultDurationDays",
          is_public as "isPublic",
          created_at as "createdAt"
        FROM routines 
        WHERE id = ${id}
      `;
      return results?.[0] as Routine | undefined;
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return undefined;
      }
      throw error;
    }
  }

  async createRoutine(routine: InsertRoutine): Promise<Routine> {
    const id = crypto.randomUUID();
    await neonClient`
      INSERT INTO routines (id, user_id, name, description, default_duration_days, is_public)
      VALUES (${id}, ${routine.userId}, ${routine.name}, ${routine.description || null}, ${routine.defaultDurationDays || 7}, ${routine.isPublic || false})
    `;
    return {
      id,
      userId: routine.userId,
      name: routine.name,
      description: routine.description || null,
      defaultDurationDays: routine.defaultDurationDays || 7,
      isPublic: routine.isPublic || false,
      createdAt: new Date(),
    };
  }

  async updateRoutine(id: string, routine: Partial<InsertRoutine>): Promise<Routine | undefined> {
    const existing = await this.getRoutine(id);
    if (!existing) return undefined;
    
    const name = routine.name !== undefined ? routine.name : existing.name;
    const description = routine.description !== undefined ? routine.description : existing.description;
    const defaultDurationDays = routine.defaultDurationDays !== undefined ? routine.defaultDurationDays : existing.defaultDurationDays;
    const isPublic = routine.isPublic !== undefined ? routine.isPublic : existing.isPublic;
    
    await neonClient`
      UPDATE routines 
      SET 
        name = ${name}, 
        description = ${description}, 
        default_duration_days = ${defaultDurationDays},
        is_public = ${isPublic}
      WHERE id = ${id}
    `;
    
    return {
      ...existing,
      name,
      description,
      defaultDurationDays,
      isPublic,
    };
  }

  async deleteRoutine(id: string): Promise<boolean> {
    try {
      await this.deleteRoutineEntriesByRoutineId(id);
      await neonClient`DELETE FROM routines WHERE id = ${id}`;
      return true;
    } catch (error) {
      console.error("Error deleting routine:", error);
      return false;
    }
  }

  async getRoutineEntries(routineId: string): Promise<RoutineEntry[]> {
    try {
      const results = await neonClient`
        SELECT 
          id,
          routine_id as "routineId",
          day_index as "dayIndex",
          workout_template_id as "workoutTemplateId",
          workout_name as "workoutName",
          exercises
        FROM routine_entries 
        WHERE routine_id = ${routineId}
        ORDER BY day_index
      `;
      return (results || []) as RoutineEntry[];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return [];
      }
      throw error;
    }
  }

  async createRoutineEntry(entry: InsertRoutineEntry): Promise<RoutineEntry> {
    const id = crypto.randomUUID();
    const exercisesJson = entry.exercises ? JSON.stringify(entry.exercises) : null;
    await neonClient`
      INSERT INTO routine_entries (id, routine_id, day_index, workout_template_id, workout_name, exercises)
      VALUES (${id}, ${entry.routineId}, ${entry.dayIndex}, ${entry.workoutTemplateId || null}, ${entry.workoutName || null}, ${exercisesJson}::jsonb)
    `;
    return {
      id,
      routineId: entry.routineId,
      dayIndex: entry.dayIndex,
      workoutTemplateId: entry.workoutTemplateId || null,
      workoutName: entry.workoutName || null,
      exercises: entry.exercises || null,
    };
  }

  async updateRoutineEntry(id: string, entry: Partial<InsertRoutineEntry>): Promise<RoutineEntry | undefined> {
    const existingResults = await neonClient`
      SELECT 
        id,
        routine_id as "routineId",
        day_index as "dayIndex",
        workout_template_id as "workoutTemplateId",
        workout_name as "workoutName",
        exercises
      FROM routine_entries 
      WHERE id = ${id}
    `;
    const existing = existingResults?.[0] as RoutineEntry | undefined;
    if (!existing) return undefined;
    
    const dayIndex = entry.dayIndex !== undefined ? entry.dayIndex : existing.dayIndex;
    const workoutTemplateId = entry.workoutTemplateId !== undefined ? entry.workoutTemplateId : existing.workoutTemplateId;
    const workoutName = entry.workoutName !== undefined ? entry.workoutName : existing.workoutName;
    const exercises = entry.exercises !== undefined ? entry.exercises : existing.exercises;
    const exercisesJson = exercises ? JSON.stringify(exercises) : null;
    
    await neonClient`
      UPDATE routine_entries 
      SET 
        day_index = ${dayIndex},
        workout_template_id = ${workoutTemplateId},
        workout_name = ${workoutName},
        exercises = ${exercisesJson}::jsonb
      WHERE id = ${id}
    `;
    
    return {
      ...existing,
      dayIndex,
      workoutTemplateId,
      workoutName,
      exercises,
    };
  }

  async deleteRoutineEntry(id: string): Promise<boolean> {
    try {
      await neonClient`DELETE FROM routine_entries WHERE id = ${id}`;
      return true;
    } catch (error) {
      console.error("Error deleting routine entry:", error);
      return false;
    }
  }

  async deleteRoutineEntriesByRoutineId(routineId: string): Promise<boolean> {
    try {
      await neonClient`DELETE FROM routine_entries WHERE routine_id = ${routineId}`;
      return true;
    } catch (error) {
      console.error("Error deleting routine entries:", error);
      return false;
    }
  }

  async getRoutineInstances(userId: string): Promise<RoutineInstance[]> {
    try {
      const results = await neonClient`
        SELECT 
          id,
          routine_id as "routineId",
          user_id as "userId",
          routine_name as "routineName",
          start_date as "startDate",
          end_date as "endDate",
          duration_days as "durationDays",
          total_workouts as "totalWorkouts",
          completed_workouts as "completedWorkouts",
          skipped_workouts as "skippedWorkouts",
          status,
          created_at as "createdAt",
          completed_at as "completedAt"
        FROM routine_instances 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      return (results || []) as RoutineInstance[];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return [];
      }
      throw error;
    }
  }

  async getActiveRoutineInstances(userId: string): Promise<RoutineInstance[]> {
    try {
      const results = await neonClient`
        SELECT 
          id,
          routine_id as "routineId",
          user_id as "userId",
          routine_name as "routineName",
          start_date as "startDate",
          end_date as "endDate",
          duration_days as "durationDays",
          total_workouts as "totalWorkouts",
          completed_workouts as "completedWorkouts",
          skipped_workouts as "skippedWorkouts",
          status,
          created_at as "createdAt",
          completed_at as "completedAt"
        FROM routine_instances 
        WHERE user_id = ${userId} AND status = 'active'
        ORDER BY start_date ASC
      `;
      return (results || []) as RoutineInstance[];
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return [];
      }
      throw error;
    }
  }

  async getRoutineInstance(id: string): Promise<RoutineInstance | undefined> {
    try {
      const results = await neonClient`
        SELECT 
          id,
          routine_id as "routineId",
          user_id as "userId",
          routine_name as "routineName",
          start_date as "startDate",
          end_date as "endDate",
          duration_days as "durationDays",
          total_workouts as "totalWorkouts",
          completed_workouts as "completedWorkouts",
          skipped_workouts as "skippedWorkouts",
          status,
          created_at as "createdAt",
          completed_at as "completedAt"
        FROM routine_instances 
        WHERE id = ${id}
      `;
      return results?.[0] as RoutineInstance | undefined;
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null (reading 'map')")) {
        return undefined;
      }
      throw error;
    }
  }

  async createRoutineInstance(instance: InsertRoutineInstance): Promise<RoutineInstance> {
    const id = crypto.randomUUID();
    const startDateStr = instance.startDate instanceof Date ? instance.startDate.toISOString() : instance.startDate;
    const endDateStr = instance.endDate instanceof Date ? instance.endDate.toISOString() : instance.endDate;
    
    await neonClient`
      INSERT INTO routine_instances (id, routine_id, user_id, routine_name, start_date, end_date, duration_days, total_workouts, completed_workouts, status)
      VALUES (${id}, ${instance.routineId}, ${instance.userId}, ${instance.routineName}, ${startDateStr}::timestamp, ${endDateStr}::timestamp, ${instance.durationDays}, ${instance.totalWorkouts || 0}, ${instance.completedWorkouts || 0}, ${instance.status || 'active'})
    `;
    
    return {
      id,
      routineId: instance.routineId,
      userId: instance.userId,
      routineName: instance.routineName,
      startDate: instance.startDate instanceof Date ? instance.startDate : new Date(startDateStr),
      endDate: instance.endDate instanceof Date ? instance.endDate : new Date(endDateStr),
      durationDays: instance.durationDays,
      totalWorkouts: instance.totalWorkouts || 0,
      completedWorkouts: instance.completedWorkouts || 0,
      skippedWorkouts: 0,
      status: instance.status || 'active',
      createdAt: new Date(),
      completedAt: null,
    };
  }

  async updateRoutineInstance(id: string, instance: Partial<InsertRoutineInstance>): Promise<RoutineInstance | undefined> {
    const existing = await this.getRoutineInstance(id);
    if (!existing) return undefined;
    
    const status = instance.status !== undefined ? instance.status : existing.status;
    const completedWorkouts = instance.completedWorkouts !== undefined ? instance.completedWorkouts : existing.completedWorkouts;
    const totalWorkouts = instance.totalWorkouts !== undefined ? instance.totalWorkouts : existing.totalWorkouts;
    
    await neonClient`
      UPDATE routine_instances 
      SET 
        status = ${status},
        completed_workouts = ${completedWorkouts},
        total_workouts = ${totalWorkouts},
        completed_at = ${status === 'completed' ? new Date().toISOString() : null}::timestamp
      WHERE id = ${id}
    `;
    
    return {
      ...existing,
      status,
      completedWorkouts,
      totalWorkouts,
      completedAt: status === 'completed' ? new Date() : null,
    };
  }

  async incrementRoutineInstanceProgress(id: string): Promise<RoutineInstance | undefined> {
    const existing = await this.getRoutineInstance(id);
    if (!existing) return undefined;
    
    const newCompletedWorkouts = existing.completedWorkouts + 1;
    const isComplete = newCompletedWorkouts + existing.skippedWorkouts >= existing.totalWorkouts;
    const newStatus = isComplete ? 'completed' : 'active';
    
    await neonClient`
      UPDATE routine_instances 
      SET 
        completed_workouts = ${newCompletedWorkouts},
        status = ${newStatus},
        completed_at = ${isComplete ? new Date().toISOString() : null}::timestamp
      WHERE id = ${id}
    `;
    
    return {
      ...existing,
      completedWorkouts: newCompletedWorkouts,
      status: newStatus,
      completedAt: isComplete ? new Date() : null,
    };
  }

  async incrementRoutineInstanceSkipped(id: string): Promise<RoutineInstance | undefined> {
    const existing = await this.getRoutineInstance(id);
    if (!existing) return undefined;
    
    const newSkippedWorkouts = existing.skippedWorkouts + 1;
    const isComplete = existing.completedWorkouts + newSkippedWorkouts >= existing.totalWorkouts;
    const newStatus = isComplete ? 'completed' : 'active';
    
    await neonClient`
      UPDATE routine_instances 
      SET 
        skipped_workouts = ${newSkippedWorkouts},
        status = ${newStatus},
        completed_at = ${isComplete ? new Date().toISOString() : null}::timestamp
      WHERE id = ${id}
    `;
    
    return {
      ...existing,
      skippedWorkouts: newSkippedWorkouts,
      status: newStatus,
      completedAt: isComplete ? new Date() : null,
    };
  }

  async deleteRoutineInstance(id: string): Promise<boolean> {
    try {
      await neonClient`DELETE FROM routine_instances WHERE id = ${id}`;
      return true;
    } catch (error) {
      console.error("Error deleting routine instance:", error);
      return false;
    }
  }

  async createScheduledWorkoutWithRoutine(workout: InsertScheduledWorkout & { routineInstanceId?: string | null; routineDayIndex?: number | null }): Promise<ScheduledWorkout> {
    const id = crypto.randomUUID();
    const exercisesJson = JSON.stringify(workout.exercises || []);
    const dateStr = workout.date instanceof Date ? workout.date.toISOString() : workout.date;
    
    await neonClient`
      INSERT INTO scheduled_workouts (id, user_id, name, date, exercises, template_id, routine_instance_id, routine_day_index)
      VALUES (${id}, ${workout.userId || null}, ${workout.name}, ${dateStr}::timestamp, ${exercisesJson}::jsonb, ${workout.templateId || null}, ${workout.routineInstanceId || null}, ${workout.routineDayIndex ?? null})
    `;
    
    return {
      id,
      userId: workout.userId || null,
      name: workout.name,
      date: workout.date instanceof Date ? workout.date : new Date(dateStr),
      exercises: workout.exercises || [],
      templateId: workout.templateId || null,
      calendarEventId: null,
      routineInstanceId: workout.routineInstanceId || null,
      routineDayIndex: workout.routineDayIndex ?? null,
    };
  }

  async getGoogleCalendarTokens(userId: string): Promise<GoogleCalendarTokens | undefined> {
    try {
      const results = await neonClient`
        SELECT id, user_id as "userId", refresh_token as "refreshToken", access_token as "accessToken", 
               expires_at as "expiresAt", connected_at as "connectedAt"
        FROM google_calendar_tokens 
        WHERE user_id = ${userId}
      `;
      if (!results || results.length === 0) return undefined;
      const row = results[0] as any;
      return {
        id: row.id,
        userId: row.userId,
        refreshToken: decryptToken(row.refreshToken),
        accessToken: row.accessToken ? decryptToken(row.accessToken) : null,
        expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
        connectedAt: new Date(row.connectedAt),
      };
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null")) {
        return undefined;
      }
      throw error;
    }
  }

  async upsertGoogleCalendarTokens(userId: string, tokens: { refreshToken: string; accessToken?: string; expiresAt?: Date }): Promise<GoogleCalendarTokens> {
    console.log("[Storage] upsertGoogleCalendarTokens called with userId:", userId);
    
    try {
      const id = crypto.randomUUID();
      const encryptedRefresh = encryptToken(tokens.refreshToken);
      const encryptedAccess = tokens.accessToken ? encryptToken(tokens.accessToken) : null;
      const expiresAtStr = tokens.expiresAt ? tokens.expiresAt.toISOString() : null;
      const now = new Date();
      
      console.log("[Storage] Inserting token with id:", id, "encryptedRefresh length:", encryptedRefresh?.length);
      
      const result = await neonClient`
        INSERT INTO google_calendar_tokens (id, user_id, refresh_token, access_token, expires_at, connected_at)
        VALUES (${id}, ${userId}, ${encryptedRefresh}, ${encryptedAccess}, ${expiresAtStr}::timestamp, ${now.toISOString()}::timestamp)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          refresh_token = ${encryptedRefresh},
          access_token = ${encryptedAccess},
          expires_at = ${expiresAtStr}::timestamp,
          connected_at = ${now.toISOString()}::timestamp
        RETURNING id
      `;
      
      console.log("[Storage] Token insert result:", result);
      
      return {
        id,
        userId,
        refreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken || null,
        expiresAt: tokens.expiresAt || null,
        connectedAt: now,
      };
    } catch (error: any) {
      console.error("[Storage] CRITICAL: Failed to save calendar tokens:", error.message, error.stack);
      throw error;
    }
  }

  async updateGoogleCalendarAccessToken(userId: string, accessToken: string, expiresAt: Date): Promise<void> {
    const encryptedAccess = encryptToken(accessToken);
    await neonClient`
      UPDATE google_calendar_tokens 
      SET access_token = ${encryptedAccess}, expires_at = ${expiresAt.toISOString()}::timestamp
      WHERE user_id = ${userId}
    `;
  }

  async deleteGoogleCalendarTokens(userId: string): Promise<boolean> {
    try {
      await neonClient`DELETE FROM google_calendar_tokens WHERE user_id = ${userId}`;
      return true;
    } catch (error) {
      console.error("Error deleting calendar tokens:", error);
      return false;
    }
  }

  async isCalendarConnected(userId: string): Promise<boolean> {
    try {
      const results = await neonClient`
        SELECT id FROM google_calendar_tokens WHERE user_id = ${userId}
      `;
      return results && results.length > 0;
    } catch (error: any) {
      if (error?.message?.includes("Cannot read properties of null")) {
        return false;
      }
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
