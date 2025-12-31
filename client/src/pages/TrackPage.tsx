import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RestTimer } from "@/components/RestTimer";
import { Timer, ChevronRight, ChevronLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SetData {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export default function TrackPage() {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [restTimerDuration, setRestTimerDuration] = useState(90);
  const [sets, setSets] = useState<SetData[]>([
    { setNumber: 1, weight: 135, reps: 10, completed: false },
    { setNumber: 2, weight: 185, reps: 8, completed: false },
    { setNumber: 3, weight: 225, reps: 6, completed: false },
  ]);

  const mockWorkout = {
    name: "Upper Body Strength",
    exercises: [
      { name: "Bench Press", muscleGroup: "Chest" },
      { name: "Barbell Row", muscleGroup: "Back" },
      { name: "Shoulder Press", muscleGroup: "Shoulders" },
    ],
  };

  const currentExercise = mockWorkout.exercises[currentExerciseIndex];
  const progress = ((currentExerciseIndex + 1) / mockWorkout.exercises.length) * 100;

  const handleSetComplete = (setNumber: number) => {
    const setIndex = sets.findIndex(s => s.setNumber === setNumber);
    
    if (setIndex !== currentSetIndex || sets[setIndex].completed) {
      return;
    }

    const newSets = [...sets];
    newSets[setIndex].completed = true;
    setSets(newSets);
    setShowRestTimer(true);
    
    console.log("Set completed:", setNumber);
  };

  const handleRestTimerClose = () => {
    setShowRestTimer(false);
    if (currentSetIndex < sets.length - 1) {
      setCurrentSetIndex(currentSetIndex + 1);
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < mockWorkout.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetIndex(0);
      setSets([
        { setNumber: 1, weight: 135, reps: 10, completed: false },
        { setNumber: 2, weight: 185, reps: 8, completed: false },
        { setNumber: 3, weight: 225, reps: 6, completed: false },
      ]);
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setCurrentSetIndex(0);
      setSets([
        { setNumber: 1, weight: 135, reps: 10, completed: false },
        { setNumber: 2, weight: 185, reps: 8, completed: false },
        { setNumber: 3, weight: 225, reps: 6, completed: false },
      ]);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">
            {mockWorkout.name}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Exercise {currentExerciseIndex + 1} of {mockWorkout.exercises.length}
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
                disabled={currentExerciseIndex === mockWorkout.exercises.length - 1}
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
              {sets.map((set, index) => (
                <div
                  key={set.setNumber}
                  className={`grid grid-cols-4 gap-2 sm:gap-4 items-center py-2 rounded-md px-1 sm:px-2 ${
                    set.completed ? 'bg-accent' : ''
                  } ${index === currentSetIndex && !set.completed ? 'border-2 border-primary' : ''}`}
                  data-testid={`row-set-${set.setNumber}`}
                >
                  <div className="font-medium text-sm sm:text-base">{set.setNumber}</div>
                  <Input
                    type="number"
                    value={set.weight}
                    onChange={(e) => {
                      const newSets = [...sets];
                      newSets[index].weight = parseInt(e.target.value) || 0;
                      setSets(newSets);
                    }}
                    className="text-center text-sm h-9 sm:h-10"
                    data-testid={`input-weight-${set.setNumber}`}
                    disabled={index !== currentSetIndex || set.completed}
                  />
                  <Input
                    type="number"
                    value={set.reps}
                    onChange={(e) => {
                      const newSets = [...sets];
                      newSets[index].reps = parseInt(e.target.value) || 0;
                      setSets(newSets);
                    }}
                    className="text-center text-sm h-9 sm:h-10"
                    data-testid={`input-reps-${set.setNumber}`}
                    disabled={index !== currentSetIndex || set.completed}
                  />
                  <div className="flex justify-center">
                    <Checkbox
                      checked={set.completed}
                      onCheckedChange={() => handleSetComplete(set.setNumber)}
                      data-testid={`checkbox-complete-${set.setNumber}`}
                      disabled={index !== currentSetIndex || set.completed}
                      className="h-5 w-5 sm:h-6 sm:w-6"
                    />
                  </div>
                </div>
              ))}
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
                className="w-full"
                variant="outline"
                onClick={() => setShowRestTimer(true)}
                data-testid="button-start-rest"
              >
                <Timer className="h-4 w-4 mr-2" />
                <span className="text-sm">Start Rest Timer</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 sm:gap-4">
          <Button variant="outline" className="flex-1 text-sm" data-testid="button-pause-workout">
            Pause
          </Button>
          <Button className="flex-1 text-sm" data-testid="button-finish-workout">
            Finish
          </Button>
        </div>

        <RestTimer
          isOpen={showRestTimer}
          onClose={handleRestTimerClose}
          initialSeconds={restTimerDuration}
        />
      </div>
    </div>
  );
}
