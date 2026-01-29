import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RestTimer } from "@/components/RestTimer";
import { WorkoutEditorDialog, WorkoutData } from "@/components/WorkoutEditorDialog";
import { ChevronRight, ChevronLeft, Check, Plus, Pencil, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useWorkout } from "@/context/WorkoutContext";
import { useSettings } from "@/components/SettingsProvider";
import { useQuery } from "@tanstack/react-query";
import type { Exercise } from "@shared/schema";

interface SetData {
  setNumber: number;
  weight: number;
  reps: number;
  distance: number;
  time: number;
  completed: boolean;
}

type TrackingState = "not_started" | "in_set" | "resting";

const TRACKING_STORAGE_KEY = "workout_tracking_progress";

interface SavedTrackingProgress {
  workoutDisplayId: string;
  exerciseSets: [string, SetData[]][]; // Keyed by exercise ID for stability
  currentExerciseIndex: number;
  currentSetIndex: number;
  restTimerDuration: number;
}

export default function TrackPage() {
  const [, setLocation] = useLocation();
  const { 
    activeWorkout, 
    endWorkout, 
    completeWorkout, 
    updateActiveWorkout, 
    completedWorkouts,
    trackingProgress,
    saveTrackingProgress,
    clearTrackingProgress,
    flushProgress,
  } = useWorkout();
  const { restTimerOnManualComplete } = useSettings();
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [trackingState, setTrackingState] = useState<TrackingState>("not_started");
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [restTimerDuration, setRestTimerDuration] = useState(90);
  const [exerciseSets, setExerciseSets] = useState<Map<string, SetData[]>>(new Map()); // Keyed by exercise ID
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [hasLoadedSavedProgress, setHasLoadedSavedProgress] = useState(false);

  const { data: exercises = [] } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
  });

  // Load saved progress from context on mount
  useEffect(() => {
    if (activeWorkout && !hasLoadedSavedProgress) {
      if (trackingProgress && trackingProgress.workoutDisplayId === activeWorkout.displayId) {
        console.log("Restoring tracking progress from server");
        // Handle backward compatibility: old data used numeric indices, new uses exercise IDs
        const restoredMap = new Map<string, SetData[]>();
        for (const [key, sets] of trackingProgress.exerciseSets) {
          if (typeof key === 'number') {
            // Old format: numeric index - convert to exercise ID
            const exercise = activeWorkout.exercises[key];
            if (exercise) {
              restoredMap.set(exercise.id, sets);
            }
          } else {
            // New format: string exercise ID
            restoredMap.set(key, sets);
          }
        }
        setExerciseSets(restoredMap);
        setCurrentExerciseIndex(trackingProgress.currentExerciseIndex);
        setCurrentSetIndex(trackingProgress.currentSetIndex);
        setRestTimerDuration(trackingProgress.restTimerDuration);
      }
      setHasLoadedSavedProgress(true);
    }
  }, [activeWorkout, trackingProgress, hasLoadedSavedProgress]);

  // Auto-save progress to context whenever tracking state changes
  useEffect(() => {
    if (activeWorkout && hasLoadedSavedProgress) {
      const progress: SavedTrackingProgress = {
        workoutDisplayId: activeWorkout.displayId,
        exerciseSets: Array.from(exerciseSets.entries()),
        currentExerciseIndex,
        currentSetIndex,
        restTimerDuration,
      };
      saveTrackingProgress(progress);
    }
  }, [activeWorkout, exerciseSets, currentExerciseIndex, currentSetIndex, restTimerDuration, hasLoadedSavedProgress, saveTrackingProgress]);

  // Flush progress when navigating away from the page
  useEffect(() => {
    return () => {
      // On unmount, flush progress immediately to ensure it's saved
      if (activeWorkout) {
        console.log("[TrackPage] Unmounting - flushing progress");
        flushProgress();
      }
    };
  }, [activeWorkout, flushProgress]);

  // Clear saved progress when workout ends
  const clearSavedProgress = () => {
    clearTrackingProgress();
  };

  // Find the last recorded weight/reps for an exercise from completed workouts
  const getLastRecordedValues = (exerciseId: string): { weight: number; reps: number; distance: number; time: number } | null => {
    // Sort completed workouts by date descending to get most recent first
    const sortedWorkouts = [...completedWorkouts].sort((a, b) => 
      b.completedAt.getTime() - a.completedAt.getTime()
    );
    
    for (const workout of sortedWorkouts) {
      const exercise = workout.exercises.find(ex => ex.id === exerciseId) as any;
      if (exercise?.setsData && exercise.setsData.length > 0) {
        // Get the last completed set's values
        const completedSets = exercise.setsData.filter((s: any) => s.completed);
        if (completedSets.length > 0) {
          const lastSet = completedSets[completedSets.length - 1];
          return {
            weight: lastSet.weight || 0,
            reps: lastSet.reps || 0,
            distance: lastSet.distance || 0,
            time: lastSet.time || 0,
          };
        }
      }
    }
    return null;
  };

  const getDefaultSets = (exerciseId?: string, exerciseType?: string): SetData[] => {
    const lastValues = exerciseId ? getLastRecordedValues(exerciseId) : null;
    
    // Distance/time exercises default to 1 set, weight/reps default to 3 sets
    const isDistanceTime = exerciseType === "distance_time";
    
    if (lastValues) {
      // Only apply previous values to the first set, remaining sets start blank
      if (isDistanceTime) {
        return [
          { setNumber: 1, weight: lastValues.weight, reps: lastValues.reps, distance: lastValues.distance, time: lastValues.time, completed: false },
        ];
      }
      return [
        { setNumber: 1, weight: lastValues.weight, reps: lastValues.reps, distance: lastValues.distance, time: lastValues.time, completed: false },
        { setNumber: 2, weight: 0, reps: 0, distance: 0, time: 0, completed: false },
        { setNumber: 3, weight: 0, reps: 0, distance: 0, time: 0, completed: false },
      ];
    }
    
    // Default to blank values (0) if no history
    if (isDistanceTime) {
      return [
        { setNumber: 1, weight: 0, reps: 0, distance: 0, time: 0, completed: false },
      ];
    }
    return [
      { setNumber: 1, weight: 0, reps: 0, distance: 0, time: 0, completed: false },
      { setNumber: 2, weight: 0, reps: 0, distance: 0, time: 0, completed: false },
      { setNumber: 3, weight: 0, reps: 0, distance: 0, time: 0, completed: false },
    ];
  };

  const getCurrentSets = (): SetData[] => {
    const currentExercise = activeWorkout?.exercises[currentExerciseIndex];
    if (!currentExercise) return getDefaultSets();
    return exerciseSets.get(currentExercise.id) || getDefaultSets(currentExercise.id, currentExercise.exerciseType);
  };

  const setCurrentSets = (sets: SetData[]) => {
    const currentExercise = activeWorkout?.exercises[currentExerciseIndex];
    if (!currentExercise) return;
    const newMap = new Map(exerciseSets);
    newMap.set(currentExercise.id, sets);
    setExerciseSets(newMap);
  };

  useEffect(() => {
    if (activeWorkout) {
      const currentEx = activeWorkout.exercises[currentExerciseIndex];
      if (currentEx && !exerciseSets.has(currentEx.id)) {
        const newMap = new Map(exerciseSets);
        newMap.set(currentEx.id, getDefaultSets(currentEx.id, currentEx.exerciseType));
        setExerciseSets(newMap);
      }
    }
  }, [currentExerciseIndex, activeWorkout]);

  if (!activeWorkout) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4" data-testid="text-no-workout">No Active Workout</h1>
            <p className="text-muted-foreground mb-6">
              Start a workout from the Workouts page to begin tracking.
            </p>
            <Button onClick={() => setLocation("/")} data-testid="button-go-to-workouts">
              Go to Workouts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentExercise = activeWorkout.exercises[currentExerciseIndex];
  const sets = getCurrentSets();
  const progress = ((currentExerciseIndex + 1) / activeWorkout.exercises.length) * 100;
  const allSetsCompleted = sets.every(s => s.completed);
  const isLastExercise = currentExerciseIndex === activeWorkout.exercises.length - 1;

  const handlePrimaryAction = () => {
    if (trackingState === "not_started") {
      setTrackingState("in_set");
    } else if (trackingState === "in_set") {
      const newSets = [...sets];
      newSets[currentSetIndex].completed = true;
      setCurrentSets(newSets);
      
      if (currentSetIndex < sets.length - 1) {
        setTrackingState("resting");
      } else {
        setTrackingState("not_started");
      }
    }
  };

  const handleFinishExercise = () => {
    if (isLastExercise) {
      // Don't clear progress before save - the save handles cleanup on success
      completeWorkout(exerciseSets);
      setLocation("/");
    } else {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetIndex(0);
      setTrackingState("not_started");
    }
  };

  const handleAddSet = () => {
    const newSetNumber = sets.length + 1;
    const lastSet = sets[sets.length - 1];
    const newSet: SetData = {
      setNumber: newSetNumber,
      weight: lastSet?.weight ?? 0,
      reps: lastSet?.reps ?? 0,
      distance: lastSet?.distance ?? 0,
      time: lastSet?.time ?? 0,
      completed: false,
    };
    setCurrentSets([...sets, newSet]);
    setCurrentSetIndex(sets.length);
    setTrackingState("not_started");
  };

  const handleRestTimerClose = () => {
    setTrackingState("in_set");
    if (currentSetIndex < sets.length - 1) {
      setCurrentSetIndex(currentSetIndex + 1);
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < activeWorkout.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetIndex(0);
      setTrackingState("not_started");
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setCurrentSetIndex(0);
      setTrackingState("not_started");
    }
  };

  const handleEndWorkout = () => {
    // Don't clear progress before save - the save handles cleanup on success
    endWorkout(exerciseSets);
    setLocation("/");
  };

  const handleEditSave = (data: WorkoutData) => {
    // Since exerciseSets is now keyed by exercise ID, no remapping needed!
    // Set data stays aligned automatically when exercises are reordered/added/removed
    const oldExercises = activeWorkout.exercises;
    const newExercises = data.exercises;
    
    updateActiveWorkout(data.name, data.exercises);
    setIsEditDialogOpen(false);
    
    // Reset to first exercise if current exercise was removed
    if (currentExerciseIndex >= newExercises.length) {
      setCurrentExerciseIndex(Math.max(0, newExercises.length - 1));
      setCurrentSetIndex(0);
      setTrackingState("not_started");
    } else {
      // Check if current exercise still exists (might be at a different index now)
      const currentExId = oldExercises[currentExerciseIndex]?.id;
      const newIndex = newExercises.findIndex(ex => ex.id === currentExId);
      if (newIndex >= 0 && newIndex !== currentExerciseIndex) {
        // Move to the new index of the same exercise
        setCurrentExerciseIndex(newIndex);
      } else if (newIndex < 0) {
        // Current exercise was removed, go to first exercise
        setCurrentExerciseIndex(0);
        setCurrentSetIndex(0);
        setTrackingState("not_started");
      }
    }
  };

  const getPrimaryButtonText = () => {
    if (allSetsCompleted) {
      return isLastExercise ? "Finish Workout" : "Finish Exercise";
    }
    if (trackingState === "not_started") {
      return currentSetIndex === 0 ? "Start" : `Start Set ${currentSetIndex + 1}`;
    }
    if (trackingState === "in_set") {
      return "End Set";
    }
    return "Start";
  };

  const handlePrimaryButtonClick = () => {
    if (allSetsCompleted) {
      handleFinishExercise();
    } else {
      handlePrimaryAction();
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">
            {activeWorkout.name}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Exercise {currentExerciseIndex + 1} of {activeWorkout.exercises.length}
          </p>
          <Progress value={progress} className="mt-3 sm:mt-4" data-testid="progress-workout" />
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousExercise}
                disabled={currentExerciseIndex === 0}
                data-testid="button-previous-exercise"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 text-center min-w-0">
                <CardTitle className="text-lg sm:text-2xl font-bold truncate" data-testid="text-current-exercise">
                  {currentExercise.name}
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {currentExercise.muscleGroups?.join(", ")}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextExercise}
                disabled={currentExerciseIndex === activeWorkout.exercises.length - 1}
                data-testid="button-next-exercise"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-3 sm:space-y-4">
              {currentExercise.exerciseType === "distance_time" ? (
                <>
                  <div className="grid grid-cols-4 gap-2 sm:gap-4 font-semibold text-xs sm:text-sm pb-2 border-b">
                    <div>Set</div>
                    <div className="text-center">Distance (mi)</div>
                    <div className="text-center">Time (min)</div>
                    <div className="text-center">Done</div>
                  </div>
                  {sets.map((set, index) => {
                    const isCurrentSet = index === currentSetIndex && !set.completed;
                    const isActive = isCurrentSet && trackingState === "in_set";
                    
                    return (
                      <div
                        key={set.setNumber}
                        className={`grid grid-cols-4 gap-2 sm:gap-4 items-center py-2 rounded-md px-1 sm:px-2 ${
                          set.completed ? 'bg-accent' : ''
                        } ${isActive ? 'border-2 border-primary bg-primary/5' : isCurrentSet ? 'border border-muted-foreground/30' : ''}`}
                        data-testid={`row-set-${set.setNumber}`}
                      >
                        <div className="font-medium text-sm sm:text-base">{set.setNumber}</div>
                        <Input
                          type="number"
                          step="0.1"
                          value={set.distance || ""}
                          onChange={(e) => {
                            const newSets = [...sets];
                            newSets[index].distance = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            setCurrentSets(newSets);
                          }}
                          className="text-center text-sm h-9 sm:h-10"
                          data-testid={`input-distance-${set.setNumber}`}
                        />
                        <Input
                          type="number"
                          value={set.time || ""}
                          onChange={(e) => {
                            const newSets = [...sets];
                            newSets[index].time = e.target.value === "" ? 0 : parseInt(e.target.value);
                            setCurrentSets(newSets);
                          }}
                          className="text-center text-sm h-9 sm:h-10"
                          data-testid={`input-time-${set.setNumber}`}
                        />
                        <div className="flex justify-center">
                          <Checkbox
                            checked={set.completed}
                            onCheckedChange={(checked) => {
                              const newSets = [...sets];
                              newSets[index].completed = !!checked;
                              setCurrentSets(newSets);
                              if (checked && index === currentSetIndex) {
                                if (currentSetIndex < sets.length - 1) {
                                  if (restTimerOnManualComplete) {
                                    // Don't increment set index here - handleRestTimerClose will do it
                                    setTrackingState("resting");
                                  } else {
                                    setCurrentSetIndex(currentSetIndex + 1);
                                    setTrackingState("not_started");
                                  }
                                } else {
                                  setTrackingState("not_started");
                                }
                              }
                            }}
                            data-testid={`checkbox-complete-${set.setNumber}`}
                            className="h-5 w-5 sm:h-6 sm:w-6"
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2 sm:gap-4 font-semibold text-xs sm:text-sm pb-2 border-b">
                    <div>Set</div>
                    <div className="text-center">Weight</div>
                    <div className="text-center">Reps</div>
                    <div className="text-center">Done</div>
                  </div>
                  {sets.map((set, index) => {
                    const isCurrentSet = index === currentSetIndex && !set.completed;
                    const isActive = isCurrentSet && trackingState === "in_set";
                    
                    return (
                      <div
                        key={set.setNumber}
                        className={`grid grid-cols-4 gap-2 sm:gap-4 items-center py-2 rounded-md px-1 sm:px-2 ${
                          set.completed ? 'bg-accent' : ''
                        } ${isActive ? 'border-2 border-primary bg-primary/5' : isCurrentSet ? 'border border-muted-foreground/30' : ''}`}
                        data-testid={`row-set-${set.setNumber}`}
                      >
                        <div className="font-medium text-sm sm:text-base">{set.setNumber}</div>
                        <Input
                          type="number"
                          value={set.weight || ""}
                          onChange={(e) => {
                            const newSets = [...sets];
                            newSets[index].weight = e.target.value === "" ? 0 : parseInt(e.target.value);
                            setCurrentSets(newSets);
                          }}
                          className="text-center text-sm h-9 sm:h-10"
                          data-testid={`input-weight-${set.setNumber}`}
                        />
                        <Input
                          type="number"
                          value={set.reps || ""}
                          onChange={(e) => {
                            const newSets = [...sets];
                            newSets[index].reps = e.target.value === "" ? 0 : parseInt(e.target.value);
                            setCurrentSets(newSets);
                          }}
                          className="text-center text-sm h-9 sm:h-10"
                          data-testid={`input-reps-${set.setNumber}`}
                        />
                        <div className="flex justify-center">
                          <Checkbox
                            checked={set.completed}
                            onCheckedChange={(checked) => {
                              const newSets = [...sets];
                              newSets[index].completed = !!checked;
                              setCurrentSets(newSets);
                              if (checked && index === currentSetIndex) {
                                if (currentSetIndex < sets.length - 1) {
                                  if (restTimerOnManualComplete) {
                                    // Don't increment set index here - handleRestTimerClose will do it
                                    setTrackingState("resting");
                                  } else {
                                    setCurrentSetIndex(currentSetIndex + 1);
                                    setTrackingState("not_started");
                                  }
                                } else {
                                  setTrackingState("not_started");
                                }
                              }
                            }}
                            data-testid={`checkbox-complete-${set.setNumber}`}
                            className="h-5 w-5 sm:h-6 sm:w-6"
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {allSetsCompleted && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={handleAddSet}
                  data-testid="button-add-set"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Set
                </Button>
              )}
            </div>

            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <label className="text-xs sm:text-sm font-medium whitespace-nowrap">Rest:</label>
                <Input
                  type="number"
                  value={restTimerDuration}
                  onChange={(e) => setRestTimerDuration(parseInt(e.target.value) || 90)}
                  className="w-16 sm:w-24 text-center h-9 sm:h-10"
                  data-testid="input-rest-timer"
                />
                <span className="text-xs sm:text-sm text-muted-foreground">sec</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowRestTimer(true)}
                  data-testid="button-start-rest-timer"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>

              <Button
                className="w-full"
                onClick={handlePrimaryButtonClick}
                data-testid="button-primary-action"
              >
                {allSetsCompleted && <Check className="h-4 w-4 mr-2" />}
                {getPrimaryButtonText()}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:gap-3">
          <Button variant="outline" className="w-full text-sm" onClick={() => { flushProgress(); setIsEditDialogOpen(true); }} data-testid="button-edit-workout">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Workout
          </Button>
          <Button variant="outline" className="w-full text-sm" onClick={handleEndWorkout} data-testid="button-end-workout">
            End Workout
          </Button>
        </div>

        <WorkoutEditorDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={handleEditSave}
          initialData={{
            id: activeWorkout.id,
            name: activeWorkout.name,
            exercises: activeWorkout.exercises,
            date: new Date(),
            repeatType: "none",
            repeatInterval: 1,
          }}
          availableExercises={exercises.map(ex => ({ 
            ...ex, 
            muscleGroups: (ex.muscleGroups || []) as string[],
            imageUrl: ex.imageUrl ?? undefined,
            exerciseType: ex.exerciseType as "weight_reps" | "distance_time" | undefined,
          }))}
        />

        <RestTimer
          isOpen={trackingState === "resting"}
          onClose={handleRestTimerClose}
          initialSeconds={restTimerDuration}
          exerciseName={currentExercise?.name}
          nextExerciseName={currentExerciseIndex < activeWorkout.exercises.length - 1 ? activeWorkout.exercises[currentExerciseIndex + 1]?.name : undefined}
        />
      </div>
    </div>
  );
}
