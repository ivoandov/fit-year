import { createContext, useContext, useState, useEffect } from "react";

export type WeekStart = "sunday" | "monday";

export const DEFAULT_MUSCLE_GROUPS = [
  "Chest",
  "Triceps",
  "Back",
  "Biceps",
  "Shoulders",
  "Legs",
  "Abs/Core",
  "Cardio",
];

type SettingsProviderProps = {
  children: React.ReactNode;
};

type SettingsProviderState = {
  weekStart: WeekStart;
  setWeekStart: (weekStart: WeekStart) => void;
  muscleGroups: string[];
  customMuscleGroups: string[];
  setMuscleGroups: (groups: string[]) => void;
  addMuscleGroup: (group: string) => void;
  removeMuscleGroup: (group: string) => void;
  reorderMuscleGroups: (fromIndex: number, toIndex: number) => void;
  restTimerOnManualComplete: boolean;
  setRestTimerOnManualComplete: (enabled: boolean) => void;
  isCustomMuscleGroup: (group: string) => boolean;
};

const SettingsProviderContext = createContext<SettingsProviderState | undefined>(undefined);

function migrateToCustomGroups(): string[] {
  const stored = localStorage.getItem("muscleGroups");
  const migrated = localStorage.getItem("muscleGroupsMigrated");
  
  if (migrated === "v2") {
    const customStored = localStorage.getItem("customMuscleGroups");
    if (customStored) {
      try {
        return JSON.parse(customStored);
      } catch {
        return [];
      }
    }
    return [];
  }
  
  if (stored) {
    try {
      const allGroups: string[] = JSON.parse(stored);
      const defaultLower = DEFAULT_MUSCLE_GROUPS.map(g => g.toLowerCase());
      const customGroups = allGroups.filter(g => 
        !defaultLower.includes(g.toLowerCase()) && 
        g.toLowerCase() !== "core"
      );
      localStorage.setItem("customMuscleGroups", JSON.stringify(customGroups));
      localStorage.setItem("muscleGroupsMigrated", "v2");
      return customGroups;
    } catch {
      localStorage.setItem("muscleGroupsMigrated", "v2");
      return [];
    }
  }
  
  localStorage.setItem("muscleGroupsMigrated", "v2");
  return [];
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [weekStart, setWeekStartState] = useState<WeekStart>(() => {
    const stored = localStorage.getItem("weekStart");
    return (stored as WeekStart) || "sunday";
  });

  const [customMuscleGroups, setCustomMuscleGroupsState] = useState<string[]>(() => {
    return migrateToCustomGroups();
  });

  const muscleGroups = [...DEFAULT_MUSCLE_GROUPS, ...customMuscleGroups];

  const setWeekStart = (newWeekStart: WeekStart) => {
    setWeekStartState(newWeekStart);
    localStorage.setItem("weekStart", newWeekStart);
  };

  const setCustomMuscleGroups = (groups: string[]) => {
    setCustomMuscleGroupsState(groups);
    localStorage.setItem("customMuscleGroups", JSON.stringify(groups));
  };

  const setMuscleGroups = (groups: string[]) => {
    const customOnly = groups.filter(g => 
      !DEFAULT_MUSCLE_GROUPS.map(d => d.toLowerCase()).includes(g.toLowerCase())
    );
    setCustomMuscleGroups(customOnly);
  };

  const addMuscleGroup = (group: string) => {
    const trimmed = group.trim();
    if (!trimmed) return;
    
    const allLower = muscleGroups.map(g => g.toLowerCase());
    if (allLower.includes(trimmed.toLowerCase())) return;
    
    const newCustomGroups = [...customMuscleGroups, trimmed];
    setCustomMuscleGroups(newCustomGroups);
  };

  const removeMuscleGroup = (group: string) => {
    if (DEFAULT_MUSCLE_GROUPS.map(g => g.toLowerCase()).includes(group.toLowerCase())) {
      return;
    }
    const newCustomGroups = customMuscleGroups.filter((g) => g !== group);
    setCustomMuscleGroups(newCustomGroups);
  };

  const reorderMuscleGroups = (fromIndex: number, toIndex: number) => {
    const newGroups = [...muscleGroups];
    const [removed] = newGroups.splice(fromIndex, 1);
    newGroups.splice(toIndex, 0, removed);
    const customOnly = newGroups.filter(g => 
      !DEFAULT_MUSCLE_GROUPS.map(d => d.toLowerCase()).includes(g.toLowerCase())
    );
    setCustomMuscleGroups(customOnly);
  };
  
  const isCustomMuscleGroup = (group: string) => {
    return !DEFAULT_MUSCLE_GROUPS.map(g => g.toLowerCase()).includes(group.toLowerCase());
  };

  const [restTimerOnManualComplete, setRestTimerOnManualCompleteState] = useState<boolean>(() => {
    const stored = localStorage.getItem("restTimerOnManualComplete");
    return stored === "true";
  });

  const setRestTimerOnManualComplete = (enabled: boolean) => {
    setRestTimerOnManualCompleteState(enabled);
    localStorage.setItem("restTimerOnManualComplete", enabled.toString());
  };

  return (
    <SettingsProviderContext.Provider
      value={{
        weekStart,
        setWeekStart,
        muscleGroups,
        customMuscleGroups,
        setMuscleGroups,
        addMuscleGroup,
        removeMuscleGroup,
        reorderMuscleGroups,
        restTimerOnManualComplete,
        setRestTimerOnManualComplete,
        isCustomMuscleGroup,
      }}
    >
      {children}
    </SettingsProviderContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsProviderContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
