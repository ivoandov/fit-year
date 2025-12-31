import { createContext, useContext, useState, type ReactNode } from "react";
import { type Exercise } from "@/data/exercises";

interface WorkoutExercise extends Exercise {
  sets: number;
  defaultWeight: number;
  defaultReps: number;
}

interface ActiveWorkout {
  id: string;
  displayId: string;
  name: string;
  exercises: WorkoutExercise[];
}

interface CompletedWorkoutRecord {
  displayId: string;
  completedAt: Date;
}

interface WorkoutContextType {
  activeWorkout: ActiveWorkout | null;
  completedWorkouts: CompletedWorkoutRecord[];
  startWorkout: (workout: { id: string; displayId: string; name: string; exercises: Exercise[] }) => void;
  endWorkout: () => void;
  completeWorkout: () => void;
  isWorkoutCompleted: (displayId: string) => boolean;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [completedWorkouts, setCompletedWorkouts] = useState<CompletedWorkoutRecord[]>([]);

  const startWorkout = (workout: { id: string; displayId: string; name: string; exercises: Exercise[] }) => {
    const workoutWithSets: ActiveWorkout = {
      id: workout.id,
      displayId: workout.displayId,
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

  const completeWorkout = () => {
    if (activeWorkout) {
      setCompletedWorkouts(prev => [
        ...prev,
        { displayId: activeWorkout.displayId, completedAt: new Date() }
      ]);
    }
    setActiveWorkout(null);
  };

  const isWorkoutCompleted = (displayId: string) => {
    return completedWorkouts.some(w => w.displayId === displayId);
  };

  return (
    <WorkoutContext.Provider value={{ 
      activeWorkout, 
      completedWorkouts,
      startWorkout, 
      endWorkout,
      completeWorkout,
      isWorkoutCompleted
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
