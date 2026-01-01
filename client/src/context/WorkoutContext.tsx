import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Exercise } from "@/data/exercises";

interface WorkoutExercise extends Exercise {
  sets: number;
  defaultWeight: number;
  defaultReps: number;
}

interface ActiveWorkout {
  id: string;
  displayId: string;
  scheduledWorkoutId: string | null;
  name: string;
  exercises: WorkoutExercise[];
}

export interface CompletedWorkoutRecord {
  id: string;
  displayId: string;
  name: string;
  exercises: Exercise[];
  completedAt: Date;
}

interface ExerciseSetData {
  setNumber: number;
  weight: number;
  reps: number;
  distance: number;
  time: number;
  completed: boolean;
}

interface WorkoutContextType {
  activeWorkout: ActiveWorkout | null;
  completedWorkouts: CompletedWorkoutRecord[];
  isLoading: boolean;
  startWorkout: (workout: { id: string; displayId: string; scheduledWorkoutId?: string; name: string; exercises: Exercise[] }) => void;
  endWorkout: () => void;
  completeWorkout: (exerciseSets?: Map<number, ExerciseSetData[]>) => void;
  isWorkoutCompleted: (displayId: string) => boolean;
  restartWorkout: (completedWorkout: CompletedWorkoutRecord) => void;
  deleteCompletedWorkout: (id: string) => void;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);

  const { data: completedWorkoutsData = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/completed-workouts"],
  });

  const completedWorkouts: CompletedWorkoutRecord[] = completedWorkoutsData.map((w: any) => ({
    id: w.id,
    displayId: w.displayId,
    name: w.name,
    exercises: (w.exercises as any[]).map((ex: any) => ({
      ...ex,
      muscleGroups: ex.muscleGroups || [],
    })) as Exercise[],
    completedAt: new Date(w.completedAt),
  }));

  const createCompletedMutation = useMutation({
    mutationFn: async (workout: { displayId: string; name: string; exercises: Exercise[]; completedAt: Date }) => {
      return apiRequest("POST", "/api/completed-workouts", {
        displayId: workout.displayId,
        name: workout.name,
        exercises: workout.exercises,
        completedAt: workout.completedAt.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/completed-workouts"] });
    },
  });

  const deleteCompletedMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/completed-workouts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/completed-workouts"] });
    },
  });

  const deleteScheduledWorkoutMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/scheduled-workouts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-workouts"] });
    },
  });

  const startWorkout = (workout: { id: string; displayId: string; scheduledWorkoutId?: string; name: string; exercises: Exercise[] }) => {
    const workoutWithSets: ActiveWorkout = {
      id: workout.id,
      displayId: workout.displayId,
      scheduledWorkoutId: workout.scheduledWorkoutId || null,
      name: workout.name,
      exercises: workout.exercises.map(ex => ({
        ...ex,
        sets: 3,
        defaultWeight: 135,
        defaultReps: 10,
      })),
    };
    setActiveWorkout(workoutWithSets);
  };

  const endWorkout = () => {
    setActiveWorkout(null);
  };

  const completeWorkout = (exerciseSets?: Map<number, ExerciseSetData[]>) => {
    if (activeWorkout) {
      // Merge set data into exercises if provided
      const exercisesWithSets = activeWorkout.exercises.map((exercise, index) => {
        const sets = exerciseSets?.get(index);
        if (sets) {
          const completedSets = sets.filter(s => s.completed);
          return {
            ...exercise,
            completedSets: completedSets.length,
            setsData: sets,
          };
        }
        return {
          ...exercise,
          completedSets: exercise.sets,
          setsData: [],
        };
      });
      
      createCompletedMutation.mutate({
        displayId: activeWorkout.displayId,
        name: activeWorkout.name,
        exercises: exercisesWithSets,
        completedAt: new Date(),
      });
      
      // Delete the scheduled workout if this was a scheduled workout
      if (activeWorkout.scheduledWorkoutId) {
        deleteScheduledWorkoutMutation.mutate(activeWorkout.scheduledWorkoutId);
      }
    }
    setActiveWorkout(null);
  };

  const isWorkoutCompleted = (displayId: string) => {
    return completedWorkouts.some(w => w.displayId === displayId);
  };

  const restartWorkout = (completedWorkout: CompletedWorkoutRecord) => {
    const newDisplayId = `${completedWorkout.id}-restart-${Date.now()}`;
    startWorkout({
      id: completedWorkout.id,
      displayId: newDisplayId,
      name: completedWorkout.name,
      exercises: completedWorkout.exercises,
    });
  };

  const deleteCompletedWorkout = (id: string) => {
    deleteCompletedMutation.mutate(id);
  };

  return (
    <WorkoutContext.Provider value={{ 
      activeWorkout, 
      completedWorkouts,
      isLoading,
      startWorkout, 
      endWorkout,
      completeWorkout,
      isWorkoutCompleted,
      restartWorkout,
      deleteCompletedWorkout,
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkout must be used within a WorkoutProvider");
  }
  return context;
}
