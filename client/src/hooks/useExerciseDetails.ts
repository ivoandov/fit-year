import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Exercise } from "@shared/schema";

interface StoredExercise {
  id: string;
  name?: string;
  description?: string;
  imageUrl?: string | null;
  muscleGroups?: string[] | unknown;
  exerciseType?: string;
  isAssisted?: boolean;
  [key: string]: any;
}

interface EnrichedExercise extends StoredExercise {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  muscleGroups: string[];
  exerciseType: string;
  isAssisted: boolean;
}

export function useExerciseDetails() {
  const { data: allExercises = [] } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
  });

  const getExerciseById = useCallback((id: string): Exercise | undefined => {
    return allExercises.find(ex => ex.id === id);
  }, [allExercises]);

  const enrichExercise = useCallback(<T extends StoredExercise>(storedExercise: T): T & EnrichedExercise => {
    const sourceExercise = allExercises.find(ex => ex.id === storedExercise.id);
    
    if (sourceExercise) {
      return {
        ...storedExercise,
        name: sourceExercise.name,
        description: sourceExercise.description,
        imageUrl: sourceExercise.imageUrl,
        muscleGroups: sourceExercise.muscleGroups as string[],
        exerciseType: sourceExercise.exerciseType,
        isAssisted: sourceExercise.isAssisted,
      } as T & EnrichedExercise;
    }
    
    return {
      ...storedExercise,
      name: storedExercise.name || "Unknown Exercise",
      description: storedExercise.description || "",
      imageUrl: storedExercise.imageUrl || null,
      muscleGroups: (storedExercise.muscleGroups as string[]) || [],
      exerciseType: storedExercise.exerciseType || "weight_reps",
      isAssisted: storedExercise.isAssisted || false,
    } as T & EnrichedExercise;
  }, [allExercises]);

  const enrichExercises = useCallback(<T extends StoredExercise>(storedExercises: T[]): (T & EnrichedExercise)[] => {
    return storedExercises.map(ex => enrichExercise(ex));
  }, [enrichExercise]);

  return {
    allExercises,
    getExerciseById,
    enrichExercise,
    enrichExercises,
  };
}
