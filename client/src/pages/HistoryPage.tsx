import { WorkoutHistoryCard } from "@/components/WorkoutHistoryCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, Flame, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { startOfWeek, startOfMonth, isWithinInterval } from "date-fns";

export default function HistoryPage() {
  const mockHistory = [
    {
      id: "1",
      workoutName: "Upper Body Strength",
      date: new Date(Date.now() - 86400000),
      duration: 45,
      exerciseCount: 6,
      totalVolume: 3250,
      exercises: [
        {
          name: "Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 135, reps: 10 },
            { weight: 185, reps: 8 },
            { weight: 225, reps: 6 },
          ],
        },
        {
          name: "Barbell Row",
          muscleGroup: "Back",
          sets: [
            { weight: 135, reps: 10 },
            { weight: 155, reps: 8 },
            { weight: 175, reps: 6 },
          ],
        },
      ],
    },
    {
      id: "2",
      workoutName: "Lower Body Power",
      date: new Date(Date.now() - 86400000 * 3),
      duration: 50,
      exerciseCount: 5,
      totalVolume: 4100,
      exercises: [
        {
          name: "Barbell Squat",
          muscleGroup: "Core",
          sets: [
            { weight: 185, reps: 10 },
            { weight: 225, reps: 8 },
            { weight: 275, reps: 6 },
          ],
        },
      ],
    },
    {
      id: "3",
      workoutName: "Full Body Circuit",
      date: new Date(Date.now() - 86400000 * 5),
      duration: 60,
      exerciseCount: 8,
      totalVolume: 2850,
      exercises: [
        {
          name: "Shoulder Press",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 95, reps: 12 },
            { weight: 115, reps: 10 },
          ],
        },
      ],
    },
  ];

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const workoutsThisWeek = mockHistory.filter((w) =>
    isWithinInterval(w.date, { start: weekStart, end: now })
  ).length;

  const workoutsThisMonth = mockHistory.filter((w) =>
    isWithinInterval(w.date, { start: monthStart, end: now })
  ).length;

  const totalWorkouts = mockHistory.length;

  const totalVolume = mockHistory.reduce((sum, w) => sum + w.totalVolume, 0);

  const calculateWeeklySetsByMuscle = () => {
    const muscleGroups = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Core"];
    const setsByMuscle: { [key: string]: number } = {};

    mockHistory.forEach((workout) => {
      if (isWithinInterval(workout.date, { start: weekStart, end: now })) {
        workout.exercises?.forEach((exercise) => {
          const muscle = exercise.muscleGroup || "Other";
          setsByMuscle[muscle] = (setsByMuscle[muscle] || 0) + (exercise.sets?.length || 0);
        });
      }
    });

    return muscleGroups.map((muscle) => ({
      muscleGroup: muscle,
      sets: setsByMuscle[muscle] || 0,
      maxSets: 20,
    }));
  };

  const weeklySetsByMuscleGroup = calculateWeeklySetsByMuscle();

  const mockStats = [
    { label: "Total Workouts", value: totalWorkouts.toString(), icon: Calendar, testId: "total-workouts" },
    { label: "This Week", value: workoutsThisWeek.toString(), icon: Flame, testId: "this-week" },
    { label: "This Month", value: workoutsThisMonth.toString(), icon: Activity, testId: "this-month" },
    { label: "Total Volume", value: `${(totalVolume / 1000).toFixed(1)}K lbs`, icon: TrendingUp, testId: "total-volume" },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Workout History
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your progress and review past sessions
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {mockStats.map((stat) => (
            <Card key={stat.label} data-testid={`card-stat-${stat.testId}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-stat-value-${stat.testId}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Sets by Muscle Group</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track your training volume across different muscle groups this week
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklySetsByMuscleGroup.map((group) => (
                <div key={group.muscleGroup} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium" data-testid={`text-muscle-${group.muscleGroup.toLowerCase()}`}>
                      {group.muscleGroup}
                    </span>
                    <span className="text-muted-foreground" data-testid={`text-sets-${group.muscleGroup.toLowerCase()}`}>
                      {group.sets} / {group.maxSets} sets
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

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Workouts</h2>
          {mockHistory.map((session) => (
            <WorkoutHistoryCard key={session.id} {...session} />
          ))}
        </div>

        {mockHistory.length === 0 && (
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
