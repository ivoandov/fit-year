import { useState } from "react";
import { WorkoutCard } from "@/components/WorkoutCard";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function WorkoutsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const mockWorkouts = [
    {
      id: "1",
      name: "Upper Body Strength",
      date: new Date(),
      exerciseCount: 6,
      duration: 45,
    },
    {
      id: "2",
      name: "Lower Body Power",
      date: new Date(Date.now() + 86400000),
      exerciseCount: 5,
      duration: 50,
    },
    {
      id: "3",
      name: "Full Body Circuit",
      date: new Date(Date.now() + 86400000 * 2),
      exerciseCount: 8,
      duration: 60,
    },
  ];

  const handleStartWorkout = (id: string) => {
    console.log("Starting workout:", id);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Scheduled Workouts
            </h1>
            <p className="text-muted-foreground mt-1">
              Your upcoming fitness sessions
            </p>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="button-calendar">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(selectedDate, "PPP")}
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
            <Button data-testid="button-add-workout">
              <Plus className="h-4 w-4 mr-2" />
              New Workout
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockWorkouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              {...workout}
              onStart={handleStartWorkout}
            />
          ))}
        </div>

        {mockWorkouts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No workouts scheduled</p>
            <Button data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Workout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
