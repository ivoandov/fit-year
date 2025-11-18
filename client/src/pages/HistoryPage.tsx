import { WorkoutHistoryCard } from "@/components/WorkoutHistoryCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, Flame } from "lucide-react";

export default function HistoryPage() {
  const mockStats = [
    { label: "Total Workouts", value: "24", icon: Calendar },
    { label: "This Month", value: "8", icon: Flame },
    { label: "Total Volume", value: "48.5K lbs", icon: TrendingUp },
  ];

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
          sets: [
            { weight: 135, reps: 10 },
            { weight: 185, reps: 8 },
            { weight: 225, reps: 6 },
          ],
        },
        {
          name: "Barbell Row",
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
    },
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

        <div className="grid gap-4 md:grid-cols-3">
          {mockStats.map((stat) => (
            <Card key={stat.label} data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-stat-value-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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
