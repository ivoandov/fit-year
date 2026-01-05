import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, seedBuiltInExercises } from "./storage";
import { insertExerciseSchema, insertWorkoutTemplateSchema, insertScheduledWorkoutSchema, insertCompletedWorkoutSchema } from "@shared/schema";
import { registerImageRoutes, openai } from "./replit_integrations/image";
import { registerObjectStorageRoutes, ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { createCalendarEvent, deleteCalendarEvent, listCalendars } from "./replit_integrations/google-calendar";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const objectStorageService = new ObjectStorageService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication first (before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
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

  // Migrate local images to object storage
  app.post("/api/migrate-to-object-storage", async (req, res) => {
    try {
      const imageDir = path.join(process.cwd(), 'attached_assets', 'generated_images');
      
      if (!fs.existsSync(imageDir)) {
        return res.json({ success: true, migratedCount: 0, message: "No local images directory" });
      }
      
      const files = fs.readdirSync(imageDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
      let migratedCount = 0;
      const errors: string[] = [];
      
      const publicSearchPaths = objectStorageService.getPublicObjectSearchPaths();
      const publicDir = publicSearchPaths[0];
      
      for (const filename of files) {
        try {
          const filePath = path.join(imageDir, filename);
          const fileBuffer = fs.readFileSync(filePath);
          
          const { bucketName, objectName } = parseObjectPath(`${publicDir}/exercises/${filename}`);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          
          await file.save(fileBuffer, {
            contentType: 'image/png',
            metadata: {
              'custom:aclPolicy': JSON.stringify({ owner: 'system', visibility: 'public' })
            }
          });
          
          migratedCount++;
          console.log(`Migrated to object storage: ${filename}`);
        } catch (err: any) {
          errors.push(`${filename}: ${err.message}`);
          console.error(`Failed to migrate ${filename}:`, err);
        }
      }
      
      res.json({
        success: true,
        migratedCount,
        totalFiles: files.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Compress all existing exercise images in object storage
  app.post("/api/compress-exercise-images", async (req, res) => {
    try {
      const exercises = await storage.getExercises();
      const exercisesWithImages = exercises.filter(ex => ex.imageUrl?.startsWith('/objects/public/exercises/'));
      
      let compressedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      
      const publicSearchPaths = objectStorageService.getPublicObjectSearchPaths();
      const publicDir = publicSearchPaths[0];
      
      for (const exercise of exercisesWithImages) {
        try {
          const oldFilename = exercise.imageUrl!.replace('/objects/public/exercises/', '');
          
          // Skip if already compressed (has .jpg extension)
          if (oldFilename.endsWith('.jpg')) {
            skippedCount++;
            continue;
          }
          
          // Find and download the original file
          const file = await objectStorageService.searchPublicObject(`exercises/${oldFilename}`);
          if (!file) {
            errors.push(`${exercise.name}: File not found`);
            continue;
          }
          
          // Download the file content
          const [fileContents] = await file.download();
          
          // Compress the image
          const compressedBuffer = await sharp(fileContents)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80, progressive: true })
            .toBuffer();
          
          // Create new filename with .jpg extension
          const baseName = oldFilename.replace(/\.(png|PNG)$/, '');
          const newFilename = `${baseName}.jpg`;
          
          // Upload compressed image
          const { bucketName, objectName } = parseObjectPath(`${publicDir}/exercises/${newFilename}`);
          const bucket = objectStorageClient.bucket(bucketName);
          const newFile = bucket.file(objectName);
          
          await newFile.save(compressedBuffer, {
            contentType: 'image/jpeg',
            metadata: {
              'custom:aclPolicy': JSON.stringify({ owner: 'system', visibility: 'public' })
            }
          });
          
          // Update database with new path
          const newImageUrl = `/objects/public/exercises/${newFilename}`;
          await storage.updateExercise(exercise.id, { imageUrl: newImageUrl });
          
          const originalSize = (fileContents.length / 1024).toFixed(1);
          const compressedSize = (compressedBuffer.length / 1024).toFixed(1);
          console.log(`Compressed ${exercise.name}: ${originalSize}KB -> ${compressedSize}KB`);
          
          compressedCount++;
        } catch (err: any) {
          errors.push(`${exercise.name}: ${err.message}`);
          console.error(`Failed to compress ${exercise.name}:`, err);
        }
      }
      
      res.json({
        success: true,
        compressedCount,
        skippedCount,
        totalImages: exercisesWithImages.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Helper function for compression endpoint
  function parseObjectPath(pathStr: string): { bucketName: string; objectName: string } {
    if (!pathStr.startsWith("/")) {
      pathStr = `/${pathStr}`;
    }
    const pathParts = pathStr.split("/");
    if (pathParts.length < 3) {
      throw new Error("Invalid path: must contain at least a bucket name");
    }
    const bucketName = pathParts[1];
    const objectName = pathParts.slice(2).join("/");
    return { bucketName, objectName };
  }

  // Exercises
  app.get("/api/exercises", async (req, res) => {
    try {
      const exerciseList = await storage.getExercises();
      
      // Convert object storage paths to signed URLs for direct browser access
      // Also verify files exist before returning signed URLs
      const exercisesWithSignedUrls = await Promise.all(
        exerciseList.map(async (exercise) => {
          if (exercise.imageUrl?.startsWith('/objects/public/exercises/')) {
            const filename = exercise.imageUrl.replace('/objects/public/exercises/', '');
            try {
              // First check if file actually exists in object storage
              const file = await objectStorageService.searchPublicObject(`exercises/${filename}`);
              if (file) {
                const signedUrl = await objectStorageService.getSignedUrlForPublicObject(`exercises/${filename}`, 3600);
                if (signedUrl) {
                  return { ...exercise, imageUrl: signedUrl };
                }
              } else {
                // File doesn't exist in object storage - return without imageUrl
                console.warn(`Image not found in object storage for ${exercise.name}: ${filename}`);
                return { ...exercise, imageUrl: undefined };
              }
            } catch (err) {
              console.error(`Failed to get signed URL for ${exercise.name}:`, err);
            }
          }
          return exercise;
        })
      );
      
      res.json(exercisesWithSignedUrls);
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

  // Compress image for web using sharp
  async function compressImageForWeb(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Resize to max 800x800 and compress as JPEG with 80% quality
      // This typically reduces file size from ~1.5MB to ~50-100KB
      const compressedBuffer = await sharp(imageBuffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 80,
          progressive: true
        })
        .toBuffer();
      
      const originalSize = (imageBuffer.length / 1024).toFixed(1);
      const compressedSize = (compressedBuffer.length / 1024).toFixed(1);
      console.log(`Image compressed: ${originalSize}KB -> ${compressedSize}KB (${((1 - compressedBuffer.length / imageBuffer.length) * 100).toFixed(1)}% reduction)`);
      
      return compressedBuffer;
    } catch (error) {
      console.error('Image compression failed, using original:', error);
      return imageBuffer;
    }
  }

  // Background function to generate exercise image and save to object storage
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
        const sanitizedName = exerciseName.replace(/[^a-zA-Z0-9]/g, '_');
        const uniqueId = Math.random().toString(16).slice(2, 10);
        const filename = `${sanitizedName}_${uniqueId}.jpg`; // Changed to .jpg for compressed images
        
        // Compress image before saving
        const originalBuffer = Buffer.from(b64_json, 'base64');
        const compressedBuffer = await compressImageForWeb(originalBuffer);
        
        // Upload to object storage
        try {
          const publicSearchPaths = objectStorageService.getPublicObjectSearchPaths();
          const publicDir = publicSearchPaths[0]; // Use first public path
          const { bucketName, objectName } = parseObjectPath(`${publicDir}/exercises/${filename}`);
          
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          
          await file.save(compressedBuffer, {
            contentType: 'image/jpeg',
            metadata: {
              'custom:aclPolicy': JSON.stringify({ owner: 'system', visibility: 'public' })
            }
          });
          
          // Store object storage path in database
          const imageUrl = `/objects/public/exercises/${filename}`;
          await storage.updateExercise(exerciseId, { imageUrl });
          console.log(`Image generated and saved to object storage for: ${exerciseName} at ${imageUrl}`);
        } catch (storageError) {
          console.error(`Object storage upload failed, falling back to local file:`, storageError);
          
          // Fallback to local file storage
          const imageDir = path.join(process.cwd(), 'attached_assets', 'generated_images');
          const filePath = path.join(imageDir, filename);
          
          if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
          }
          
          fs.writeFileSync(filePath, compressedBuffer);
          const imageUrl = `/generated_images/${filename}`;
          await storage.updateExercise(exerciseId, { imageUrl });
          console.log(`Image generated and saved locally for: ${exerciseName} at ${imageUrl}`);
        }
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

  // Workout Templates (requires authentication)
  app.get("/api/workout-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const templates = await storage.getWorkoutTemplates(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workout templates" });
    }
  });

  app.post("/api/workout-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const parsed = insertWorkoutTemplateSchema.safeParse({ ...req.body, userId });
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

  app.put("/api/workout-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      
      // Verify ownership before updating
      const existing = await storage.getWorkoutTemplate(id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const parsed = insertWorkoutTemplateSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const template = await storage.updateWorkoutTemplate(id, parsed.data);
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update workout template" });
    }
  });

  app.delete("/api/workout-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      
      // Verify ownership before deleting
      const existing = await storage.getWorkoutTemplate(id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deleteWorkoutTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete workout template" });
    }
  });

  // Scheduled Workouts (requires authentication)
  app.get("/api/scheduled-workouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const workouts = await storage.getScheduledWorkouts(userId);
      res.json(workouts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheduled workouts" });
    }
  });

  app.post("/api/scheduled-workouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const body = {
        ...req.body,
        userId,
        date: new Date(req.body.date),
      };
      const parsed = insertScheduledWorkoutSchema.safeParse(body);
      if (!parsed.success) {
        console.error("Scheduled workout validation error:", parsed.error.message);
        return res.status(400).json({ error: parsed.error.message });
      }
      const workout = await storage.createScheduledWorkout(parsed.data);
      
      // Get user's selected calendar and create "(Scheduled)" event
      const userSettings = await storage.getUserSettings(userId);
      const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
      const scheduledEventName = `${workout.name} (Scheduled)`;
      
      createCalendarEvent(scheduledEventName, workout.date, selectedCalendarId)
        .then(async (eventId) => {
          if (eventId) {
            await storage.updateScheduledWorkoutCalendarEventId(workout.id, eventId);
            console.log(`Created scheduled workout calendar event "${scheduledEventName}": ${eventId}`);
          }
        })
        .catch((err) => {
          console.error("Failed to create scheduled workout calendar event:", err);
        });
      
      res.status(201).json(workout);
    } catch (error) {
      console.error("Failed to create scheduled workout:", error);
      res.status(500).json({ error: "Failed to create scheduled workout" });
    }
  });

  app.put("/api/scheduled-workouts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      
      // Verify ownership before updating
      const existing = await storage.getScheduledWorkout(id);
      if (!existing) {
        return res.status(404).json({ error: "Workout not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const body = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      };
      const parsed = insertScheduledWorkoutSchema.partial().safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const workout = await storage.updateScheduledWorkout(id, parsed.data);
      res.json(workout);
    } catch (error) {
      res.status(500).json({ error: "Failed to update scheduled workout" });
    }
  });

  app.delete("/api/scheduled-workouts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      
      // Verify ownership before deleting
      const existing = await storage.getScheduledWorkout(id);
      if (!existing) {
        return res.status(404).json({ error: "Workout not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Delete the calendar event if one exists
      if (existing.calendarEventId) {
        const userSettings = await storage.getUserSettings(userId);
        const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
        deleteCalendarEvent(existing.calendarEventId, selectedCalendarId)
          .then((deleted) => {
            if (deleted) {
              console.log(`Deleted scheduled calendar event: ${existing.calendarEventId}`);
            }
          })
          .catch((err) => {
            console.error("Failed to delete scheduled calendar event:", err);
          });
      }
      
      const deleted = await storage.deleteScheduledWorkout(id);
      if (!deleted) {
        return res.status(404).json({ error: "Workout not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete scheduled workout" });
    }
  });

  // Completed Workouts (requires authentication)
  app.get("/api/completed-workouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const workouts = await storage.getCompletedWorkouts(userId);
      res.json(workouts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch completed workouts" });
    }
  });

  app.post("/api/completed-workouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { displayId, name, exercises, completedAt, localDate, scheduledWorkoutId } = req.body;
      
      if (!displayId || !name || !exercises) {
        return res.status(400).json({ error: "Missing required fields: displayId, name, exercises" });
      }
      
      const completedDate = completedAt ? new Date(completedAt) : new Date();
      const workout = await storage.createCompletedWorkout({
        userId,
        displayId,
        name,
        exercises,
        completedAt: completedDate,
      });
      
      // Get user's selected calendar for syncing
      const userSettings = await storage.getUserSettings(userId);
      const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
      
      // If this was from a scheduled workout, delete the "(Scheduled)" calendar event
      if (scheduledWorkoutId) {
        const scheduledWorkout = await storage.getScheduledWorkout(scheduledWorkoutId);
        if (scheduledWorkout?.calendarEventId) {
          deleteCalendarEvent(scheduledWorkout.calendarEventId, selectedCalendarId)
            .then((deleted) => {
              if (deleted) {
                console.log(`Deleted scheduled calendar event: ${scheduledWorkout.calendarEventId}`);
              }
            })
            .catch((err) => {
              console.error("Failed to delete scheduled calendar event:", err);
            });
        }
      }
      
      // Sync completed workout to Google Calendar using the user's local date
      createCalendarEvent(name, completedDate, selectedCalendarId, localDate)
        .then(async (eventId) => {
          if (eventId) {
            await storage.updateCompletedWorkoutCalendarEventId(workout.id, eventId);
            console.log(`Synced completed workout "${name}" to Google Calendar (${selectedCalendarId || 'primary'}): ${eventId}`);
          }
        })
        .catch((err) => {
          console.error("Failed to sync to Google Calendar:", err);
        });
      
      res.status(201).json(workout);
    } catch (error) {
      console.error("Failed to create completed workout:", error);
      res.status(500).json({ error: "Failed to create completed workout" });
    }
  });

  app.put("/api/completed-workouts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const { name, exercises } = req.body;
      
      const existing = await storage.getCompletedWorkout(id);
      if (!existing) {
        return res.status(404).json({ error: "Workout not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updated = await storage.updateCompletedWorkout(id, { name, exercises });
      res.json(updated);
    } catch (error) {
      console.error("Failed to update completed workout:", error);
      res.status(500).json({ error: "Failed to update completed workout" });
    }
  });

  app.delete("/api/completed-workouts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      
      // Get the workout to check for ownership and calendar event
      const workout = await storage.getCompletedWorkout(id);
      if (!workout) {
        return res.status(404).json({ error: "Workout not found" });
      }
      
      // Verify ownership before deleting
      if (workout.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get user's selected calendar for deleting events
      const userSettings = await storage.getUserSettings(userId);
      const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
      
      // Delete from Google Calendar if linked
      if (workout.calendarEventId) {
        deleteCalendarEvent(workout.calendarEventId, selectedCalendarId).catch((err) => {
          console.error("Failed to delete calendar event:", err);
        });
      }
      
      const deleted = await storage.deleteCompletedWorkout(id);
      if (!deleted) {
        return res.status(404).json({ error: "Workout not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete completed workout" });
    }
  });

  // Google Calendar list endpoint
  app.get("/api/calendars", isAuthenticated, async (req: any, res) => {
    try {
      const calendars = await listCalendars();
      res.json(calendars);
    } catch (error: any) {
      console.error("Failed to list calendars:", error);
      if (error.message?.includes('Google Calendar not connected')) {
        return res.status(401).json({ error: "Google Calendar not connected" });
      }
      res.status(500).json({ error: "Failed to list calendars" });
    }
  });

  // User settings endpoints
  app.get("/api/user-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const settings = await storage.getUserSettings(userId);
      res.json(settings || { userId, selectedCalendarId: null, selectedCalendarName: null });
    } catch (error) {
      console.error("Failed to get user settings:", error);
      res.status(500).json({ error: "Failed to get user settings" });
    }
  });

  app.patch("/api/user-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { selectedCalendarId, selectedCalendarName } = req.body;
      
      const settings = await storage.upsertUserSettings(userId, {
        selectedCalendarId,
        selectedCalendarName,
      });
      
      res.json(settings);
    } catch (error) {
      console.error("Failed to update user settings:", error);
      res.status(500).json({ error: "Failed to update user settings" });
    }
  });

  // Register image generation routes
  registerImageRoutes(app);

  // Register object storage routes
  registerObjectStorageRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
