import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Calendar, History, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Dumbbell className="w-12 h-12 text-primary" />
            <h1 className="text-4xl sm:text-5xl font-bold">Fit Year</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Track your workouts, schedule training sessions, and achieve your fitness goals. 
            All your progress synced to your Google Calendar.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Sign in with Google
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <Dumbbell className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Exercise Library</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Browse and customize exercises with AI-generated images and descriptions.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Schedule Workouts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Plan your training sessions and stay organized with a workout calendar.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Track Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Log sets, reps, and weights with automatic rest timers during workouts.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <History className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Workout History</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Review past workouts and track your fitness journey over time.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16 text-muted-foreground">
          <p>Completed workouts automatically sync to your Google Calendar</p>
        </div>
      </div>
    </div>
  );
}
