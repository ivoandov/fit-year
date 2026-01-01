import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Dumbbell, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface SetDetail {
  weight?: number;
  reps?: number;
  distance?: number;
  time?: number;
  completed?: boolean;
}

interface ExerciseDetail {
  name: string;
  sets: SetDetail[];
}

interface WorkoutHistoryCardProps {
  id: string;
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
  workoutName,
  date,
  exerciseCount,
  totalVolume,
  totalSets = 0,
  exercises = [],
}: WorkoutHistoryCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Count completed sets from exercises
  const completedSets = totalSets || exercises.reduce((total, ex) => 
    total + ex.sets.filter(s => s.completed).length, 0
  );

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
            <div className="space-y-3 sm:space-y-4">
              {exercises.map((exercise, idx) => {
                const completedSetsForExercise = exercise.sets.filter(s => s.completed);
                if (completedSetsForExercise.length === 0) return null;
                
                return (
                  <div key={idx} className="border-l-2 border-primary pl-3 sm:pl-4">
                    <h4 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">{exercise.name}</h4>
                    <div className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-muted-foreground">
                      {completedSetsForExercise.map((set, setIdx) => (
                        <div key={setIdx}>
                          {set.weight && set.reps ? (
                            `Set ${setIdx + 1}: ${set.weight} lbs × ${set.reps}`
                          ) : set.distance && set.time ? (
                            `Set ${setIdx + 1}: ${set.distance} mi in ${set.time} min`
                          ) : (
                            `Set ${setIdx + 1}: Completed`
                          )}
                        </div>
                      ))}
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
