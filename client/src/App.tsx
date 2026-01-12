import { Switch, Route } from "wouter";
import { useEffect } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import WorkoutsPage from "@/pages/WorkoutsPage";
import ExercisesPage from "@/pages/ExercisesPage";
import TrackPage from "@/pages/TrackPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import RoutinesPage from "@/pages/RoutinesPage";
import LandingPage from "@/pages/LandingPage";

function useAppDiagnostics() {
  useEffect(() => {
    const mountTime = new Date().toISOString();
    console.log(`[FitYear] App mounted at ${mountTime}`);
    
    const handleVisibilityChange = () => {
      console.log(`[FitYear] Visibility changed: ${document.visibilityState} at ${new Date().toISOString()}`);
    };
    
    const handleOnline = () => console.log(`[FitYear] Network: online at ${new Date().toISOString()}`);
    const handleOffline = () => console.log(`[FitYear] Network: offline at ${new Date().toISOString()}`);
    const handleBeforeUnload = () => console.log(`[FitYear] beforeunload at ${new Date().toISOString()}`);
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      console.log(`[FitYear] App unmounting at ${new Date().toISOString()}`);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={WorkoutsPage} />
      <Route path="/workouts" component={WorkoutsPage} />
      <Route path="/routines" component={RoutinesPage} />
      <Route path="/exercises" component={ExercisesPage} />
      <Route path="/track" component={TrackPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UserMenu() {
  const { user, logout, isLoggingOut } = useAuth();
  
  if (!user) return null;
  
  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map(n => n?.[0])
    .join('') || user.email?.[0]?.toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || 'User'} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => logout()}
          disabled={isLoggingOut}
          data-testid="button-logout"
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SettingsProvider>
      <WorkoutProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <UserMenu />
                </div>
              </header>
              <main className="flex-1 overflow-hidden">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </WorkoutProvider>
    </SettingsProvider>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();
  useAppDiagnostics();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
