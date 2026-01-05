import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Dumbbell, TrendingUp, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useWorkout } from "@/context/WorkoutContext";

interface SetDetail {
  setNumber?: number;
  weight?: number;
  reps?: number;
  distance?: number;
  time?: number;
  completed?: boolean;
}

interface ExerciseDetail {
  id?: string;
  name: string;
  muscleGroups?: string[];
  sets: SetDetail[];
  setsData?: SetDetail[];
}

interface WorkoutHistoryCardProps {
  id: string;
  workoutId?: string;
  workoutName: string;
  date: Date;
  duration: number;
  exerciseCount: number;
  totalVolume: number;
  totalSets?: number;
  exercises?: ExerciseDetail[];
}

export function WorkoutHistoryCard({
  id,
  workoutId,
  workoutName,
  date,
  exerciseCount,
  totalVolume,
  totalSets = 0,
  exercises = [],
}: WorkoutHistoryCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedExercises, setEditedExercises] = useState<ExerciseDetail[]>([]);
  const { updateCompletedWorkout } = useWorkout();

  const completedSets = totalSets || exercises.reduce((total, ex) => 
    total + ex.sets.filter(s => s.completed).length, 0
  );

  const startEditing = () => {
    setEditedExercises(exercises.map(ex => {
      // If exercise has no sets, seed with one empty set so user can add data
      const sets = ex.sets.length > 0 
        ? ex.sets.map(s => ({ ...s }))
        : [{ setNumber: 1, weight: 0, reps: 0, completed: true }];
      return {
        ...ex,
        sets,
      };
    }));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedExercises([]);
  };

  const saveEditing = () => {
    if (!workoutId) return;
    
    const updatedExercises = editedExercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      muscleGroups: ex.muscleGroups || [],
      setsData: ex.sets,
    }));
    
    updateCompletedWorkout(workoutId, workoutName, updatedExercises);
    setIsEditing(false);
    setEditedExercises([]);
  };

  const updateSet = (exerciseIdx: number, setIdx: number, field: keyof SetDetail, value: number) => {
    setEditedExercises(prev => {
      const newExercises = [...prev];
      const exercise = { ...newExercises[exerciseIdx] };
      const sets = [...exercise.sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      exercise.sets = sets;
      newExercises[exerciseIdx] = exercise;
      return newExercises;
    });
  };

  const displayExercises = isEditing ? editedExercises : exercises;

  return (
    <Card data-testid={`card-history-${id}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-semibold mb-2 truncate" data-testid={`text-history-name-${id}`}>
                {workoutName}
              </CardTitle>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span data-testid={`text-history-date-${id}`}>{format(date, "PP")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Dumbbell className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span data-testid={`text-history-sets-${id}`}>{completedSets} sets</span>
                </div>
                {totalVolume > 0 && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span data-testid={`text-history-volume-${id}`}>{totalVolume.toLocaleString()} lbs</span>
                  </div>
                )}
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-expand-${id}`}>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="flex justify-end mb-3 gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={cancelEditing} data-testid={`button-cancel-edit-${id}`}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEditing} data-testid={`button-save-edit-${id}`}>
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={startEditing} data-testid={`button-edit-${id}`}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit Sets
                </Button>
              )}
            </div>
            <div className="space-y-3 sm:space-y-4">
              {displayExercises.map((exercise, exIdx) => {
                const completedSetsForExercise = exercise.sets.filter(s => s.completed);
                // In edit mode, show exercises even with no completed sets so user can add data
                // In view mode, skip exercises with no completed sets
                if (completedSetsForExercise.length === 0 && !isEditing) return null;
                
                const setsToDisplay = isEditing ? exercise.sets : completedSetsForExercise;
                const isCardioStyle = exercise.sets.some(s => s.distance || s.time);
                
                return (
                  <div key={exIdx} className="border-l-2 border-primary pl-3 sm:pl-4">
                    <h4 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">{exercise.name}</h4>
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                      {setsToDisplay.map((set, setIdx) => {
                        const originalSetIdx = exercise.sets.findIndex(s => s === set);
                        
                        if (isEditing) {
                          return (
                            <div key={setIdx} className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium w-12">Set {setIdx + 1}:</span>
                              {isCardioStyle ? (
                                <>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={set.distance || ""}
                                    onChange={(e) => updateSet(exIdx, originalSetIdx, 'distance', parseFloat(e.target.value) || 0)}
                                    className="w-16 h-8 text-center"
                                    data-testid={`input-distance-${id}-${exIdx}-${setIdx}`}
                                  />
                                  <span>mi in</span>
                                  <Input
                                    type="number"
                                    value={set.time || ""}
                                    onChange={(e) => updateSet(exIdx, originalSetIdx, 'time', parseInt(e.target.value) || 0)}
                                    className="w-16 h-8 text-center"
                                    data-testid={`input-time-${id}-${exIdx}-${setIdx}`}
                                  />
                                  <span>min</span>
                                </>
                              ) : (
                                <>
                                  <Input
                                    type="number"
                                    value={set.weight || ""}
                                    onChange={(e) => updateSet(exIdx, originalSetIdx, 'weight', parseInt(e.target.value) || 0)}
                                    className="w-16 h-8 text-center"
                                    data-testid={`input-weight-${id}-${exIdx}-${setIdx}`}
                                  />
                                  <span>lbs ×</span>
                                  <Input
                                    type="number"
                                    value={set.reps || ""}
                                    onChange={(e) => updateSet(exIdx, originalSetIdx, 'reps', parseInt(e.target.value) || 0)}
                                    className="w-16 h-8 text-center"
                                    data-testid={`input-reps-${id}-${exIdx}-${setIdx}`}
                                  />
                                  <span>reps</span>
                                </>
                              )}
                            </div>
                          );
                        }
                        
                        return (
                          <div key={setIdx} data-testid={`text-set-${id}-${exIdx}-${setIdx}`}>
                            {set.weight && set.reps ? (
                              `Set ${setIdx + 1}: ${set.weight} lbs × ${set.reps}`
                            ) : set.distance && set.time ? (
                              `Set ${setIdx + 1}: ${set.distance} mi in ${set.time} min`
                            ) : (
                              `Set ${setIdx + 1}: Completed`
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
