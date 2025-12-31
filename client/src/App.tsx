import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SettingsProvider } from "@/components/SettingsProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkoutProvider } from "@/context/WorkoutContext";
import NotFound from "@/pages/not-found";
import WorkoutsPage from "@/pages/WorkoutsPage";
import ExercisesPage from "@/pages/ExercisesPage";
import TrackPage from "@/pages/TrackPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={WorkoutsPage} />
      <Route path="/exercises" component={ExercisesPage} />
      <Route path="/track" component={TrackPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <SettingsProvider>
          <WorkoutProvider>
            <TooltipProvider>
              <SidebarProvider style={style as React.CSSProperties}>
                <div className="flex h-screen w-full">
                  <AppSidebar />
                  <div className="flex flex-col flex-1 min-w-0">
                    <header className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b">
                      <SidebarTrigger data-testid="button-sidebar-toggle" />
                      <ThemeToggle />
                    </header>
                    <main className="flex-1 overflow-hidden">
                      <Router />
                    </main>
                  </div>
                </div>
              </SidebarProvider>
              <Toaster />
            </TooltipProvider>
          </WorkoutProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
