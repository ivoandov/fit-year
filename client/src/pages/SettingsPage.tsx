import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ThemeProvider";
import { useSettings, type WeekStart, DEFAULT_MUSCLE_GROUPS } from "@/components/SettingsProvider";
import { Sun, Moon, Monitor, Calendar, Plus, X, ChevronUp, ChevronDown, RotateCcw } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { weekStart, setWeekStart, muscleGroups, addMuscleGroup, removeMuscleGroup, reorderMuscleGroups, setMuscleGroups } = useSettings();
  const [newMuscleGroup, setNewMuscleGroup] = useState("");

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
            <CardTitle className="text-base sm:text-lg">Appearance</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Choose how Fit Year looks to you
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <RadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
              className="space-y-3"
            >
              {themeOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center space-x-3 p-3 rounded-md border cursor-pointer hover-elevate ${
                    theme === option.value ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                  data-testid={`option-theme-${option.value}`}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <option.icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="font-medium cursor-pointer">
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
