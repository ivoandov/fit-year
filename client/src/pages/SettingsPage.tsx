import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/components/ThemeProvider";
import { useSettings, type WeekStart } from "@/components/SettingsProvider";
import { Sun, Moon, Monitor, Calendar } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { weekStart, setWeekStart } = useSettings();

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
      </div>
    </div>
  );
}
