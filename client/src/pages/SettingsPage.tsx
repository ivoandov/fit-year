import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ThemeProvider";
import { useSettings, type WeekStart, DEFAULT_MUSCLE_GROUPS } from "@/components/SettingsProvider";
import { Sun, Moon, Monitor, Calendar, Plus, X, ChevronUp, ChevronDown, RotateCcw, RefreshCw, Check, AlertCircle, Timer } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface CalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

interface UserSettings {
  userId: string;
  selectedCalendarId: string | null;
  selectedCalendarName: string | null;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { weekStart, setWeekStart, muscleGroups, addMuscleGroup, removeMuscleGroup, reorderMuscleGroups, setMuscleGroups, restTimerOnManualComplete, setRestTimerOnManualComplete } = useSettings();
  const [newMuscleGroup, setNewMuscleGroup] = useState("");
  const { toast } = useToast();

  // Fetch available Google Calendars
  const { data: calendars, isLoading: calendarsLoading, error: calendarsError, refetch: refetchCalendars } = useQuery<CalendarInfo[]>({
    queryKey: ['/api/calendars'],
  });

  // Fetch user settings
  const { data: userSettings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ['/api/user-settings'],
  });

  // Mutation to update calendar selection
  const updateCalendarMutation = useMutation({
    mutationFn: async ({ calendarId, calendarName }: { calendarId: string; calendarName: string }) => {
      return apiRequest('PATCH', '/api/user-settings', {
        selectedCalendarId: calendarId,
        selectedCalendarName: calendarName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-settings'] });
      toast({
        title: "Calendar updated",
        description: "Your workout sync calendar has been changed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update calendar",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectCalendar = (calendar: CalendarInfo) => {
    updateCalendarMutation.mutate({
      calendarId: calendar.id,
      calendarName: calendar.summary,
    });
  };

  const themeOptions = [
    {
      value: "light",
      label: "Light",
      description: "Default light theme",
      icon: Sun,
    },
    {
      value: "dark",
      label: "Dark",
      description: "Dark theme for low-light environments",
      icon: Moon,
    },
    {
      value: "system",
      label: "System",
      description: "Follows your device settings",
      icon: Monitor,
    },
  ];

  const weekStartOptions = [
    {
      value: "sunday",
      label: "Sunday",
      description: "Week starts on Sunday",
    },
    {
      value: "monday",
      label: "Monday",
      description: "Week starts on Monday",
    },
  ];

  const handleAddMuscleGroup = () => {
    if (newMuscleGroup.trim()) {
      addMuscleGroup(newMuscleGroup.trim());
      setNewMuscleGroup("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddMuscleGroup();
    }
  };

  const handleResetMuscleGroups = () => {
    setMuscleGroups([...DEFAULT_MUSCLE_GROUPS]);
  };

  return (
    <div className="flex-1 overflow-auto h-full">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-8 sm:pb-12 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your app experience
          </p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Week Start</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Choose when your week begins for weekly statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <RadioGroup
              value={weekStart}
              onValueChange={(value) => setWeekStart(value as WeekStart)}
              className="space-y-3"
            >
              {weekStartOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center space-x-3 p-3 rounded-md border cursor-pointer hover-elevate ${
                    weekStart === option.value ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setWeekStart(option.value as WeekStart)}
                  data-testid={`option-weekstart-${option.value}`}
                >
                  <RadioGroupItem value={option.value} id={`weekstart-${option.value}`} />
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor={`weekstart-${option.value}`} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg">Google Calendar Sync</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Choose which calendar receives your completed workout events
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetchCalendars()}
                disabled={calendarsLoading}
                data-testid="button-refresh-calendars"
              >
                <RefreshCw className={`h-4 w-4 ${calendarsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {calendarsLoading || settingsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : calendarsError ? (
              <div className="flex items-center gap-2 p-4 rounded-md border border-destructive/50 bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Unable to load calendars</p>
                  <p className="text-xs">Make sure Google Calendar is connected in your account settings.</p>
                </div>
              </div>
            ) : calendars && calendars.length > 0 ? (
              <div className="space-y-3">
                {calendars.map((calendar) => {
                  const isSelected = userSettings?.selectedCalendarId === calendar.id || 
                    (!userSettings?.selectedCalendarId && calendar.primary);
                  return (
                    <div
                      key={calendar.id}
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer hover-elevate ${
                        isSelected ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleSelectCalendar(calendar)}
                      data-testid={`option-calendar-${calendar.id}`}
                    >
                      <div
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{calendar.summary}</p>
                        {calendar.primary && (
                          <p className="text-xs text-muted-foreground">Primary calendar</p>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No calendars available. Connect Google Calendar to sync your workouts.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Workout Tracking</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Customize how workout tracking behaves
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div
              className={`flex items-center justify-between gap-3 p-3 rounded-md border cursor-pointer hover-elevate ${
                restTimerOnManualComplete ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setRestTimerOnManualComplete(!restTimerOnManualComplete)}
              data-testid="option-rest-timer-manual"
            >
              <div className="flex items-center gap-3 flex-1">
                <Timer className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Rest timer on manual completion</p>
                  <p className="text-xs text-muted-foreground">
                    Start rest timer when manually checking off a set
                  </p>
                </div>
              </div>
              <Switch
                checked={restTimerOnManualComplete}
                onCheckedChange={setRestTimerOnManualComplete}
                data-testid="switch-rest-timer-manual"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg">Muscle Groups</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Customize which muscle groups appear in your exercise library
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetMuscleGroups}
                data-testid="button-reset-muscle-groups"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add new muscle group..."
                value={newMuscleGroup}
                onChange={(e) => setNewMuscleGroup(e.target.value)}
                onKeyPress={handleKeyPress}
                data-testid="input-new-muscle-group"
              />
              <Button
                onClick={handleAddMuscleGroup}
                disabled={!newMuscleGroup.trim() || muscleGroups.includes(newMuscleGroup.trim())}
                data-testid="button-add-muscle-group"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {muscleGroups.map((group, index) => (
                <div
                  key={group}
                  className="flex items-center gap-2 p-3 rounded-md border bg-background"
                  data-testid={`muscle-group-item-${group.toLowerCase()}`}
                >
                  <span className="flex-1 font-medium text-sm">{group}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => reorderMuscleGroups(index, Math.max(0, index - 1))}
                      disabled={index === 0}
                      data-testid={`button-move-up-${group.toLowerCase()}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => reorderMuscleGroups(index, Math.min(muscleGroups.length - 1, index + 1))}
                      disabled={index === muscleGroups.length - 1}
                      data-testid={`button-move-down-${group.toLowerCase()}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMuscleGroup(group)}
                      data-testid={`button-remove-${group.toLowerCase()}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {muscleGroups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No muscle groups defined. Add some or reset to defaults.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
