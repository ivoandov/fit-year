import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertExerciseSchema, insertScheduledWorkoutSchema, insertCompletedWorkoutSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Exercises
  app.get("/api/exercises", async (req, res) => {
    try {
      const exerciseList = await storage.getExercises();
      res.json(exerciseList);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  });

  app.post("/api/exercises", async (req, res) => {
    try {
      const parsed = insertExerciseSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("Validation error:", parsed.error.message);
        return res.status(400).json({ error: parsed.error.message });
      }
      const exercise = await storage.createExercise(parsed.data);
      res.status(201).json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      res.status(500).json({ error: "Failed to create exercise" });
    }
  });

  app.put("/api/exercises/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = insertExerciseSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        console.error("Validation error:", parsed.error.message);
        return res.status(400).json({ error: parsed.error.message });
      }
      let exercise = await storage.updateExercise(id, parsed.data);
      if (!exercise) {
        const fullParsed = insertExerciseSchema.safeParse(req.body);
        if (!fullParsed.success) {
          return res.status(400).json({ error: "Full exercise data required for new exercise" });
        }
        exercise = await storage.createExercise(fullParsed.data);
      }
      res.json(exercise);
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(500).json({ error: "Failed to update exercise" });
    }
  });

  app.delete("/api/exercises/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExercise(id);
      if (!deleted) {
        return res.status(404).json({ error: "Exercise not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete exercise" });
    }
  });

  // Scheduled Workouts
  app.get("/api/scheduled-workouts", async (req, res) => {
    try {
      const workouts = await storage.getScheduledWorkouts();
      res.json(workouts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheduled workouts" });
    }
  });

  app.post("/api/scheduled-workouts", async (req, res) => {
    try {
      const parsed = insertScheduledWorkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const workout = await storage.createScheduledWorkout(parsed.data);
      res.status(201).json(workout);
    } catch (error) {
      res.status(500).json({ error: "Failed to create scheduled workout" });
    }
  });

  app.put("/api/scheduled-workouts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = insertScheduledWorkoutSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const workout = await storage.updateScheduledWorkout(id, parsed.data);
      if (!workout) {
        return res.status(404).json({ error: "Workout not found" });
      }
      res.json(workout);
    } catch (error) {
      res.status(500).json({ error: "Failed to update scheduled workout" });
    }
  });

  app.delete("/api/scheduled-workouts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteScheduledWorkout(id);
      if (!deleted) {
        return res.status(404).json({ error: "Workout not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete scheduled workout" });
    }
  });

  // Completed Workouts
  app.get("/api/completed-workouts", async (req, res) => {
    try {
      const workouts = await storage.getCompletedWorkouts();
      res.json(workouts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch completed workouts" });
    }
  });

  app.post("/api/completed-workouts", async (req, res) => {
    try {
      const parsed = insertCompletedWorkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const workout = await storage.createCompletedWorkout(parsed.data);
      res.status(201).json(workout);
    } catch (error) {
      res.status(500).json({ error: "Failed to create completed workout" });
    }
  });

  app.delete("/api/completed-workouts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCompletedWorkout(id);
      if (!deleted) {
        return res.status(404).json({ error: "Workout not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete completed workout" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
