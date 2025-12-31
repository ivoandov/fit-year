import { createContext, useContext, useState, type ReactNode } from "react";
import { type Exercise } from "@/data/exercises";

interface WorkoutExercise extends Exercise {
  sets: number;
  defaultWeight: number;
  defaultReps: number;
}

interface ActiveWorkout {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
}

interface WorkoutContextType {
  activeWorkout: ActiveWorkout | null;
  startWorkout: (workout: { id: string; name: string; exercises: Exercise[] }) => void;
  endWorkout: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);

  const startWorkout = (workout: { id: string; name: string; exercises: Exercise[] }) => {
    const workoutWithSets: ActiveWorkout = {
      id: workout.id,
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

  return (
    <WorkoutContext.Provider value={{ activeWorkout, startWorkout, endWorkout }}>
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
