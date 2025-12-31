import { useState } from "react";
import { useLocation } from "wouter";
import { WorkoutEditorDialog, type WorkoutData } from "@/components/WorkoutEditorDialog";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, Pencil, Trash2, Play, Check, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { exerciseLibrary, type Exercise } from "@/data/exercises";
import { useWorkout } from "@/context/WorkoutContext";
import { Badge } from "@/components/ui/badge";

interface ScheduledWorkout {
  id: string;
  name: string;
  date: Date;
  repeatType: "none" | "daily" | "weekly" | "custom";
  repeatInterval?: number;
  exercises: Exercise[];
}

export default function WorkoutsPage() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<ScheduledWorkout | null>(null);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const { toast } = useToast();
  const { startWorkout, isWorkoutCompleted, completedWorkouts, restartWorkout } = useWorkout();

  const handleStartWorkout = (workoutId: string) => {
    const baseId = workoutId.split("-")[0];
    const workout = scheduledWorkouts.find(w => w.id === baseId);
    if (workout) {
      startWorkout({
        id: workout.id,
        displayId: workoutId,
        name: workout.name,
        exercises: workout.exercises,
      });
      setLocation("/track");
    }
  };

  const handleSaveWorkout = (data: WorkoutData) => {
    if (data.id) {
      setScheduledWorkouts(workouts =>
        workouts.map(w => w.id === data.id ? { ...data, id: data.id } as ScheduledWorkout : w)
      );
      toast({
        title: "Workout Updated",
        description: `${data.name} has been updated successfully.`,
      });
    } else {
      const newWorkout: ScheduledWorkout = {
        ...data,
        id: Date.now().toString(),
      };
      setScheduledWorkouts([...scheduledWorkouts, newWorkout]);

      const repeatText =
        data.repeatType === "daily"
          ? " (repeating daily)"
          : data.repeatType === "weekly"
          ? " (repeating weekly)"
          : data.repeatType === "custom"
          ? ` (repeating every ${data.repeatInterval} days)`
          : "";

      toast({
        title: "Workout Created",
        description: `${data.name} scheduled for ${format(data.date, "PPP")}${repeatText}`,
      });
    }
    setEditingWorkout(null);
  };

  const handleEditWorkout = (workoutId: string) => {
    const baseId = workoutId.split("-")[0];
    const workout = scheduledWorkouts.find(w => w.id === baseId);
    if (workout) {
      setEditingWorkout(workout);
      setShowEditorDialog(true);
    }
  };

  const handleDeleteWorkout = (workoutId: string) => {
    const baseId = workoutId.split("-")[0];
    setScheduledWorkouts(workouts => workouts.filter(w => w.id !== baseId));
    toast({
      title: "Workout Deleted",
      description: "The workout has been removed from your schedule.",
    });
  };

  const handleNewWorkout = () => {
    setEditingWorkout(null);
    setShowEditorDialog(true);
  };

  const handleRestartWorkout = (completedWorkout: typeof completedWorkouts[0]) => {
    restartWorkout(completedWorkout);
    setLocation("/track");
  };

  const getDisplayedWorkouts = () => {
    const workouts: (ScheduledWorkout & { displayId: string })[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = addDays(today, 30);

    scheduledWorkouts.forEach((workout) => {
      let currentDate = new Date(workout.date);
      currentDate.setHours(0, 0, 0, 0);
      
      while (currentDate <= thirtyDaysFromNow) {
        if (currentDate >= today) {
          workouts.push({
            ...workout,
            displayId: `${workout.id}-${currentDate.toISOString()}`,
            date: new Date(currentDate),
          });
        }

        if (workout.repeatType === "none") {
          break;
        } else if (workout.repeatType === "daily") {
          currentDate = addDays(currentDate, 1);
        } else if (workout.repeatType === "weekly") {
          currentDate = addDays(currentDate, 7);
        } else if (workout.repeatType === "custom" && workout.repeatInterval) {
          currentDate = addDays(currentDate, workout.repeatInterval);
        } else {
          break;
        }
      }
    });

    return workouts.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const displayedWorkouts = getDisplayedWorkouts();

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">
              Scheduled Workouts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your upcoming fitness sessions
            </p>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="sm:size-default" data-testid="button-calendar">
                  <CalendarIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{format(selectedDate, "PPP")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  data-testid="calendar-picker"
                />
              </PopoverContent>
            </Popover>
            <Button
              onClick={handleNewWorkout}
              size="sm"
              className="sm:size-default"
              data-testid="button-add-workout"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Workout</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {displayedWorkouts.map((workout) => {
            const completed = isWorkoutCompleted(workout.displayId);
            return (
              <Card 
                key={workout.displayId} 
                className={`hover-elevate ${completed ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : ''}`}
                data-testid={`card-workout-${workout.displayId}`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 sm:p-6 pb-2 sm:pb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base sm:text-lg font-semibold truncate" data-testid={`text-workout-name-${workout.displayId}`}>
                        {workout.name}
                      </CardTitle>
                      {completed && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-400 dark:border-green-700 shrink-0">
                          <Check className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {format(workout.date, "PP")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!completed && (
                      <Button
                        size="icon"
                        onClick={() => handleStartWorkout(workout.displayId)}
                        data-testid={`button-start-workout-${workout.displayId}`}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-menu-${workout.displayId}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditWorkout(workout.displayId)} data-testid={`button-edit-${workout.displayId}`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteWorkout(workout.displayId)}
                          className="text-destructive"
                          data-testid={`button-delete-${workout.displayId}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {workout.exercises.length} exercises
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {workout.exercises.slice(0, 3).map((ex) => (
                      <span key={ex.id} className="text-xs bg-accent px-2 py-0.5 rounded">
                        {ex.name}
                      </span>
                    ))}
                    {workout.exercises.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{workout.exercises.length - 3} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {displayedWorkouts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No workouts scheduled</p>
            <Button
              onClick={handleNewWorkout}
              data-testid="button-create-first"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Workout
            </Button>
          </div>
        )}

        {completedWorkouts.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" data-testid="text-recent-workouts-title">
                Recent Workouts
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your completed sessions
              </p>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {completedWorkouts.slice(0, 6).map((workout, index) => (
                <Card 
                  key={`${workout.displayId}-${index}`}
                  className="hover-elevate border-green-500/30 bg-green-50/20 dark:bg-green-950/10"
                  data-testid={`card-recent-workout-${index}`}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 sm:p-6 pb-2 sm:pb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base sm:text-lg font-semibold truncate">
                          {workout.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(workout.completedAt, "PP 'at' p")}</span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      onClick={() => handleRestartWorkout(workout)}
                      data-testid={`button-restart-workout-${index}`}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {workout.exercises.length} exercises
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {workout.exercises.slice(0, 3).map((ex) => (
                        <span key={ex.id} className="text-xs bg-accent px-2 py-0.5 rounded">
                          {ex.name}
                        </span>
                      ))}
                      {workout.exercises.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{workout.exercises.length - 3} more
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <WorkoutEditorDialog
          isOpen={showEditorDialog}
          onClose={() => {
            setShowEditorDialog(false);
            setEditingWorkout(null);
          }}
          onSave={handleSaveWorkout}
          initialData={editingWorkout}
          availableExercises={exerciseLibrary}
        />
      </div>
    </div>
  );
}
