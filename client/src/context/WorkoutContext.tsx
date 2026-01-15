import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Exercise } from "@/data/exercises";
import { useAuth } from "@/hooks/use-auth";

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

interface TrackingProgress {
  workoutDisplayId: string;
  exerciseSets: [string, ExerciseSetData[]][]; // Keyed by exercise ID for stability
  currentExerciseIndex: number;
  currentSetIndex: number;
  restTimerDuration: number;
}

interface WorkoutContextType {
  activeWorkout: ActiveWorkout | null;
  completedWorkouts: CompletedWorkoutRecord[];
  isLoading: boolean;
  trackingProgress: TrackingProgress | null;
  startWorkout: (workout: { id: string; displayId: string; scheduledWorkoutId?: string; name: string; exercises: Exercise[] }) => void;
  endWorkout: (exerciseSets?: Map<string, ExerciseSetData[]>) => void;
  completeWorkout: (exerciseSets?: Map<string, ExerciseSetData[]>) => void;
  isWorkoutCompleted: (displayId: string) => boolean;
  restartWorkout: (completedWorkout: CompletedWorkoutRecord) => void;
  updateCompletedWorkout: (id: string, name: string, exercises?: any[]) => void;
  deleteCompletedWorkout: (id: string) => void;
  updateActiveWorkout: (name: string, exercises: Exercise[]) => void;
  saveTrackingProgress: (progress: TrackingProgress) => void;
  clearTrackingProgress: () => void;
  flushProgress: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

const ACTIVE_WORKOUT_STORAGE_KEY = "active_workout";
const TRACKING_STORAGE_KEY = "workout_tracking_progress";

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [trackingProgress, setTrackingProgress] = useState<TrackingProgress | null>(null);
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to track current state for immediate saves (visibility change, beforeunload)
  const activeWorkoutRef = useRef<ActiveWorkout | null>(null);
  const trackingProgressRef = useRef<TrackingProgress | null>(null);
  const userRef = useRef(user);
  
  // Keep refs in sync with state
  useEffect(() => {
    activeWorkoutRef.current = activeWorkout;
  }, [activeWorkout]);
  
