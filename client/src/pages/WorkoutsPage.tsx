import { useState } from "react";
import { WorkoutCard } from "@/components/WorkoutCard";
import { ScheduleWorkoutDialog, type ScheduleData } from "@/components/ScheduleWorkoutDialog";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ScheduledWorkout {
  id: string;
  name: string;
  date: Date;
  exerciseCount: number;
  duration: number;
  repeatType: "none" | "daily" | "weekly" | "custom";
  repeatInterval?: number;
}

export default function WorkoutsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([
    {
      id: "1",
      name: "Upper Body Strength",
      date: new Date(),
      exerciseCount: 6,
      duration: 45,
      repeatType: "weekly",
    },
    {
      id: "2",
      name: "Lower Body Power",
      date: new Date(Date.now() + 86400000),
      exerciseCount: 5,
      duration: 50,
      repeatType: "weekly",
    },
    {
      id: "3",
      name: "Full Body Circuit",
      date: new Date(Date.now() + 86400000 * 2),
      exerciseCount: 8,
      duration: 60,
      repeatType: "custom",
      repeatInterval: 3,
    },
  ]);
  const { toast } = useToast();

  const handleStartWorkout = (id: string) => {
    console.log("Starting workout:", id);
  };

  const handleScheduleWorkout = (data: ScheduleData) => {
    const newWorkout: ScheduledWorkout = {
      id: Date.now().toString(),
      name: data.workoutName,
      date: data.date,
      exerciseCount: 0,
      duration: 0,
      repeatType: data.repeatType,
      repeatInterval: data.repeatInterval,
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
      title: "Workout Scheduled",
      description: `${data.workoutName} scheduled for ${format(data.date, "PPP")}${repeatText}`,
    });

    console.log("Scheduling workout:", data);
  };

  const getDisplayedWorkouts = () => {
    const workouts: ScheduledWorkout[] = [];
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    scheduledWorkouts.forEach((workout) => {
      let currentDate = new Date(workout.date);
      
      while (currentDate <= thirtyDaysFromNow) {
        if (currentDate >= today) {
          workouts.push({
            ...workout,
            id: `${workout.id}-${currentDate.toISOString()}`,
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
              onClick={() => setShowScheduleDialog(true)}
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
          {displayedWorkouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              {...workout}
              onStart={handleStartWorkout}
            />
          ))}
        </div>

        {displayedWorkouts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No workouts scheduled</p>
            <Button
              onClick={() => setShowScheduleDialog(true)}
              data-testid="button-create-first"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Workout
            </Button>
          </div>
        )}

        <ScheduleWorkoutDialog
          isOpen={showScheduleDialog}
          onClose={() => setShowScheduleDialog(false)}
          onSchedule={handleScheduleWorkout}
        />
      </div>
    </div>
  );
}
