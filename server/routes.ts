import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertExerciseSchema, insertScheduledWorkoutSchema, insertCompletedWorkoutSchema } from "@shared/schema";
import { registerImageRoutes, openai } from "./replit_integrations/image";

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
      
      if (!exercise) {
        console.error("Error creating exercise: no exercise returned from storage");
        return res.status(500).json({ error: "Failed to create exercise" });
      }
      
      res.status(201).json(exercise);
      
      // Generate image in background after responding
      if (!exercise.imageUrl) {
        generateExerciseImage(exercise.id, exercise.name, exercise.muscleGroups as string[]).catch(err => {
          console.error("Background image generation failed:", err);
        });
      }
    } catch (error) {
      console.error("Error creating exercise:", error);
      res.status(500).json({ error: "Failed to create exercise" });
    }
  });

  // Background function to generate exercise image
  async function generateExerciseImage(exerciseId: string, exerciseName: string, muscleGroups: string[]) {
    try {
      const muscleText = muscleGroups.length > 0 ? muscleGroups.join(", ") : "full body";
      const prompt = `A professional fitness illustration of a person demonstrating the "${exerciseName}" exercise targeting ${muscleText}. Clean, modern, minimalist style with a white background. Athletic figure in proper form. No text or labels.`;
      
      console.log(`Generating image for exercise: ${exerciseName}`);
      
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "512x512",
      });
      
      const b64_json = response.data?.[0]?.b64_json;
      if (b64_json) {
        const imageUrl = `data:image/png;base64,${b64_json}`;
        await storage.updateExercise(exerciseId, { imageUrl });
        console.log(`Image generated successfully for: ${exerciseName}`);
      }
    } catch (error) {
      console.error(`Failed to generate image for ${exerciseName}:`, error);
    }
  }

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
      const body = {
        ...req.body,
        date: new Date(req.body.date),
      };
      const parsed = insertScheduledWorkoutSchema.safeParse(body);
      if (!parsed.success) {
        console.error("Scheduled workout validation error:", parsed.error.message);
        return res.status(400).json({ error: parsed.error.message });
      }
      const workout = await storage.createScheduledWorkout(parsed.data);
      res.status(201).json(workout);
    } catch (error) {
      console.error("Failed to create scheduled workout:", error);
      res.status(500).json({ error: "Failed to create scheduled workout" });
    }
  });

  app.put("/api/scheduled-workouts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const body = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      };
      const parsed = insertScheduledWorkoutSchema.partial().safeParse(body);
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

  // Register image generation routes
  registerImageRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
