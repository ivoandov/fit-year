import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, seedBuiltInExercises } from "./storage";
import { insertExerciseSchema, insertWorkoutTemplateSchema, insertScheduledWorkoutSchema, insertCompletedWorkoutSchema, hasCustomMuscleGroup } from "@shared/schema";
import { registerImageRoutes, openai } from "./replit_integrations/image";
import { registerObjectStorageRoutes, ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { 
  getCalendarAuthUrl, 
  handleCalendarCallback, 
  listUserCalendars, 
  createUserCalendarEvent, 
  deleteUserCalendarEvent,
  updateUserCalendarEvent,
  checkCalendarEventExists 
} from "./replit_integrations/google-calendar/user-calendar";
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

  // Backfill templateId for existing scheduled and completed workouts
  app.post("/api/migrate-template-ids", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      // Get all workout templates for this user
      const templates = await storage.getWorkoutTemplates(userId);
      const templateMap = new Map<string, string>();
      templates.forEach(t => {
        if (t.name) {
          templateMap.set(t.name.toLowerCase().trim(), t.id);
        }
      });

      // Get scheduled workouts without templateId
      const scheduledWorkouts = await storage.getScheduledWorkouts(userId);
      let scheduledUpdated = 0;
      for (const sw of scheduledWorkouts) {
        if (!sw.templateId && sw.name) {
          const matchedTemplateId = templateMap.get(sw.name.toLowerCase().trim());
          if (matchedTemplateId) {
            await storage.updateScheduledWorkout(sw.id, { templateId: matchedTemplateId });
            scheduledUpdated++;
          }
        }
      }

      // Get completed workouts without templateId
      const completedWorkouts = await storage.getCompletedWorkouts(userId);
      let completedUpdated = 0;
      for (const cw of completedWorkouts) {
        if (!cw.templateId && cw.name) {
          const matchedTemplateId = templateMap.get(cw.name.toLowerCase().trim());
          if (matchedTemplateId) {
            await storage.updateCompletedWorkout(cw.id, { templateId: matchedTemplateId });
            completedUpdated++;
          }
        }
      }

      res.json({
        success: true,
        scheduledUpdated,
        completedUpdated,
        message: `Updated ${scheduledUpdated} scheduled workouts and ${completedUpdated} completed workouts`
      });
    } catch (error: any) {
      console.error("Template ID migration error:", error);
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
      const userId = (req.user as any)?.id;
      const exerciseList = await storage.getExercises(userId);
      
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

  app.post("/api/exercises", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertExerciseSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("Validation error:", parsed.error.message);
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const muscleGroups = parsed.data.muscleGroups as string[] || [];
      
      // All user-created exercises get userId set for ownership
      // isPublic = false if using custom muscle groups (private to user)
      // isPublic = true if using only default muscle groups (visible to all)
      const isPublic = !hasCustomMuscleGroup(muscleGroups);
      
      const exercise = await storage.createExercise({
        ...parsed.data,
        userId: userId,
        isPublic: isPublic,
      });
      
      if (!exercise) {
        console.error("Error creating exercise: no exercise returned from storage");
        return res.status(500).json({ error: "Failed to create exercise" });
      }
      
      res.status(201).json(exercise);
      
      if (!exercise.imageUrl) {
        generateExerciseImage(exercise.id, exercise.name, exercise.muscleGroups as string[], userId).catch(err => {
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

  const userGenderToggle = new Map<string, boolean>();

  function getNextGender(userId: string): string {
    const useMale = userGenderToggle.get(userId) ?? true;
    userGenderToggle.set(userId, !useMale);
    return useMale ? "male" : "female";
  }

  async function generateExerciseImage(exerciseId: string, exerciseName: string, muscleGroups: string[], userId?: string) {
    try {
      const muscleText = muscleGroups.length > 0 ? muscleGroups.join(", ") : "full body";
      const gender = getNextGender(userId || "system");
      const prompt = `Professional fitness photography of an athletic ${gender} person demonstrating the "${exerciseName}" exercise, targeting ${muscleText}. Shot in a modern gym or fitness studio setting with warm lighting. The person should be wearing athletic workout clothes. High quality, realistic photo style similar to stock fitness photography. Show proper exercise form and technique. Natural poses, professional composition.`;
      
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
            exercise.muscleGroups as string[],
            undefined
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

  app.put("/api/exercises/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Check if exercise exists and user has permission to edit
      const existingExercise = await storage.getExerciseWithImage(id);
      if (existingExercise) {
        // Can only edit user's own exercises or global exercises (not other users' exercises)
        if (existingExercise.userId !== null && existingExercise.userId !== userId) {
          return res.status(403).json({ error: "Not authorized to edit this exercise" });
        }
      }
      
      const parsed = insertExerciseSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        console.error("Validation error:", parsed.error.message);
        return res.status(400).json({ error: parsed.error.message });
      }
      
      // If muscleGroups are being updated, recalculate isPublic
      let updateData = { ...parsed.data };
      if (parsed.data.muscleGroups !== undefined) {
        const muscleGroups = parsed.data.muscleGroups as string[] || [];
        updateData.isPublic = !hasCustomMuscleGroup(muscleGroups);
      }
      
      let exercise = await storage.updateExercise(id, updateData);
      if (!exercise) {
        const fullParsed = insertExerciseSchema.safeParse(req.body);
        if (!fullParsed.success) {
          return res.status(400).json({ error: "Full exercise data required for new exercise" });
        }
        
        // All user-created exercises get userId set for ownership
        const muscleGroups = fullParsed.data.muscleGroups as string[] || [];
        const isPublic = !hasCustomMuscleGroup(muscleGroups);
        
        exercise = await storage.createExercise({
          ...fullParsed.data,
          userId: userId,
          isPublic: isPublic,
        });
      }
      res.json(exercise);
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(500).json({ error: "Failed to update exercise" });
    }
  });

  app.delete("/api/exercises/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Check if exercise exists and user has permission to delete
      const existingExercise = await storage.getExerciseWithImage(id);
      if (!existingExercise) {
        return res.status(404).json({ error: "Exercise not found" });
      }
      
      // Can only delete user's own exercises, not global ones
      if (existingExercise.userId !== null && existingExercise.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this exercise" });
      }
      if (existingExercise.userId === null) {
        return res.status(403).json({ error: "Cannot delete global exercises" });
      }
      
      const deleted = await storage.deleteExercise(id);
      if (!deleted) {
        return res.status(404).json({ error: "Exercise not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete exercise" });
    }
  });

  app.post("/api/exercises/:id/regenerate-image", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Check if exercise exists
      const exercise = await storage.getExerciseWithImage(id);
      
      if (!exercise) {
        return res.status(404).json({ error: "Exercise not found" });
      }
      
      // Can only regenerate image for user's own exercises or global built-in exercises
      if (exercise.userId !== null && exercise.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to regenerate image for this exercise" });
      }
      
      res.json({ message: "Image regeneration started" });
      
      generateExerciseImage(exercise.id, exercise.name, exercise.muscleGroups as string[], userId).catch(err => {
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
      const userId = (req.user as any)?.id;
      const templates = await storage.getWorkoutTemplates(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workout templates" });
    }
  });

  app.post("/api/workout-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
      
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

  app.post("/api/workout-templates/:id/update-future-scheduled", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;
      
      const template = await storage.getWorkoutTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (template.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updatedCount = await storage.updateFutureScheduledWorkoutsByTemplate(
        id,
        template.name,
        template.exercises
      );
      
      res.json({ updatedCount });
    } catch (error) {
      res.status(500).json({ error: "Failed to update future scheduled workouts" });
    }
  });

  app.get("/api/workout-templates/routine-usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const templateRoutineMap = await storage.getTemplateRoutineMap(userId);
      res.json(templateRoutineMap);
    } catch (error) {
      res.status(500).json({ error: "Failed to get routine usage" });
    }
  });

  app.delete("/api/workout-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;
      
      // Verify ownership before deleting
      const existing = await storage.getWorkoutTemplate(id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const routinesUsingTemplate = await storage.getRoutinesUsingTemplate(id, userId);
      if (routinesUsingTemplate.length > 0) {
        const routineNames = routinesUsingTemplate.map(r => r.name).join(", ");
        return res.status(409).json({
          error: "template_in_use",
          message: `This workout is used by the following routines: ${routineNames}. Remove it from those routines first before deleting.`,
          routineNames: routinesUsingTemplate.map(r => r.name),
        });
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

  app.get("/api/workout-templates/:id/history", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;
      
      const template = await storage.getWorkoutTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // Get all completed workouts that came from this template
      const completedWorkouts = await storage.getCompletedWorkoutsByTemplateId(id, userId);
      
      res.json({
        templateId: id,
        templateName: template.name,
        completionCount: completedWorkouts.length,
        completions: completedWorkouts,
      });
    } catch (error) {
      console.error("Failed to fetch template history:", error);
      res.status(500).json({ error: "Failed to fetch template history" });
    }
  });

  // Scheduled Workouts (requires authentication)
  app.get("/api/scheduled-workouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      
      // Auto-reschedule orphaned routine workouts
      // Check if any active routine has remaining workouts but no scheduled entries
      try {
        const activeInstances = await storage.getActiveRoutineInstances(userId);
        if (activeInstances.length > 0) {
          const allScheduled = await storage.getScheduledWorkouts(userId);
          
          for (const instance of activeInstances) {
            const remaining = instance.totalWorkouts - (instance.completedWorkouts || 0) - (instance.skippedWorkouts || 0);
            if (remaining <= 0) continue;
            
            const routineScheduled = allScheduled.filter(w => w.routineInstanceId === instance.id);
            if (routineScheduled.length > 0) continue;
            
            console.log(`[Auto-Reschedule] Routine "${instance.routineName}" has ${remaining} remaining workouts but no scheduled entries. Rescheduling...`);
            
            const entries = await storage.getRoutineEntries(instance.routineId);
            if (!entries || entries.length === 0) continue;
            
            // Determine which entries still need to be scheduled
            // Routine progresses sequentially, so the last N entries (where N = remaining) are outstanding
            const sortedEntries = entries
              .filter(e => e.workoutName)
              .sort((a, b) => a.dayIndex - b.dayIndex);
            
            const processed = (instance.completedWorkouts || 0) + (instance.skippedWorkouts || 0);
            const entriesToSchedule = sortedEntries.slice(processed, processed + remaining);
            
            if (entriesToSchedule.length === 0) continue;
            
            // Schedule them starting from today, respecting original cadence spacing
            const today = new Date();
            let dayOffset = 0;
            for (let i = 0; i < entriesToSchedule.length; i++) {
              const entry = entriesToSchedule[i];
              // Use spacing between routine day indices for cadence
              if (i > 0) {
                const gap = entriesToSchedule[i].dayIndex - entriesToSchedule[i - 1].dayIndex;
                dayOffset += Math.max(gap, 1);
              }
              const workoutDate = new Date(today);
              workoutDate.setDate(today.getDate() + dayOffset);
              const localDate = `${workoutDate.getFullYear()}-${String(workoutDate.getMonth() + 1).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(2, '0')}`;
              const noonDate = new Date(localDate + 'T12:00:00Z');
              
              // Check no existing workout on that date to avoid conflicts
              const dateStr = noonDate.toISOString().split('T')[0];
              const hasConflict = allScheduled.some(w => {
                const existingDate = new Date(w.date).toISOString().split('T')[0];
                return existingDate === dateStr;
              });
              if (hasConflict) {
                dayOffset++;
                const adjustedDate = new Date(today);
                adjustedDate.setDate(today.getDate() + dayOffset);
                const adjLocalDate = `${adjustedDate.getFullYear()}-${String(adjustedDate.getMonth() + 1).padStart(2, '0')}-${String(adjustedDate.getDate()).padStart(2, '0')}`;
                const adjNoonDate = new Date(adjLocalDate + 'T12:00:00Z');
                
                await storage.createScheduledWorkoutWithRoutine({
                  userId,
                  name: entry.workoutName || `Day ${entry.dayIndex}`,
                  date: adjNoonDate,
                  exercises: entry.exercises || [],
                  templateId: entry.workoutTemplateId || null,
                  routineInstanceId: instance.id,
                  routineDayIndex: entry.dayIndex,
                });
                console.log(`[Auto-Reschedule] Created "${entry.workoutName}" for ${adjLocalDate} (shifted to avoid conflict)`);
              } else {
                await storage.createScheduledWorkoutWithRoutine({
                  userId,
                  name: entry.workoutName || `Day ${entry.dayIndex}`,
                  date: noonDate,
                  exercises: entry.exercises || [],
                  templateId: entry.workoutTemplateId || null,
                  routineInstanceId: instance.id,
                  routineDayIndex: entry.dayIndex,
                });
                console.log(`[Auto-Reschedule] Created "${entry.workoutName}" for ${localDate}`);
              }
            }
          }
        }
      } catch (rescheduleError) {
        console.error("[Auto-Reschedule] Error during auto-reschedule:", rescheduleError);
      }
      
      const workouts = await storage.getScheduledWorkouts(userId);
      res.json(workouts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheduled workouts" });
    }
  });

  app.post("/api/scheduled-workouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { localDate, ...restBody } = req.body;
      
      // Use localDate if provided for timezone-safe date storage (noon UTC)
      let dateValue = new Date(req.body.date);
      if (localDate && typeof localDate === 'string') {
        dateValue = new Date(localDate + 'T12:00:00Z');
      }
      
      const body = {
        ...restBody,
        userId,
        date: dateValue,
      };
      const parsed = insertScheduledWorkoutSchema.safeParse(body);
      if (!parsed.success) {
        console.error("Scheduled workout validation error:", parsed.error.message);
        return res.status(400).json({ error: parsed.error.message });
      }
      const workout = await storage.createScheduledWorkout(parsed.data);
      
      // Create calendar event if user has connected their calendar
      const isConnected = await storage.isCalendarConnected(userId);
      if (isConnected) {
        const userSettings = await storage.getUserSettings(userId);
        const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
        const scheduledEventName = `${workout.name} (Scheduled)`;
        
        createUserCalendarEvent(userId, scheduledEventName, workout.date, selectedCalendarId, localDate)
          .then(async (eventId) => {
            if (eventId) {
              await storage.updateScheduledWorkoutCalendarEventId(workout.id, eventId);
              console.log(`Created scheduled workout calendar event "${scheduledEventName}": ${eventId}`);
            }
          })
          .catch((err) => {
            console.error("Failed to create scheduled workout calendar event:", err);
          });
      }
      
      res.status(201).json(workout);
    } catch (error) {
      console.error("Failed to create scheduled workout:", error);
      res.status(500).json({ error: "Failed to create scheduled workout" });
    }
  });

  app.put("/api/scheduled-workouts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;
      
      // Verify ownership before updating
      const existing = await storage.getScheduledWorkout(id);
      if (!existing) {
        return res.status(404).json({ error: "Workout not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Use localDate if provided for timezone-safe date storage
      const { localDate, ...restBody } = req.body;
      let dateValue = req.body.date ? new Date(req.body.date) : undefined;
      
      // If localDate is provided, use it to create a date at noon UTC to avoid timezone issues
      if (localDate && typeof localDate === 'string') {
        dateValue = new Date(localDate + 'T12:00:00Z');
      }
      
      const body = {
        ...restBody,
        date: dateValue,
      };
      const parsed = insertScheduledWorkoutSchema.partial().safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      // If name is being changed, update all related workouts (by routine or template)
      if (parsed.data.name && parsed.data.name !== existing.name) {
        if (existing.routineInstanceId) {
          await storage.updateScheduledWorkoutsByRoutineInstanceAndName(
            existing.routineInstanceId,
            existing.name,
            parsed.data.name
          );
        } else if (existing.templateId) {
          await storage.updateScheduledWorkoutsByTemplateAndName(
            existing.templateId,
            existing.name,
            parsed.data.name
          );
        }
      }
      
      const workout = await storage.updateScheduledWorkout(id, parsed.data);
      
      // Update calendar event if date actually changed and event exists
      const existingDateStr = existing.date.toISOString().split('T')[0];
      const newDateStr = dateValue ? dateValue.toISOString().split('T')[0] : null;
      const dateChanged = newDateStr && newDateStr !== existingDateStr;
      
      // Handle calendar sync when date changes
      if (dateValue) {
        const isConnected = await storage.isCalendarConnected(userId);
        if (isConnected) {
          const userSettings = await storage.getUserSettings(userId);
          const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
          
          if (existing.calendarEventId) {
            // Update existing calendar event if date changed
            if (dateChanged) {
              updateUserCalendarEvent(userId, existing.calendarEventId, dateValue, selectedCalendarId, localDate)
                .then((updated) => {
                  if (updated) {
                    console.log(`Updated calendar event date: ${existing.calendarEventId}`);
                  }
                })
                .catch((err) => {
                  console.error("Failed to update calendar event date:", err);
                });
            }
          } else {
            // Create new calendar event if none exists
            const workoutName = workout?.name || existing.name;
            const scheduledEventName = `${workoutName} (Scheduled)`;
            createUserCalendarEvent(userId, scheduledEventName, dateValue, selectedCalendarId, localDate)
              .then(async (eventId) => {
                if (eventId) {
                  await storage.updateScheduledWorkoutCalendarEventId(id, eventId);
                  console.log(`Created calendar event for rescheduled workout: ${eventId}`);
                }
              })
              .catch((err) => {
                console.error("Failed to create calendar event:", err);
              });
          }
        }
      }
      
      res.json(workout);
    } catch (error) {
      res.status(500).json({ error: "Failed to update scheduled workout" });
    }
  });

  // One-time sync to ensure all scheduled workouts have calendar events
  app.post("/api/calendar/sync-scheduled-workouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const isConnected = await storage.isCalendarConnected(userId);
      if (!isConnected) {
        return res.status(400).json({ error: "Google Calendar not connected" });
      }
      
      const userSettings = await storage.getUserSettings(userId);
      const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
      
      const scheduledWorkouts = await storage.getScheduledWorkouts(userId);
      console.log(`[Calendar Sync] Found ${scheduledWorkouts.length} scheduled workouts for user ${userId}`);
      
      // Log all workouts for debugging
      for (const w of scheduledWorkouts) {
        const dateStr = w.date instanceof Date ? w.date.toISOString().split('T')[0] : String(w.date).split('T')[0];
        console.log(`[Calendar Sync] Workout: "${w.name}" on ${dateStr}, eventId: ${w.calendarEventId || 'none'}, routineInstanceId: ${w.routineInstanceId || 'none'}`);
      }
      
      let created = 0;
      let alreadySynced = 0;
      let failed = 0;
      
      // Track workout details for response
      const syncedWorkouts: { name: string; date: string; status: string; eventId?: string; calendarChecked?: string }[] = [];
      
      // Process each workout
      for (const workout of scheduledWorkouts) {
        const workoutDate = workout.date instanceof Date ? workout.date : new Date(workout.date);
        const localDateStr = workoutDate.toISOString().split('T')[0];
        
        // If workout has an event ID, verify it still exists in the calendar
        if (workout.calendarEventId) {
          const calendarToCheck = selectedCalendarId || 'primary';
          
          // First check the selected calendar
          let eventExists = await checkCalendarEventExists(
            userId,
            workout.calendarEventId,
            selectedCalendarId
          );
          
          // If not found and we're using a specific calendar, also check primary as fallback
          // (in case event was created in primary before user selected a different calendar)
          if (!eventExists && selectedCalendarId && selectedCalendarId !== 'primary') {
            const existsInPrimary = await checkCalendarEventExists(
              userId,
              workout.calendarEventId,
              'primary'
            );
            if (existsInPrimary) {
              eventExists = true;
            }
          }
          
          if (eventExists) {
            alreadySynced++;
            syncedWorkouts.push({
              name: workout.name,
              date: localDateStr,
              status: 'already_synced',
              eventId: workout.calendarEventId,
              calendarChecked: calendarToCheck
            });
            continue;
          } else {
            // Event was deleted from calendar, clear the ID so it gets recreated
            await storage.updateScheduledWorkoutCalendarEventId(workout.id, null);
          }
        }
        
        const scheduledEventName = `${workout.name} (Scheduled)`;
        
        try {
          const eventId = await createUserCalendarEvent(
            userId,
            scheduledEventName,
            workoutDate,
            selectedCalendarId,
            localDateStr
          );
          
          if (eventId) {
            await storage.updateScheduledWorkoutCalendarEventId(workout.id, eventId);
            created++;
            syncedWorkouts.push({
              name: workout.name,
              date: localDateStr,
              status: 'created',
              eventId
            });
            console.log(`Created calendar event for "${workout.name}": ${eventId}`);
          } else {
            failed++;
            syncedWorkouts.push({
              name: workout.name,
              date: localDateStr,
              status: 'failed'
            });
          }
        } catch (err) {
          console.error(`Failed to sync workout ${workout.id}:`, err);
          failed++;
          syncedWorkouts.push({
            name: workout.name,
            date: localDateStr,
            status: 'failed'
          });
        }
      }
      
      res.json({
        success: true,
        message: `Calendar sync complete`,
        created,
        alreadySynced,
        failed,
        total: scheduledWorkouts.length,
        workouts: syncedWorkouts
      });
    } catch (error: any) {
      console.error("Failed to sync scheduled workouts:", error);
      res.status(500).json({ 
        error: "Failed to sync workouts to calendar",
        details: error?.message || String(error)
      });
    }
  });

  app.delete("/api/scheduled-workouts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;
      
      // Verify ownership before deleting
      const existing = await storage.getScheduledWorkout(id);
      if (!existing) {
        return res.status(404).json({ error: "Workout not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Delete the calendar event if one exists and user has calendar connected
      if (existing.calendarEventId) {
        const isConnected = await storage.isCalendarConnected(userId);
        if (isConnected) {
          const userSettings = await storage.getUserSettings(userId);
          const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
          deleteUserCalendarEvent(userId, existing.calendarEventId, selectedCalendarId)
            .then((deleted) => {
              if (deleted) {
                console.log(`Deleted scheduled calendar event: ${existing.calendarEventId}`);
              }
            })
            .catch((err) => {
              console.error("Failed to delete scheduled calendar event:", err);
            });
        }
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

  // Skip a scheduled workout (for routine workouts only)
  app.post("/api/scheduled-workouts/:id/skip", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;
      
      // Verify ownership
      const existing = await storage.getScheduledWorkout(id);
      if (!existing) {
        return res.status(404).json({ error: "Workout not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Only routine workouts can be skipped
      if (!existing.routineInstanceId) {
        return res.status(400).json({ error: "Only routine workouts can be skipped" });
      }
      
      // Delete the calendar event if one exists and user has calendar connected
      if (existing.calendarEventId) {
        const isConnected = await storage.isCalendarConnected(userId);
        if (isConnected) {
          const userSettings = await storage.getUserSettings(userId);
          const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
          deleteUserCalendarEvent(userId, existing.calendarEventId, selectedCalendarId)
            .then((deleted) => {
              if (deleted) {
                console.log(`Deleted skipped workout calendar event: ${existing.calendarEventId}`);
              }
            })
            .catch((err) => {
              console.error("Failed to delete skipped workout calendar event:", err);
            });
        }
      }
      
      // Increment the skipped count on the routine instance
      await storage.incrementRoutineInstanceSkipped(existing.routineInstanceId);
      
      // Delete the scheduled workout
      await storage.deleteScheduledWorkout(id);
      
      res.json({ success: true, message: "Workout skipped" });
    } catch (error) {
      console.error("Failed to skip scheduled workout:", error);
      res.status(500).json({ error: "Failed to skip scheduled workout" });
    }
  });

  // Completed Workouts (requires authentication)
  app.get("/api/completed-workouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const workouts = await storage.getCompletedWorkouts(userId);
      res.json(workouts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch completed workouts" });
    }
  });

  app.post("/api/completed-workouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { displayId, name, exercises, completedAt, localDate, scheduledWorkoutId, templateId } = req.body;
      
      if (!displayId || !name || !exercises) {
        return res.status(400).json({ error: "Missing required fields: displayId, name, exercises" });
      }
      
      // Determine templateId - use provided value, or get from scheduled workout if available
      let resolvedTemplateId = templateId || null;
      if (!resolvedTemplateId && scheduledWorkoutId) {
        const scheduledWorkout = await storage.getScheduledWorkout(scheduledWorkoutId);
        if (scheduledWorkout?.templateId) {
          resolvedTemplateId = scheduledWorkout.templateId;
        }
      }
      
      const completedDate = completedAt ? new Date(completedAt) : new Date();
      const workout = await storage.createCompletedWorkout({
        userId,
        templateId: resolvedTemplateId,
        displayId,
        name,
        exercises,
        completedAt: completedDate,
      });
      
      // Check if user has calendar connected and get settings
      const isConnected = await storage.isCalendarConnected(userId);
      const userSettings = await storage.getUserSettings(userId);
      const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
      
      // If this was from a scheduled workout, handle routine progress tracking
      if (scheduledWorkoutId) {
        const scheduledWorkout = await storage.getScheduledWorkout(scheduledWorkoutId);
        
        // Delete the "(Scheduled)" calendar event if connected
        if (scheduledWorkout?.calendarEventId && isConnected) {
          deleteUserCalendarEvent(userId, scheduledWorkout.calendarEventId, selectedCalendarId)
            .then((deleted) => {
              if (deleted) {
                console.log(`Deleted scheduled calendar event: ${scheduledWorkout.calendarEventId}`);
              }
            })
            .catch((err) => {
              console.error("Failed to delete scheduled calendar event:", err);
            });
        }
        
        // If this workout was part of a routine instance, update progress
        if (scheduledWorkout?.routineInstanceId) {
          try {
            const updatedInstance = await storage.incrementRoutineInstanceProgress(scheduledWorkout.routineInstanceId);
            if (updatedInstance) {
              console.log(`Updated routine instance progress: ${updatedInstance.completedWorkouts}/${updatedInstance.totalWorkouts} (${updatedInstance.routineName})`);
              if (updatedInstance.status === 'completed') {
                console.log(`Routine "${updatedInstance.routineName}" completed!`);
              }
            }
          } catch (err) {
            console.error("Failed to update routine instance progress:", err);
          }
        }
      }
      
      // Sync completed workout to Google Calendar if connected
      if (isConnected) {
        createUserCalendarEvent(userId, name, completedDate, selectedCalendarId, localDate)
          .then(async (eventId) => {
            if (eventId) {
              await storage.updateCompletedWorkoutCalendarEventId(workout.id, eventId);
              console.log(`Synced completed workout "${name}" to Google Calendar (${selectedCalendarId || 'primary'}): ${eventId}`);
            }
          })
          .catch((err) => {
            console.error("Failed to sync to Google Calendar:", err);
          });
      }
      
      res.status(201).json(workout);
    } catch (error) {
      console.error("Failed to create completed workout:", error);
      res.status(500).json({ error: "Failed to create completed workout" });
    }
  });

  app.put("/api/completed-workouts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;
      const { name, exercises, completedAt } = req.body;
      
      const existing = await storage.getCompletedWorkout(id);
      if (!existing) {
        return res.status(404).json({ error: "Workout not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updated = await storage.updateCompletedWorkout(id, { name, exercises, completedAt });

      if (completedAt && existing.calendarEventId) {
        const isConnected = await storage.isCalendarConnected(userId);
        if (isConnected) {
          const userSettings = await storage.getUserSettings(userId);
          const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
          const newDate = new Date(completedAt);
          const localDate = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
          updateUserCalendarEvent(userId, existing.calendarEventId, newDate, selectedCalendarId, localDate)
            .then((success) => {
              if (success) {
                console.log(`Updated completed workout calendar event date: ${existing.calendarEventId}`);
              }
            })
            .catch((err) => {
              console.error("Failed to update completed workout calendar event:", err);
            });
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to update completed workout:", error);
      res.status(500).json({ error: "Failed to update completed workout" });
    }
  });

  app.delete("/api/completed-workouts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;
      
      // Get the workout to check for ownership and calendar event
      const workout = await storage.getCompletedWorkout(id);
      if (!workout) {
        return res.status(404).json({ error: "Workout not found" });
      }
      
      // Verify ownership before deleting
      if (workout.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Delete from Google Calendar if linked and user has calendar connected
      if (workout.calendarEventId) {
        const isConnected = await storage.isCalendarConnected(userId);
        if (isConnected) {
          const userSettings = await storage.getUserSettings(userId);
          const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
          deleteUserCalendarEvent(userId, workout.calendarEventId, selectedCalendarId).catch((err) => {
            console.error("Failed to delete calendar event:", err);
          });
        }
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

  // Retry calendar sync for a completed workout
  app.post("/api/completed-workouts/:id/sync-calendar", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;
      const { localDate } = req.body;
      
      const workout = await storage.getCompletedWorkout(id);
      if (!workout) {
        return res.status(404).json({ error: "Workout not found" });
      }
      
      if (workout.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check if user has calendar connected
      const isConnected = await storage.isCalendarConnected(userId);
      if (!isConnected) {
        return res.status(400).json({ error: "Calendar not connected. Please connect your Google Calendar in Settings." });
      }
      
      // Get user's selected calendar
      const userSettings = await storage.getUserSettings(userId);
      const selectedCalendarId = userSettings?.selectedCalendarId || undefined;
      
      // Determine localDate string - use provided or derive from completedAt
      let localDateStr = localDate;
      if (!localDateStr && workout.completedAt) {
        const d = new Date(workout.completedAt);
        localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      
      console.log(`Retrying calendar sync for workout "${workout.name}" (${id}) to calendar ${selectedCalendarId || 'primary'}`);
      
      try {
        const eventId = await createUserCalendarEvent(userId, workout.name, workout.completedAt, selectedCalendarId, localDateStr);
        if (eventId) {
          await storage.updateCompletedWorkoutCalendarEventId(id, eventId);
          console.log(`Successfully synced workout "${workout.name}" to Google Calendar: ${eventId}`);
          res.json({ success: true, calendarEventId: eventId });
        } else {
          console.error(`Calendar sync returned null eventId for workout "${workout.name}"`);
          res.status(500).json({ error: "Calendar sync failed - no event ID returned" });
        }
      } catch (calendarError: any) {
        console.error(`Calendar sync error for workout "${workout.name}":`, calendarError.message);
        res.status(500).json({ error: `Calendar sync failed: ${calendarError.message}` });
      }
    } catch (error: any) {
      console.error("Failed to retry calendar sync:", error);
      res.status(500).json({ error: "Failed to retry calendar sync" });
    }
  });

  // Legacy Google Calendar list endpoint - redirect to per-user endpoint
  // This is kept for backwards compatibility but now uses per-user tokens
  app.get("/api/calendars", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const isConnected = await storage.isCalendarConnected(userId);
      if (!isConnected) {
        return res.status(401).json({ error: "Google Calendar not connected" });
      }
      
      const calendars = await listUserCalendars(userId);
      res.json(calendars);
    } catch (error: any) {
      console.error("Failed to list calendars:", error);
      if (error.message?.includes('not connected')) {
        return res.status(401).json({ error: "Google Calendar not connected" });
      }
      res.status(500).json({ error: "Failed to list calendars" });
    }
  });

  // User settings endpoints
  app.get("/api/user-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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

  // Debug endpoint to check OAuth configuration and test DB
  app.get("/api/calendar/debug", isAuthenticated, async (req: any, res) => {
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'NOT SET';
    const replitDomains = process.env.REPLIT_DOMAINS || 'NOT SET';
    const userId = String((req.user as any)?.id);
    
    // Test if we can read from the tokens table
    let dbTest = "not tested";
    let tokenExists = false;
    try {
      tokenExists = await storage.isCalendarConnected(userId);
      dbTest = "db read success";
    } catch (e: any) {
      dbTest = `db read error: ${e.message}`;
    }
    
    res.json({
      redirectUri,
      replitDomains,
      userId,
      dbTest,
      tokenExists,
      message: "Check that redirectUri matches what's in Google Cloud Console"
    });
  });

  // Per-user Google Calendar OAuth routes
  app.get("/api/calendar/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      console.log("[Calendar] Status check for userId:", userId, "type:", typeof userId);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Convert userId to string to ensure consistent comparison
      const userIdStr = String(userId);
      const connected = await storage.isCalendarConnected(userIdStr);
      console.log("[Calendar] Status result for user", userIdStr, ":", connected);
      res.json({ connected, userId: userIdStr });
    } catch (error: any) {
      console.error("Failed to check calendar status:", error);
      res.status(500).json({ error: "Failed to check calendar status" });
    }
  });

  app.get("/api/calendar/connect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const authUrl = getCalendarAuthUrl(userId);
      res.json({ authUrl });
    } catch (error: any) {
      console.error("Failed to get calendar auth URL:", error);
      res.status(500).json({ error: "Failed to initiate calendar connection" });
    }
  });

  app.get("/api/calendar/callback", async (req: any, res) => {
    try {
      const { code, state: stateUserId } = req.query;
      const sessionUserId = (req.user as any)?.id;
      
      console.log("[Calendar] Callback received:", { 
        code: code ? "present" : "missing", 
        stateUserId, 
        stateUserIdType: typeof stateUserId,
        sessionUserId: sessionUserId || "no session",
        sessionUserIdType: typeof sessionUserId,
        hasSession: !!req.session,
        sessionId: req.sessionID
      });
      
      if (!code || !stateUserId) {
        console.error("[Calendar] Missing code or state in callback");
        return res.redirect('/settings?calendar_error=missing_params');
      }
      
      // Convert both to strings for consistent comparison
      const stateUserIdStr = String(stateUserId);
      const sessionUserIdStr = sessionUserId ? String(sessionUserId) : null;
      
      // Use state userId if session is lost during redirect
      // The state contains the userId that initiated the OAuth flow
      const userId = sessionUserIdStr || stateUserIdStr;
      
      // If we have a session, validate state matches for security
      if (sessionUserIdStr && stateUserIdStr !== sessionUserIdStr) {
        console.error(`[Calendar] State mismatch: state=${stateUserIdStr}, session=${sessionUserIdStr}`);
        return res.redirect('/settings?calendar_error=invalid_state');
      }
      
      console.log("[Calendar] Exchanging code for tokens for user:", userId);
      await handleCalendarCallback(code as string, userId);
      console.log("[Calendar] Tokens saved successfully for user:", userId);
      res.redirect('/settings?calendar_connected=true');
    } catch (error: any) {
      console.error("[Calendar] OAuth callback error:", error.message, error.stack);
      res.redirect(`/settings?calendar_error=${encodeURIComponent(error.message)}`);
    }
  });

  app.post("/api/calendar/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = String((req.user as any)?.id);
      if (!userId || userId === 'undefined') {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      await storage.deleteGoogleCalendarTokens(userId);
      
      // Clear selected calendar preferences
      await storage.upsertUserSettings(userId, {
        selectedCalendarId: null,
        selectedCalendarName: null,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to disconnect calendar:", error);
      res.status(500).json({ error: "Failed to disconnect calendar" });
    }
  });

  app.get("/api/calendar/list", isAuthenticated, async (req: any, res) => {
    try {
      const userId = String((req.user as any)?.id);
      if (!userId || userId === 'undefined') {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const connected = await storage.isCalendarConnected(userId);
      console.log("[Calendar] List check for user", userId, "connected:", connected);
      if (!connected) {
        return res.status(401).json({ error: "Calendar not connected" });
      }
      
      console.log("[Calendar] Fetching calendars for user:", userId);
      const calendars = await listUserCalendars(userId);
      console.log("[Calendar] Found", calendars.length, "calendars");
      res.json(calendars);
    } catch (error: any) {
      console.error("[Calendar] Failed to list user calendars:", error.message, error.stack);
      if (error.message?.includes('Calendar not connected')) {
        return res.status(401).json({ error: "Calendar not connected" });
      }
      // Return the actual error message for debugging
      res.status(500).json({ error: "Failed to list calendars", details: error.message });
    }
  });

  // Active workout persistence endpoints (survives page refresh)
  app.get("/api/active-workout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const activeWorkout = await storage.getActiveWorkout(userId);
      res.json(activeWorkout || null);
    } catch (error) {
      console.error("Failed to get active workout:", error);
      res.status(500).json({ error: "Failed to get active workout" });
    }
  });

  app.put("/api/active-workout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { workoutData, trackingProgress } = req.body;
      
      if (!workoutData) {
        return res.status(400).json({ error: "workoutData is required" });
      }
      
      const result = await storage.upsertActiveWorkout(userId, workoutData, trackingProgress);
      res.json(result);
    } catch (error) {
      console.error("Failed to save active workout:", error);
      res.status(500).json({ error: "Failed to save active workout" });
    }
  });

  app.delete("/api/active-workout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      await storage.deleteActiveWorkout(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete active workout:", error);
      res.status(500).json({ error: "Failed to delete active workout" });
    }
  });

  // Routines API - My Routines
  app.get("/api/routines", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const routines = await storage.getRoutines(userId);
      res.json(routines);
    } catch (error) {
      console.error("Failed to get routines:", error);
      res.status(500).json({ error: "Failed to get routines" });
    }
  });

  // Routines API - Public Routines
  app.get("/api/routines/public", isAuthenticated, async (req: any, res) => {
    try {
      const routines = await storage.getPublicRoutines();
      res.json(routines);
    } catch (error) {
      console.error("Failed to get public routines:", error);
      res.status(500).json({ error: "Failed to get public routines" });
    }
  });

  // Routines API - Get single routine with entries
  app.get("/api/routines/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const routine = await storage.getRoutine(req.params.id);
      if (!routine) {
        return res.status(404).json({ error: "Routine not found" });
      }
      
      // Only allow access if user owns the routine or it's public
      if (routine.userId !== userId && !routine.isPublic) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const entries = await storage.getRoutineEntries(req.params.id);
      res.json({ ...routine, entries });
    } catch (error) {
      console.error("Failed to get routine:", error);
      res.status(500).json({ error: "Failed to get routine" });
    }
  });

  // Routines API - Create routine
  app.post("/api/routines", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { name, description, defaultDurationDays, isPublic, entries } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Routine name is required" });
      }
      
      // Create the routine
      const routine = await storage.createRoutine({
        userId,
        name,
        description: description || null,
        defaultDurationDays: defaultDurationDays || 7,
        isPublic: isPublic || false,
      });
      
      // Create entries if provided
      if (entries && Array.isArray(entries)) {
        for (const entry of entries) {
          await storage.createRoutineEntry({
            routineId: routine.id,
            dayIndex: entry.dayIndex,
            workoutTemplateId: entry.workoutTemplateId || null,
            workoutName: entry.workoutName || null,
            exercises: entry.exercises || null,
          });
        }
      }
      
      const createdEntries = await storage.getRoutineEntries(routine.id);
      res.status(201).json({ ...routine, entries: createdEntries });
    } catch (error) {
      console.error("Failed to create routine:", error);
      res.status(500).json({ error: "Failed to create routine" });
    }
  });

  // Routines API - Update routine
  app.put("/api/routines/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const routine = await storage.getRoutine(req.params.id);
      if (!routine) {
        return res.status(404).json({ error: "Routine not found" });
      }
      
      // Only owner can update
      if (routine.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { name, description, defaultDurationDays, isPublic, entries } = req.body;
      
      // Update routine
      const updatedRoutine = await storage.updateRoutine(req.params.id, {
        name: name !== undefined ? name : routine.name,
        description: description !== undefined ? description : routine.description,
        defaultDurationDays: defaultDurationDays !== undefined ? defaultDurationDays : routine.defaultDurationDays,
        isPublic: isPublic !== undefined ? isPublic : routine.isPublic,
      });
      
      // Update entries if provided - delete all and recreate
      if (entries && Array.isArray(entries)) {
        await storage.deleteRoutineEntriesByRoutineId(req.params.id);
        for (const entry of entries) {
          await storage.createRoutineEntry({
            routineId: req.params.id,
            dayIndex: entry.dayIndex,
            workoutTemplateId: entry.workoutTemplateId || null,
            workoutName: entry.workoutName || null,
            exercises: entry.exercises || null,
          });
        }
      }
      
      const updatedEntries = await storage.getRoutineEntries(req.params.id);
      res.json({ ...updatedRoutine, entries: updatedEntries });
    } catch (error) {
      console.error("Failed to update routine:", error);
      res.status(500).json({ error: "Failed to update routine" });
    }
  });

  // Routines API - Delete routine
  app.delete("/api/routines/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const routine = await storage.getRoutine(req.params.id);
      if (!routine) {
        return res.status(404).json({ error: "Routine not found" });
      }
      
      // Only owner can delete
      if (routine.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteRoutine(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete routine:", error);
      res.status(500).json({ error: "Failed to delete routine" });
    }
  });

  // Routines API - Update future scheduled workouts for active routine instances
  app.post("/api/routines/:id/update-active-instances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const routine = await storage.getRoutine(req.params.id);
      if (!routine) {
        return res.status(404).json({ error: "Routine not found" });
      }
      
      // Only owner can update active instances
      if (routine.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get the routine entries
      const entries = await storage.getRoutineEntries(req.params.id);
      
      // Get all active instances for this routine
      const allInstances = await storage.getActiveRoutineInstances(userId);
      const routineInstances = allInstances.filter(i => i.routineId === req.params.id);
      
      let totalUpdated = 0;
      
      // Update future scheduled workouts for each active instance
      for (const instance of routineInstances) {
        const updatedCount = await storage.updateFutureScheduledWorkoutsByRoutineInstance(
          instance.id,
          entries.map(e => ({
            dayIndex: e.dayIndex,
            workoutName: e.workoutName,
            exercises: e.exercises
          }))
        );
        totalUpdated += updatedCount;
      }
      
      res.json({ 
        success: true, 
        updatedCount: totalUpdated,
        instanceCount: routineInstances.length
      });
    } catch (error) {
      console.error("Failed to update active routine instances:", error);
      res.status(500).json({ error: "Failed to update active routine instances" });
    }
  });

  // Routines API - Start routine (create routine instance and scheduled workouts with progress tracking)
  app.post("/api/routines/:id/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const routine = await storage.getRoutine(req.params.id);
      if (!routine) {
        return res.status(404).json({ error: "Routine not found" });
      }
      
      // Allow access if user owns the routine or it's public
      if (routine.userId !== userId && !routine.isPublic) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { startDate, durationDays } = req.body;
      
      if (!startDate) {
        return res.status(400).json({ error: "Start date is required" });
      }
      
      const entries = await storage.getRoutineEntries(req.params.id);
      
      // Filter entries to only include those within the requested duration
      const maxDays = durationDays || routine.defaultDurationDays;
      const filteredEntries = entries.filter(entry => entry.dayIndex <= maxDays && entry.workoutName);
      
      if (filteredEntries.length === 0) {
        return res.status(400).json({ error: "No workout entries found for the specified duration" });
      }
      
      // Check for conflicts
      const existingWorkouts = await storage.getScheduledWorkouts(userId);
      const startDateObj = new Date(startDate);
      const conflicts: string[] = [];
      
      for (const entry of filteredEntries) {
        const workoutDate = new Date(startDateObj);
        workoutDate.setDate(startDateObj.getDate() + entry.dayIndex - 1);
        const dateStr = workoutDate.toISOString().split('T')[0];
        
        const hasConflict = existingWorkouts.some(w => {
          const existingDate = new Date(w.date).toISOString().split('T')[0];
          return existingDate === dateStr;
        });
        
        if (hasConflict) {
          conflicts.push(dateStr);
        }
      }
      
      if (conflicts.length > 0) {
        return res.status(409).json({ 
          error: "Scheduling conflicts found",
          conflicts,
          message: `Workouts already exist on: ${conflicts.join(", ")}`
        });
      }
      
      // Calculate end date
      const endDate = new Date(startDateObj);
      endDate.setDate(startDateObj.getDate() + maxDays - 1);
      
      // Create routine instance to track progress
      const routineInstance = await storage.createRoutineInstance({
        routineId: req.params.id,
        userId,
        routineName: routine.name,
        startDate: startDateObj,
        endDate,
        durationDays: maxDays,
        totalWorkouts: filteredEntries.length,
        completedWorkouts: 0,
        status: 'active',
      });
      
      // Get user settings and check calendar connection
      const isCalendarConnected = await storage.isCalendarConnected(userId);
      const userSettings = await storage.getUserSettings(userId);
      const calendarId = userSettings?.selectedCalendarId || 'primary';
      
      // Create scheduled workouts linked to routine instance
      const createdWorkouts = [];
      
      for (const entry of filteredEntries) {
        const workoutDate = new Date(startDateObj);
        workoutDate.setDate(startDateObj.getDate() + entry.dayIndex - 1);
        
        // Calculate local date string
        const localDate = `${workoutDate.getFullYear()}-${String(workoutDate.getMonth() + 1).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(2, '0')}`;
        
        const scheduledWorkout = await storage.createScheduledWorkoutWithRoutine({
          userId,
          name: entry.workoutName || `Day ${entry.dayIndex}`,
          date: workoutDate,
          exercises: entry.exercises || [],
          templateId: entry.workoutTemplateId || null,
          routineInstanceId: routineInstance.id,
          routineDayIndex: entry.dayIndex,
        });
        
        // Sync to Google Calendar if user has connected their calendar
        if (isCalendarConnected) {
          try {
            const scheduledEventName = `${scheduledWorkout.name} (Scheduled)`;
            const calendarEventId = await createUserCalendarEvent(
              userId,
              scheduledEventName,
              workoutDate,
              calendarId,
              localDate
            );
            if (calendarEventId) {
              await storage.updateScheduledWorkoutCalendarEventId(scheduledWorkout.id, calendarEventId);
            }
          } catch (calendarError) {
            console.error("Failed to create calendar event:", calendarError);
          }
        }
        
        createdWorkouts.push(scheduledWorkout);
      }
      
      res.status(201).json({ 
        success: true, 
        routineInstance,
        createdCount: createdWorkouts.length,
        workouts: createdWorkouts 
      });
    } catch (error) {
      console.error("Failed to start routine:", error);
      res.status(500).json({ error: "Failed to start routine" });
    }
  });

  // Routines API - Legacy apply route (for backwards compatibility)
  app.post("/api/routines/:id/apply", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const routine = await storage.getRoutine(req.params.id);
      if (!routine) {
        return res.status(404).json({ error: "Routine not found" });
      }
      
      // Allow access if user owns the routine or it's public
      if (routine.userId !== userId && !routine.isPublic) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { startDate, durationDays } = req.body;
      
      if (!startDate) {
        return res.status(400).json({ error: "Start date is required" });
      }
      
      const entries = await storage.getRoutineEntries(req.params.id);
      
      // Filter entries to only include those within the requested duration
      const maxDays = durationDays || routine.defaultDurationDays;
      const filteredEntries = entries.filter(entry => entry.dayIndex <= maxDays && entry.workoutName);
      
      if (filteredEntries.length === 0) {
        return res.status(400).json({ error: "No workout entries found for the specified duration" });
      }
      
      // Check for conflicts
      const existingWorkouts = await storage.getScheduledWorkouts(userId);
      const startDateObj = new Date(startDate);
      const conflicts: string[] = [];
      
      for (const entry of filteredEntries) {
        const workoutDate = new Date(startDateObj);
        workoutDate.setDate(startDateObj.getDate() + entry.dayIndex - 1);
        const dateStr = workoutDate.toISOString().split('T')[0];
        
        const hasConflict = existingWorkouts.some(w => {
          const existingDate = new Date(w.date).toISOString().split('T')[0];
          return existingDate === dateStr;
        });
        
        if (hasConflict) {
          conflicts.push(dateStr);
        }
      }
      
      if (conflicts.length > 0) {
        return res.status(409).json({ 
          error: "Scheduling conflicts found",
          conflicts,
          message: `Workouts already exist on: ${conflicts.join(", ")}`
        });
      }
      
      // Get user settings and check calendar connection
      const isCalendarConnected = await storage.isCalendarConnected(userId);
      const userSettings = await storage.getUserSettings(userId);
      const calendarId = userSettings?.selectedCalendarId || 'primary';
      
      // Create scheduled workouts
      const createdWorkouts = [];
      
      for (const entry of filteredEntries) {
        const workoutDate = new Date(startDateObj);
        workoutDate.setDate(startDateObj.getDate() + entry.dayIndex - 1);
        
        // Calculate local date string
        const localDate = `${workoutDate.getFullYear()}-${String(workoutDate.getMonth() + 1).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(2, '0')}`;
        
        const scheduledWorkout = await storage.createScheduledWorkout({
          userId,
          name: entry.workoutName || `Day ${entry.dayIndex}`,
          date: workoutDate,
          exercises: entry.exercises || [],
          templateId: entry.workoutTemplateId || null,
        });
        
        // Sync to Google Calendar if user has connected their calendar
        if (isCalendarConnected) {
          try {
            const scheduledEventName = `${scheduledWorkout.name} (Scheduled)`;
            const calendarEventId = await createUserCalendarEvent(
              userId,
              scheduledEventName,
              workoutDate,
              calendarId,
              localDate
            );
            if (calendarEventId) {
              await storage.updateScheduledWorkoutCalendarEventId(scheduledWorkout.id, calendarEventId);
            }
          } catch (calendarError) {
            console.error("Failed to create calendar event:", calendarError);
          }
        }
        
        createdWorkouts.push(scheduledWorkout);
      }
      
      res.status(201).json({ 
        success: true, 
        createdCount: createdWorkouts.length,
        workouts: createdWorkouts 
      });
    } catch (error) {
      console.error("Failed to apply routine:", error);
      res.status(500).json({ error: "Failed to apply routine" });
    }
  });

  // Routine Instances API - Get all routine instances for user
  app.get("/api/routine-instances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const instances = await storage.getRoutineInstances(userId);
      res.json(instances);
    } catch (error) {
      console.error("Failed to fetch routine instances:", error);
      res.status(500).json({ error: "Failed to fetch routine instances" });
    }
  });

  // Routine Instances API - Get active routine instances
  app.get("/api/routine-instances/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const instances = await storage.getActiveRoutineInstances(userId);
      res.json(instances);
    } catch (error) {
      console.error("Failed to fetch active routine instances:", error);
      res.status(500).json({ error: "Failed to fetch active routine instances" });
    }
  });

  // Routine Instances API - Get single routine instance
  app.get("/api/routine-instances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const instance = await storage.getRoutineInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ error: "Routine instance not found" });
      }
      
      if (instance.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(instance);
    } catch (error) {
      console.error("Failed to fetch routine instance:", error);
      res.status(500).json({ error: "Failed to fetch routine instance" });
    }
  });

  // Routine Instances API - Update routine instance (e.g., cancel, complete manually)
  app.patch("/api/routine-instances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const instance = await storage.getRoutineInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ error: "Routine instance not found" });
      }
      
      if (instance.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { status } = req.body;
      const updatedInstance = await storage.updateRoutineInstance(req.params.id, { status });
      res.json(updatedInstance);
    } catch (error) {
      console.error("Failed to update routine instance:", error);
      res.status(500).json({ error: "Failed to update routine instance" });
    }
  });

  // Routine Instances API - Delete routine instance
  app.delete("/api/routine-instances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const instance = await storage.getRoutineInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ error: "Routine instance not found" });
      }
      
      if (instance.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteRoutineInstance(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete routine instance:", error);
      res.status(500).json({ error: "Failed to delete routine instance" });
    }
  });

  // Register image generation routes
  registerImageRoutes(app);

  // Register object storage routes
  registerObjectStorageRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
