import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, seedBuiltInExercises } from "./storage";
import { insertExerciseSchema, insertWorkoutTemplateSchema, insertScheduledWorkoutSchema, insertCompletedWorkoutSchema } from "@shared/schema";
import { registerImageRoutes, openai } from "./replit_integrations/image";
import * as fs from "fs";
import * as path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Database status and manual seed endpoint
  app.get("/api/db-status", async (req, res) => {
    try {
      const exercises = await storage.getExercises();
      res.json({
        status: "connected",
        exerciseCount: exercises.length,
        exercises: exercises.map(e => ({ id: e.id, name: e.name }))
      });
    } catch (error: any) {
      res.status(500).json({
        status: "error",
        error: error.message
      });
    }
  });

  app.post("/api/seed-exercises", async (req, res) => {
    try {
      await seedBuiltInExercises();
      const exercises = await storage.getExercises();
      res.json({
        success: true,
        exerciseCount: exercises.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Migrate base64 images to files - processes one at a time to avoid memory issues
  app.post("/api/migrate-images", async (req, res) => {
    try {
      // Get just the IDs of exercises that have base64 images
      const exercisesWithBase64 = await storage.getExercisesWithBase64Images();
      const imageDir = path.join(process.cwd(), 'attached_assets', 'generated_images');
      
      // Ensure directory exists
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }
      
      let migratedCount = 0;
      
      for (const exercise of exercisesWithBase64) {
        try {
          // Extract base64 data
          const base64Match = exercise.imageUrl?.match(/^data:image\/\w+;base64,(.+)$/);
          if (base64Match) {
            const base64Data = base64Match[1];
            const sanitizedName = exercise.name.replace(/[^a-zA-Z0-9]/g, '_');
            const uniqueId = Math.random().toString(16).slice(2, 10);
            const filename = `${sanitizedName}_${uniqueId}.png`;
            const filePath = path.join(imageDir, filename);
            
            // Write image file
            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
            
            // Update database with file path
            const newImageUrl = `/generated_images/${filename}`;
            await storage.updateExercise(exercise.id, { imageUrl: newImageUrl });
            migratedCount++;
            console.log(`Migrated image for: ${exercise.name}`);
          }
        } catch (err) {
          console.error(`Failed to migrate image for ${exercise.name}:`, err);
        }
      }
      
      res.json({
        success: true,
        migratedCount,
        totalWithBase64: exercisesWithBase64.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Clear base64 images from database and regenerate them as files
  app.post("/api/fix-images", async (req, res) => {
    try {
      // First clear base64 images
      const exercisesWithBase64 = await storage.getExercisesWithBase64Images();
      
      for (const exercise of exercisesWithBase64) {
        await storage.updateExercise(exercise.id, { imageUrl: null });
        console.log(`Cleared base64 image for: ${exercise.name}`);
      }
      
      // Now get all exercises without images and regenerate
      const allExercises = await storage.getExercises();
      const exercisesWithoutImages = allExercises.filter(ex => !ex.imageUrl);
      
      // Start regenerating in background (don't wait)
      const regeneratePromises = exercisesWithoutImages.map(async (exercise, index) => {
        // Stagger requests to avoid rate limits (5 seconds between each)
        await new Promise(resolve => setTimeout(resolve, index * 5000));
        try {
          await generateExerciseImage(exercise.id, exercise.name, exercise.muscleGroups as string[]);
        } catch (err) {
          console.error(`Failed to regenerate image for ${exercise.name}:`, err);
        }
      });
      
      // Don't await - let it run in background
      Promise.all(regeneratePromises).then(() => {
        console.log("All image regeneration complete");
      });
      
      res.json({
        success: true,
        clearedCount: exercisesWithBase64.length,
        regeneratingCount: exercisesWithoutImages.length,
        message: `Cleared ${exercisesWithBase64.length} base64 images. Regenerating ${exercisesWithoutImages.length} images in background.`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Migrate a single exercise image - for manual use
  app.post("/api/migrate-image/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const exercise = await storage.getExerciseWithImage(id);
      
      if (!exercise) {
        return res.status(404).json({ error: "Exercise not found" });
      }
      
      if (!exercise.imageUrl || !exercise.imageUrl.startsWith('data:image')) {
        return res.json({ success: true, message: "No base64 image to migrate" });
      }
      
      const imageDir = path.join(process.cwd(), 'attached_assets', 'generated_images');
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }
      
      const base64Match = exercise.imageUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (base64Match) {
        const base64Data = base64Match[1];
        const sanitizedName = exercise.name.replace(/[^a-zA-Z0-9]/g, '_');
        const uniqueId = Math.random().toString(16).slice(2, 10);
        const filename = `${sanitizedName}_${uniqueId}.png`;
        const filePath = path.join(imageDir, filename);
        
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        
        const newImageUrl = `/generated_images/${filename}`;
        await storage.updateExercise(exercise.id, { imageUrl: newImageUrl });
        
        res.json({ success: true, imageUrl: newImageUrl });
      } else {
        res.json({ success: false, message: "Invalid base64 format" });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

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

  // Background function to generate exercise description using AI
  async function generateExerciseDescription(exerciseId: string, exerciseName: string, muscleGroups: string[]) {
    try {
      const muscleText = muscleGroups.length > 0 ? muscleGroups.join(", ") : "full body";
      
      console.log(`Generating description for exercise: ${exerciseName}`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a fitness expert. Write concise, helpful exercise descriptions for a workout app. Keep descriptions to 1-2 sentences that explain what the exercise targets and basic form tips."
          },
          {
            role: "user",
            content: `Write a brief description for the "${exerciseName}" exercise that targets ${muscleText}.`
          }
        ],
        max_tokens: 150,
      });
      
      const description = response.choices?.[0]?.message?.content?.trim();
      if (description) {
        await storage.updateExercise(exerciseId, { description });
        console.log(`Description generated successfully for: ${exerciseName}`);
      }
    } catch (error) {
      console.error(`Failed to generate description for ${exerciseName}:`, error);
    }
  }

  // Background function to generate exercise image and save to file
  async function generateExerciseImage(exerciseId: string, exerciseName: string, muscleGroups: string[]) {
    try {
      const muscleText = muscleGroups.length > 0 ? muscleGroups.join(", ") : "full body";
      const prompt = `Professional fitness photography of an athletic person demonstrating the "${exerciseName}" exercise, targeting ${muscleText}. Shot in a modern gym or fitness studio setting with warm lighting. The person should be wearing athletic workout clothes. High quality, realistic photo style similar to stock fitness photography. Show proper exercise form and technique. Natural poses, professional composition.`;
      
      console.log(`Generating image for exercise: ${exerciseName}`);
      
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
      });
      
      const b64_json = response.data?.[0]?.b64_json;
      if (b64_json) {
        // Save to file instead of storing base64 in database
        const sanitizedName = exerciseName.replace(/[^a-zA-Z0-9]/g, '_');
        const uniqueId = Math.random().toString(16).slice(2, 10);
        const filename = `${sanitizedName}_${uniqueId}.png`;
        const imageDir = path.join(process.cwd(), 'attached_assets', 'generated_images');
        const filePath = path.join(imageDir, filename);
        
        // Ensure directory exists
        if (!fs.existsSync(imageDir)) {
          fs.mkdirSync(imageDir, { recursive: true });
        }
        
        // Write image file
        fs.writeFileSync(filePath, Buffer.from(b64_json, 'base64'));
        
        // Store file path URL in database
        const imageUrl = `/generated_images/${filename}`;
        await storage.updateExercise(exerciseId, { imageUrl });
        console.log(`Image generated and saved for: ${exerciseName} at ${imageUrl}`);
      }
    } catch (error) {
      console.error(`Failed to generate image for ${exerciseName}:`, error);
    }
  }

  // Background worker to check and generate missing images and descriptions
  let isProcessingExercises = false;
  
  async function checkAndGenerateMissingContent() {
    if (isProcessingExercises) {
      return;
    }
    
    isProcessingExercises = true;
    
    try {
      const allExercises = await storage.getExercises();
      
      // Check for missing descriptions first (faster to generate)
      const exercisesWithoutDescriptions = allExercises.filter(ex => !ex.description || ex.description.trim() === "");
      
      if (exercisesWithoutDescriptions.length > 0) {
        console.log(`Found ${exercisesWithoutDescriptions.length} exercises without descriptions`);
        
        // Process one exercise at a time to respect rate limits
        const exercise = exercisesWithoutDescriptions[0];
        await generateExerciseDescription(
          exercise.id, 
          exercise.name, 
          exercise.muscleGroups as string[]
        );
      }
      
      // Check for missing images
      const exercisesWithoutImages = allExercises.filter(ex => !ex.imageUrl);
      
      if (exercisesWithoutImages.length > 0) {
        console.log(`Found ${exercisesWithoutImages.length} exercises without images`);
        
        // Process one exercise at a time to respect rate limits
        const exercise = exercisesWithoutImages[0];
        
        // Double-check the exercise still needs an image
        const currentExercise = allExercises.find(ex => ex.id === exercise.id);
        if (currentExercise && !currentExercise.imageUrl) {
          await generateExerciseImage(
            exercise.id, 
            exercise.name, 
            exercise.muscleGroups as string[]
          );
        }
      }
    } catch (error) {
      console.error("Error in background content worker:", error);
    } finally {
      isProcessingExercises = false;
    }
  }
  
  // Start periodic check once a day (24 hours in milliseconds)
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const contentCheckInterval = setInterval(checkAndGenerateMissingContent, ONE_DAY_MS);
  
  // Run initial check after 5 seconds
  setTimeout(checkAndGenerateMissingContent, 5000);

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

  app.post("/api/exercises/:id/regenerate-image", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, muscleGroups } = req.body;
      
      // First check if it exists in database
      const exercises = await storage.getExercises();
      let exercise = exercises.find(ex => ex.id === id);
      
      // If not in database but we have the data from request, create it with the specified ID
      if (!exercise && name && muscleGroups) {
        exercise = await storage.createExerciseWithId(id, {
          name,
          muscleGroups,
          description: req.body.description || "",
          exerciseType: req.body.exerciseType || "weight_reps",
        });
      }
      
      if (!exercise) {
        return res.status(404).json({ error: "Exercise not found" });
      }
      
      res.json({ message: "Image regeneration started" });
      
      generateExerciseImage(exercise.id, exercise.name, exercise.muscleGroups as string[]).catch(err => {
        console.error("Image regeneration failed:", err);
      });
    } catch (error) {
      console.error("Error regenerating image:", error);
      res.status(500).json({ error: "Failed to regenerate image" });
    }
  });

  // Workout Templates
  app.get("/api/workout-templates", async (req, res) => {
    try {
      const templates = await storage.getWorkoutTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workout templates" });
    }
  });

  app.post("/api/workout-templates", async (req, res) => {
    try {
      const parsed = insertWorkoutTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("Workout template validation error:", parsed.error.message);
        return res.status(400).json({ error: parsed.error.message });
      }
      const template = await storage.createWorkoutTemplate(parsed.data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Failed to create workout template:", error);
      res.status(500).json({ error: "Failed to create workout template" });
    }
  });

  app.put("/api/workout-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = insertWorkoutTemplateSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const template = await storage.updateWorkoutTemplate(id, parsed.data);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update workout template" });
    }
  });

  app.delete("/api/workout-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteWorkoutTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete workout template" });
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
