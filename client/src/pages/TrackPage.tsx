import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RestTimer } from "@/components/RestTimer";
import { ChevronRight, ChevronLeft, Check, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useWorkout } from "@/context/WorkoutContext";

interface SetData {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

type TrackingState = "not_started" | "in_set" | "resting";

export default function TrackPage() {
  const [, setLocation] = useLocation();
  const { activeWorkout, endWorkout, completeWorkout } = useWorkout();
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [trackingState, setTrackingState] = useState<TrackingState>("not_started");
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [restTimerDuration, setRestTimerDuration] = useState(90);
  const [exerciseSets, setExerciseSets] = useState<Map<number, SetData[]>>(new Map());

  const getDefaultSets = (): SetData[] => [
    { setNumber: 1, weight: 135, reps: 10, completed: false },
    { setNumber: 2, weight: 135, reps: 10, completed: false },
    { setNumber: 3, weight: 135, reps: 10, completed: false },
  ];

  const getCurrentSets = (): SetData[] => {
    return exerciseSets.get(currentExerciseIndex) || getDefaultSets();
  };

  const setCurrentSets = (sets: SetData[]) => {
    const newMap = new Map(exerciseSets);
    newMap.set(currentExerciseIndex, sets);
    setExerciseSets(newMap);
  };

  useEffect(() => {
    if (!exerciseSets.has(currentExerciseIndex)) {
      const newMap = new Map(exerciseSets);
      newMap.set(currentExerciseIndex, getDefaultSets());
      setExerciseSets(newMap);
    }
  }, [currentExerciseIndex]);

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
      completeWorkout();
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
      weight: lastSet?.weight || 135,
      reps: lastSet?.reps || 10,
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
    endWorkout();
    setLocation("/");
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
                  {currentExercise.muscleGroup}
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
                      value={set.weight}
                      onChange={(e) => {
                        const newSets = [...sets];
                        newSets[index].weight = parseInt(e.target.value) || 0;
                        setCurrentSets(newSets);
                      }}
                      className="text-center text-sm h-9 sm:h-10"
                      data-testid={`input-weight-${set.setNumber}`}
                    />
                    <Input
                      type="number"
                      value={set.reps}
                      onChange={(e) => {
                        const newSets = [...sets];
                        newSets[index].reps = parseInt(e.target.value) || 0;
                        setCurrentSets(newSets);
                      }}
                      className="text-center text-sm h-9 sm:h-10"
                      data-testid={`input-reps-${set.setNumber}`}
                    />
                    <div className="flex justify-center">
                      <Checkbox
                        checked={set.completed}
                        disabled
                        data-testid={`checkbox-complete-${set.setNumber}`}
                        className="h-5 w-5 sm:h-6 sm:w-6"
                      />
                    </div>
                  </div>
                );
              })}

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
              </div>

              <Button
                className="w-full text-base py-6"
                onClick={handlePrimaryButtonClick}
                data-testid="button-primary-action"
              >
                {allSetsCompleted && <Check className="h-5 w-5 mr-2" />}
                {getPrimaryButtonText()}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 sm:gap-4">
          <Button variant="outline" className="flex-1 text-sm" onClick={handleEndWorkout} data-testid="button-end-workout">
            End Workout
          </Button>
        </div>

        <RestTimer
          isOpen={trackingState === "resting"}
          onClose={handleRestTimerClose}
          initialSeconds={restTimerDuration}
        />
      </div>
    </div>
  );
}