  useEffect(() => {
    trackingProgressRef.current = trackingProgress;
  }, [trackingProgress]);
  
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Load active workout from server when user is authenticated
  useEffect(() => {
    if (user && !hasLoadedFromServer) {
      // First try to load from server
      fetch("/api/active-workout", { credentials: "include" })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.workoutData) {
            console.log("Restored active workout from server:", data.workoutData.name);
            setActiveWorkout(data.workoutData);
            if (data.trackingProgress) {
              setTrackingProgress(data.trackingProgress);
            }
          } else {
            // Fall back to localStorage for backward compatibility
            try {
              const saved = localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY);
              if (saved) {
                const localWorkout = JSON.parse(saved);
                setActiveWorkout(localWorkout);
                // Also load tracking progress from localStorage
                const trackingSaved = localStorage.getItem(TRACKING_STORAGE_KEY);
                if (trackingSaved) {
                  const trackingData = JSON.parse(trackingSaved);
                  if (trackingData.workoutDisplayId === localWorkout.displayId) {
                    setTrackingProgress(trackingData);
                  }
                }
              }
            } catch (e) {
              console.error("Failed to load from localStorage:", e);
            }
          }
          setHasLoadedFromServer(true);
        })
        .catch(err => {
          console.error("Failed to load active workout from server:", err);
          // Fall back to localStorage
          try {
            const saved = localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY);
            if (saved) {
              setActiveWorkout(JSON.parse(saved));
            }
          } catch (e) {
            console.error("Failed to load from localStorage:", e);
          }
          setHasLoadedFromServer(true);
        });
    } else if (!user) {
      // User logged out - don't clear workout, just reset server load state
      setHasLoadedFromServer(false);
    }
  }, [user, hasLoadedFromServer]);

  // Save to localStorage (synchronous, always works)
  const saveToLocalStorage = useCallback((workout: ActiveWorkout | null, progress: TrackingProgress | null) => {
    if (workout) {
      localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(workout));
      if (progress) {
        localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(progress));
      }
    } else {
      localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY);
      localStorage.removeItem(TRACKING_STORAGE_KEY);
    }
  }, []);

  // Immediate save to server (no debounce) - used for critical moments
  const saveToServerImmediate = useCallback((workout: ActiveWorkout | null, progress: TrackingProgress | null) => {
    if (!userRef.current) return;
    
    // Cancel any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    if (workout) {
      // Use sendBeacon for reliability when page is closing
      const data = JSON.stringify({
        workoutData: workout,
        trackingProgress: progress,
      });
      
      // Try fetch first, with keepalive for reliability
      fetch("/api/active-workout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: data,
        credentials: "include",
        keepalive: true,
      }).catch(err => {
        console.error("Failed immediate save to server:", err);
      });
    }
  }, []);

  // Debounced save to server whenever workout or tracking progress changes
  const saveToServer = useCallback((workout: ActiveWorkout | null, progress: TrackingProgress | null) => {
    // Always save to localStorage first (synchronous backup)
    saveToLocalStorage(workout, progress);
    
    // Only save to server if user is authenticated
    if (!user) return;
    
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce server saves to avoid hammering the server
    saveTimeoutRef.current = setTimeout(() => {
      if (workout) {
        apiRequest("PUT", "/api/active-workout", {
          workoutData: workout,
          trackingProgress: progress,
        }).catch(err => {
          console.error("Failed to save to server:", err);
          // Local backup already saved, so data is safe
        });
      } else {
        apiRequest("DELETE", "/api/active-workout")
          .catch(err => console.error("Failed to delete from server:", err));
      }
    }, 300); // Reduced debounce time
  }, [user, saveToLocalStorage]);

  // Handle visibility change - save immediately when user leaves tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && activeWorkoutRef.current) {
        console.log("[FitYear] Visibility hidden - saving progress immediately");
        saveToLocalStorage(activeWorkoutRef.current, trackingProgressRef.current);
        saveToServerImmediate(activeWorkoutRef.current, trackingProgressRef.current);
      }
    };

    const handleBeforeUnload = () => {
      if (activeWorkoutRef.current) {
        console.log("[FitYear] Before unload - saving progress");
        saveToLocalStorage(activeWorkoutRef.current, trackingProgressRef.current);
        saveToServerImmediate(activeWorkoutRef.current, trackingProgressRef.current);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveToLocalStorage, saveToServerImmediate]);

  // Save whenever activeWorkout changes (after initial load)
  useEffect(() => {
    if (hasLoadedFromServer) {
      saveToServer(activeWorkout, trackingProgress);
    }
  }, [activeWorkout, hasLoadedFromServer, saveToServer, trackingProgress]);

  const saveTrackingProgress = useCallback((progress: TrackingProgress) => {
    setTrackingProgress(progress);
    // Don't call saveToServer here - the useEffect above will handle it
  }, []);

  const clearTrackingProgress = useCallback(() => {
    setTrackingProgress(null);
  }, []);

  // Flush progress immediately - call this before critical operations like editing
  const flushProgress = useCallback(() => {
    if (activeWorkoutRef.current) {
      console.log("[FitYear] Flushing progress immediately");
      saveToLocalStorage(activeWorkoutRef.current, trackingProgressRef.current);
      saveToServerImmediate(activeWorkoutRef.current, trackingProgressRef.current);
    }
  }, [saveToLocalStorage, saveToServerImmediate]);

  const { data: completedWorkoutsData = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/completed-workouts"],
  });

  const completedWorkouts: CompletedWorkoutRecord[] = completedWorkoutsData.map((w: any) => {
    // Parse the date ensuring it's treated as local time if no timezone is specified
    let completedAt: Date;
    if (w.completedAt) {
      const dateStr = w.completedAt;
      // If the date string doesn't have timezone info, treat it as UTC and convert to local
      if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        completedAt = new Date(dateStr + 'Z');
      } else {
        completedAt = new Date(dateStr);
      }
    } else {
      completedAt = new Date();
    }
    
    return {
      id: w.id,
      displayId: w.displayId,
      name: w.name,
      exercises: (w.exercises as any[]).map((ex: any) => ({
        ...ex,
        muscleGroups: ex.muscleGroups || [],
        setsData: ex.setsData || [],
      })) as Exercise[],
      completedAt,
    };
  });

  const createCompletedMutation = useMutation({
    mutationFn: async (workout: { displayId: string; name: string; exercises: Exercise[]; completedAt: Date; scheduledWorkoutId?: string }) => {
      // Send both UTC timestamp and local date string for calendar
      const localDate = workout.completedAt;
      const localDateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
      
      return apiRequest("POST", "/api/completed-workouts", {
        displayId: workout.displayId,
        name: workout.name,
        exercises: workout.exercises,
        completedAt: workout.completedAt.toISOString(),
        localDate: localDateStr,
        scheduledWorkoutId: workout.scheduledWorkoutId,
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

  const updateCompletedMutation = useMutation({
    mutationFn: async ({ id, name, exercises }: { id: string; name: string; exercises?: any[] }) => {
      return apiRequest("PUT", `/api/completed-workouts/${id}`, { name, exercises });
    },
    onSuccess: (_, variables) => {
      // Update cache immediately for instant UI feedback
      queryClient.setQueryData(["/api/completed-workouts"], (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(workout => 
          workout.id === variables.id 
            ? { ...workout, name: variables.name, exercises: variables.exercises || workout.exercises }
            : workout
        );
      });
      // Also invalidate to ensure consistency with server
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

  const endWorkout = (exerciseSets?: Map<string, ExerciseSetData[]>) => {
    // Save the workout with whatever progress exists before ending
    if (activeWorkout) {
      completeWorkout(exerciseSets);
    } else {
      setActiveWorkout(null);
      setTrackingProgress(null);
    }
  };

  const completeWorkout = (exerciseSets?: Map<string, ExerciseSetData[]>) => {
    if (activeWorkout) {
      // Merge set data into exercises by exercise ID
      const exercisesWithSets = activeWorkout.exercises.map((exercise) => {
        const sets = exerciseSets?.get(exercise.id);
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
        scheduledWorkoutId: activeWorkout.scheduledWorkoutId || undefined,
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

  const updateCompletedWorkout = (id: string, name: string, exercises?: any[]) => {
    updateCompletedMutation.mutate({ id, name, exercises });
  };

  const deleteCompletedWorkout = (id: string) => {
    deleteCompletedMutation.mutate(id);
  };

  const updateActiveWorkout = (name: string, exercises: Exercise[]) => {
    if (activeWorkout) {
      setActiveWorkout({
        ...activeWorkout,
        name,
        exercises: exercises.map(ex => ({
          ...ex,
          sets: 3,
          defaultWeight: 135,
          defaultReps: 10,
        })),
      });
    }
  };

  return (
    <WorkoutContext.Provider value={{ 
      activeWorkout, 
      completedWorkouts,
      isLoading,
      trackingProgress,
      startWorkout, 
      endWorkout,
      completeWorkout,
      isWorkoutCompleted,
      restartWorkout,
      updateCompletedWorkout,
      deleteCompletedWorkout,
      updateActiveWorkout,
      saveTrackingProgress,
      clearTrackingProgress,
      flushProgress,
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
