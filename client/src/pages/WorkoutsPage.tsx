import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical } from "lucide-react";
import { type Exercise } from "@/data/exercises";
import { useWorkout } from "@/context/WorkoutContext";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ScheduledWorkout {
  id: string;
  name: string;
  date: Date;
  exercises: Exercise[];
  templateId?: string;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: Exercise[];
}

interface DBScheduledWorkout {
  id: string;
  name: string;
  date: string;
  exercises: any;
  templateId?: string;
}

interface DBWorkoutTemplate {
  id: string;
  name: string;
  exercises: any;
}

interface DBExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  description: string;
  imageUrl: string | null;
  exerciseType: string | null;
}

export default function WorkoutsPage() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<ScheduledWorkout | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [workoutToDelete, setWorkoutToDelete] = useState<{ id: string; name: string; isTemplate?: boolean; isCompleted?: boolean } | null>(null);
  const { toast } = useToast();
  const { startWorkout, isWorkoutCompleted, completedWorkouts, restartWorkout, updateCompletedWorkout, deleteCompletedWorkout } = useWorkout();
  const [editingCompletedWorkout, setEditingCompletedWorkout] = useState<{ id: string; name: string; exercises: Exercise[] } | null>(null);

  const { data: dbWorkouts = [], isLoading } = useQuery<DBScheduledWorkout[]>({
    queryKey: ["/api/scheduled-workouts"],
  });

  const { data: dbTemplates = [], isLoading: isLoadingTemplates } = useQuery<DBWorkoutTemplate[]>({
    queryKey: ["/api/workout-templates"],
  });

  const { data: dbExercises = [] } = useQuery<DBExercise[]>({
    queryKey: ["/api/exercises"],
  });

  const allAvailableExercises: Exercise[] = dbExercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    muscleGroups: ex.muscleGroups,
    description: ex.description,
    imageUrl: ex.imageUrl || undefined,
    exerciseType: (ex.exerciseType as "weight_reps" | "distance_time") || "weight_reps",
  }));

  const scheduledWorkouts: ScheduledWorkout[] = dbWorkouts.map((w) => ({
    id: w.id,
    name: w.name,
    date: new Date(w.date),
    exercises: (w.exercises as any[]).map((ex: any) => ({
      ...ex,
      muscleGroups: ex.muscleGroups || [],
    })) as Exercise[],
    templateId: w.templateId,
  }));

  const workoutTemplates: WorkoutTemplate[] = dbTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    exercises: (t.exercises as any[]).map((ex: any) => ({
      ...ex,
      muscleGroups: ex.muscleGroups || [],
    })) as Exercise[],
  }));

  const createTemplateMutation = useMutation({
    mutationFn: async (template: { name: string; exercises: Exercise[] }) => {
      return apiRequest("POST", "/api/workout-templates", {
        name: template.name,
        exercises: template.exercises,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-templates"] });
    },
    onError: (error) => {
      console.error("Failed to create workout template:", error);
      toast({
        title: "Error",
        description: "Failed to create workout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...template }: { id: string; name: string; exercises: Exercise[] }) => {
      return apiRequest("PUT", `/api/workout-templates/${id}`, {
        name: template.name,
        exercises: template.exercises,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-templates"] });
    },
    onError: (error) => {
      console.error("Failed to update workout template:", error);
      toast({
        title: "Error",
        description: "Failed to update workout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/workout-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-templates"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (workout: { name: string; date: Date; exercises: Exercise[]; templateId?: string }) => {
      return apiRequest("POST", "/api/scheduled-workouts", {
        name: workout.name,
        date: workout.date.toISOString(),
        exercises: workout.exercises,
        templateId: workout.templateId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-workouts"] });
    },
    onError: (error) => {
      console.error("Failed to create workout:", error);
      toast({
        title: "Error",
        description: "Failed to schedule workout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...workout }: { id: string; name: string; date: Date; exercises: Exercise[] }) => {
      return apiRequest("PUT", `/api/scheduled-workouts/${id}`, {
        name: workout.name,
        date: workout.date.toISOString(),
        exercises: workout.exercises,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-workouts"] });
    },
    onError: (error) => {
      console.error("Failed to update workout:", error);
      toast({
        title: "Error",
        description: "Failed to update workout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/scheduled-workouts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-workouts"] });
    },
  });

  const handleStartWorkout = (workoutId: string) => {
    const workout = scheduledWorkouts.find(w => w.id === workoutId);
    if (workout) {
      startWorkout({
        id: workout.id,
        displayId: workoutId,
        scheduledWorkoutId: workout.id,
        name: workout.name,
        exercises: workout.exercises,
      });
      setLocation("/track");
    }
  };

  const handleSaveWorkout = async (data: WorkoutData) => {
    if (editingCompletedWorkout) {
      // Editing a completed workout - only name can be changed to preserve set data
      updateCompletedWorkout(editingCompletedWorkout.id, data.name);
      toast({
        title: "Workout Updated",
        description: `${data.name} has been updated successfully.`,
      });
      setEditingCompletedWorkout(null);
    } else if (editingTemplateId) {
      // Editing an existing template
      updateTemplateMutation.mutate({
        id: editingTemplateId,
        name: data.name,
        exercises: data.exercises,
      });
      toast({
        title: "Workout Updated",
        description: `${data.name} has been updated successfully.`,
      });
      setEditingTemplateId(null);
    } else if (data.id) {
      // Editing an existing scheduled workout
      updateMutation.mutate({
        id: data.id,
        name: data.name,
        date: data.date,
        exercises: data.exercises,
      });
      toast({
        title: "Workout Updated",
        description: `${data.name} has been updated successfully.`,
      });
    } else {
      // Create both a template AND schedule the workout
      try {
        const templateRes = await apiRequest("POST", "/api/workout-templates", {
          name: data.name,
          exercises: data.exercises,
        });
        const template = await templateRes.json();
        
        // Schedule the workout linked to the template
        createMutation.mutate({
          name: data.name,
          date: data.date,
          exercises: data.exercises,
          templateId: template.id,
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/workout-templates"] });
        
        toast({
          title: "Workout Created",
          description: `${data.name} scheduled for ${format(data.date, "PPP")}`,
        });
      } catch (error) {
        console.error("Failed to create workout:", error);
        toast({
          title: "Error",
          description: "Failed to create workout. Please try again.",
          variant: "destructive",
        });
      }
    }
    setEditingWorkout(null);
  };

  const handleEditWorkout = (workoutId: string) => {
    const workout = scheduledWorkouts.find(w => w.id === workoutId);
    if (workout) {
      setEditingWorkout(workout);
      setShowEditorDialog(true);
    }
  };

  const handleDeleteWorkout = (workoutId: string, workoutName: string) => {
    setWorkoutToDelete({ id: workoutId, name: workoutName });
  };

  const confirmDeleteWorkout = () => {
    if (workoutToDelete) {
      if (workoutToDelete.isTemplate) {
        deleteTemplateMutation.mutate(workoutToDelete.id);
        toast({
          title: "Workout Deleted",
          description: "The workout has been removed from your library.",
        });
      } else if (workoutToDelete.isCompleted) {
        deleteCompletedWorkout(workoutToDelete.id);
        toast({
          title: "Workout Deleted",
          description: "The completed workout has been removed from your history.",
        });
      } else {
        deleteMutation.mutate(workoutToDelete.id);
        toast({
          title: "Workout Deleted",
          description: "The workout has been removed from your schedule.",
        });
      }
      setWorkoutToDelete(null);
    }
  };

  const handleNewWorkout = () => {
    setEditingWorkout(null);
    setShowEditorDialog(true);
  };

  const handleRestartWorkout = (completedWorkout: typeof completedWorkouts[0]) => {
    restartWorkout(completedWorkout);
    setLocation("/track");
  };

  const handleStartFromTemplate = (templateId: string) => {
    const template = workoutTemplates.find(t => t.id === templateId);
    if (template) {
      // Start workout directly from template (no scheduling needed)
      startWorkout({
        id: templateId,
        displayId: `template-${templateId}-${Date.now()}`,
        name: template.name,
        exercises: template.exercises,
      });
      setLocation("/track");
    }
  };

  const handleEditTemplate = (templateId: string) => {
    const template = workoutTemplates.find(t => t.id === templateId);
    if (template) {
      // Track that we're editing a template
      setEditingTemplateId(templateId);
      setEditingWorkout({
        id: template.id,
        name: template.name,
        date: new Date(), // Default to today for the date picker
        exercises: template.exercises,
      });
      setShowEditorDialog(true);
    }
  };

  const handleDeleteTemplate = (templateId: string, templateName: string) => {
    setWorkoutToDelete({ id: templateId, name: templateName, isTemplate: true });
  };

  const handleEditCompletedWorkout = (workout: { id: string; name: string; exercises: Exercise[] }) => {
    setEditingCompletedWorkout(workout);
    setEditingWorkout({
      id: workout.id,
      name: workout.name,
      date: new Date(),
      exercises: workout.exercises,
    });
    setShowEditorDialog(true);
  };

  const handleDeleteCompletedWorkout = (id: string, name: string) => {
    setWorkoutToDelete({ id, name, isTemplate: false, isCompleted: true });
  };

  const getDisplayedWorkouts = () => {
    const workouts: (ScheduledWorkout & { displayId: string })[] = [];

    scheduledWorkouts.forEach((workout) => {
      workouts.push({
        ...workout,
        displayId: workout.id,
      });
    });

    return workouts.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const displayedWorkouts = getDisplayedWorkouts();
  const todayWorkouts = displayedWorkouts.filter(
    (w) => format(w.date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  );
  const upcomingWorkouts = displayedWorkouts.filter(
    (w) => format(w.date, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd")
  );

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const selectedDateWorkouts = displayedWorkouts.filter(
    (w) => format(w.date, "yyyy-MM-dd") === selectedDateStr
  );

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto h-full">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-8 sm:pb-12">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading workouts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto h-full">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-8 sm:pb-12 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">
              Scheduled Workouts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Plan and manage your training schedule
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" data-testid="button-calendar">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleNewWorkout} data-testid="button-new-workout">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Workout</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {todayWorkouts.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Today</h2>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {todayWorkouts.map((workout) => {
                const isCompleted = isWorkoutCompleted(workout.displayId);
                return (
                  <Card 
                    key={workout.displayId}
                    className={`hover-elevate ${isCompleted ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : ''}`}
                    data-testid={`card-workout-${workout.displayId}`}
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 sm:p-6 pb-2 sm:pb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base sm:text-lg font-semibold truncate">
                            {workout.name}
                          </CardTitle>
                          {isCompleted && (
                            <Badge variant="outline" className="text-green-600 border-green-500 shrink-0">
                              <Check className="h-3 w-3 mr-1" />
                              Done
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {format(workout.date, "PPP")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          onClick={() => handleStartWorkout(workout.displayId)}
                          data-testid={`button-start-workout-${workout.displayId}`}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-workout-menu-${workout.displayId}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditWorkout(workout.displayId)}
                              data-testid={`button-edit-workout-${workout.displayId}`}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteWorkout(workout.displayId, workout.name)}
                              className="text-destructive"
                              data-testid={`button-delete-workout-${workout.displayId}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                      <div className="flex flex-wrap gap-1">
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
          </div>
        )}

        {upcomingWorkouts.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Upcoming</h2>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingWorkouts.map((workout) => {
                const isCompleted = isWorkoutCompleted(workout.displayId);
                return (
                  <Card 
                    key={workout.displayId}
                    className={`hover-elevate ${isCompleted ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : ''}`}
                    data-testid={`card-workout-${workout.displayId}`}
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 sm:p-6 pb-2 sm:pb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base sm:text-lg font-semibold truncate">
                            {workout.name}
                          </CardTitle>
                          {isCompleted && (
                            <Badge variant="outline" className="text-green-600 border-green-500 shrink-0">
                              <Check className="h-3 w-3 mr-1" />
                              Done
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {format(workout.date, "PPP")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          onClick={() => handleStartWorkout(workout.displayId)}
                          data-testid={`button-start-workout-${workout.displayId}`}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-workout-menu-${workout.displayId}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditWorkout(workout.displayId)}
                              data-testid={`button-edit-workout-${workout.displayId}`}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteWorkout(workout.displayId, workout.name)}
                              className="text-destructive"
                              data-testid={`button-delete-workout-${workout.displayId}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                      <div className="flex flex-wrap gap-1">
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
          </div>
        )}

        {displayedWorkouts.length === 0 && (
          <Card className="p-8 sm:p-12 text-center">
            <div className="text-muted-foreground">
              <CalendarIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No workouts scheduled</h3>
              <p className="text-sm mb-4">Get started by creating your first workout.</p>
              <Button onClick={handleNewWorkout} data-testid="button-create-first-workout">
                <Plus className="h-4 w-4 mr-2" />
                Create Workout
              </Button>
            </div>
          </Card>
        )}

        {completedWorkouts.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
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
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        onClick={() => handleRestartWorkout(workout)}
                        data-testid={`button-restart-workout-${index}`}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-recent-workout-menu-${index}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditCompletedWorkout(workout)}
                            data-testid={`button-edit-recent-workout-${index}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteCompletedWorkout(workout.id, workout.name)}
                            className="text-destructive"
                            data-testid={`button-delete-recent-workout-${index}`}
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
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" data-testid="text-all-workouts-title">
              All Workouts
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your workout library
            </p>
          </div>
          {workoutTemplates.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {workoutTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className="hover-elevate"
                  data-testid={`card-library-workout-${template.id}`}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 sm:p-6 pb-2 sm:pb-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg font-semibold truncate">
                        {template.name}
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {template.exercises.length} exercises
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        onClick={() => handleStartFromTemplate(template.id)}
                        data-testid={`button-start-library-workout-${template.id}`}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-library-workout-menu-${template.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditTemplate(template.id)}
                            data-testid={`button-edit-library-workout-${template.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteTemplate(template.id, template.name)}
                            className="text-destructive"
                            data-testid={`button-delete-library-workout-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.exercises.slice(0, 3).map((ex) => (
                        <span key={ex.id} className="text-xs bg-accent px-2 py-0.5 rounded">
                          {ex.name}
                        </span>
                      ))}
                      {template.exercises.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{template.exercises.length - 3} more
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 sm:p-8">
              <div className="text-center text-muted-foreground">
                <p>No workouts created yet</p>
                <p className="text-sm mt-1">Click "New Workout" to create your first workout</p>
              </div>
            </Card>
          )}
        </div>

        <WorkoutEditorDialog
          isOpen={showEditorDialog}
          onClose={() => {
            setShowEditorDialog(false);
            setEditingWorkout(null);
            setEditingTemplateId(null);
            setEditingCompletedWorkout(null);
          }}
          onSave={handleSaveWorkout}
          initialData={editingWorkout ? { ...editingWorkout, repeatType: "none" as const } : null}
          availableExercises={allAvailableExercises}
        />

        <AlertDialog open={!!workoutToDelete} onOpenChange={(open) => !open && setWorkoutToDelete(null)}>
          <AlertDialogContent data-testid="dialog-confirm-delete">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workout</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{workoutToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteWorkout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
