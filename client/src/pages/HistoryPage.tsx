import { WorkoutHistoryCard } from "@/components/WorkoutHistoryCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, Flame, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { startOfWeek, startOfMonth, isAfter, isBefore, isEqual, endOfDay } from "date-fns";
import { useWorkout } from "@/context/WorkoutContext";
import { useSettings } from "@/components/SettingsProvider";

export default function HistoryPage() {
  const { completedWorkouts } = useWorkout();
  const { weekStart: weekStartDay, muscleGroups } = useSettings();

  const historyData = completedWorkouts.map((workout, index) => {
    // Calculate total volume from actual set data (weight × reps)
    let workoutVolume = 0;
    let totalSets = 0;
    
    const exercises = workout.exercises.map((ex: any) => {
      const sets = ex.setsData || [];
      sets.forEach((set: any) => {
        if (set.completed && set.weight && set.reps) {
          workoutVolume += set.weight * set.reps;
        }
        if (set.completed) {
          totalSets++;
        }
      });
      return {
        name: ex.name,
        muscleGroups: ex.muscleGroups || [],
        sets,
      };
    });

    return {
      id: `${workout.displayId}-${index}`,
      workoutId: workout.id,
      workoutName: workout.name,
      date: workout.completedAt,
      duration: 0, // Duration tracking not yet implemented
      exerciseCount: workout.exercises.length,
      totalVolume: workoutVolume,
      totalSets,
      exercises,
      calendarEventId: workout.calendarEventId,
    };
  });

  const now = new Date();
  const todayEnd = endOfDay(now);
  const weekStartsOn = weekStartDay === "monday" ? 1 : 0;
  const calendarWeekStart = startOfWeek(now, { weekStartsOn });
  const monthStart = startOfMonth(now);
  
  // Last 7 days (rolling window) for muscle group stats
  const last7DaysStart = new Date(now);
  last7DaysStart.setDate(last7DaysStart.getDate() - 6);
  last7DaysStart.setHours(0, 0, 0, 0);

  const isWithinRange = (date: Date, start: Date, end: Date) => {
    return (isAfter(date, start) || isEqual(date, start)) && (isBefore(date, end) || isEqual(date, end));
  };

  const workoutsThisWeek = historyData.filter((w) =>
    isWithinRange(w.date, calendarWeekStart, todayEnd)
  ).length;

  const workoutsThisMonth = historyData.filter((w) =>
    isWithinRange(w.date, monthStart, todayEnd)
  ).length;

  const totalWorkouts = historyData.length;

  const totalVolume = historyData.reduce((sum, w) => sum + w.totalVolume, 0);
  const totalSetsCompleted = historyData.reduce((sum, w) => sum + w.totalSets, 0);

  const calculateWeeklySetsByMuscle = () => {
    const setsByMuscle: { [key: string]: number } = {};

    historyData.forEach((workout) => {
      if (isWithinRange(workout.date, last7DaysStart, todayEnd)) {
        workout.exercises?.forEach((exercise) => {
          const completedSetCount = exercise.sets?.filter((s: any) => s.completed).length || 0;
          exercise.muscleGroups?.forEach((muscle: string) => {
            setsByMuscle[muscle] = (setsByMuscle[muscle] || 0) + completedSetCount;
          });
        });
      }
    });

    // Return all muscle groups from settings, plus any additional ones found in workouts
    const allMuscleGroups = new Set([...muscleGroups, ...Object.keys(setsByMuscle)]);
    
    return Array.from(allMuscleGroups).map((muscle) => ({
      muscleGroup: muscle,
      sets: setsByMuscle[muscle] || 0,
      maxSets: 20,
    }));
  };

  const weeklySetsByMuscleGroup = calculateWeeklySetsByMuscle();

  const stats = [
    { label: "Total Workouts", value: totalWorkouts.toString(), icon: Calendar, testId: "total-workouts" },
    { label: "This Week", value: workoutsThisWeek.toString(), icon: Flame, testId: "this-week" },
    { label: "This Month", value: workoutsThisMonth.toString(), icon: Activity, testId: "this-month" },
    { label: "Total Sets", value: totalSetsCompleted.toString(), icon: TrendingUp, testId: "total-sets" },
  ];

  return (
    <div className="flex-1 overflow-auto h-full">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-8 sm:pb-12 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">
            Workout History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your progress and review past sessions
          </p>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} data-testid={`card-stat-${stat.testId}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold" data-testid={`text-stat-value-${stat.testId}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Weekly Sets by Muscle Group (last 7 days)</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Track your training volume across different muscle groups
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              {weeklySetsByMuscleGroup.map((group) => (
                <div key={group.muscleGroup} className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium" data-testid={`text-muscle-${group.muscleGroup.toLowerCase()}`}>
                      {group.muscleGroup}
                    </span>
                    <span className="text-muted-foreground" data-testid={`text-sets-${group.muscleGroup.toLowerCase()}`}>
                      {group.sets}/{group.maxSets}
                    </span>
                  </div>
                  <Progress
                    value={(group.sets / group.maxSets) * 100}
                    data-testid={`progress-${group.muscleGroup.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {historyData.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Recent Workouts</h2>
            {historyData.map((session) => (
              <WorkoutHistoryCard key={session.id} {...session} />
            ))}
          </div>
        )}

        {historyData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No workout history yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Complete your first workout to see your progress here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
