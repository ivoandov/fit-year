import { createContext, useContext, useState } from "react";

export type WeekStart = "sunday" | "monday";

export const DEFAULT_MUSCLE_GROUPS = [
  "Chest",
  "Triceps",
  "Back",
  "Biceps",
  "Shoulders",
  "Legs",
  "Core",
  "Cardio",
];

type SettingsProviderProps = {
  children: React.ReactNode;
};

type SettingsProviderState = {
  weekStart: WeekStart;
  setWeekStart: (weekStart: WeekStart) => void;
  muscleGroups: string[];
  setMuscleGroups: (groups: string[]) => void;
  addMuscleGroup: (group: string) => void;
  removeMuscleGroup: (group: string) => void;
  reorderMuscleGroups: (fromIndex: number, toIndex: number) => void;
};

const SettingsProviderContext = createContext<SettingsProviderState | undefined>(undefined);

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [weekStart, setWeekStartState] = useState<WeekStart>(() => {
    const stored = localStorage.getItem("weekStart");
    return (stored as WeekStart) || "sunday";
  });

  const [muscleGroups, setMuscleGroupsState] = useState<string[]>(() => {
    const stored = localStorage.getItem("muscleGroups");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_MUSCLE_GROUPS;
      }
    }
    return DEFAULT_MUSCLE_GROUPS;
  });

  const setWeekStart = (newWeekStart: WeekStart) => {
    setWeekStartState(newWeekStart);
    localStorage.setItem("weekStart", newWeekStart);
  };

  const setMuscleGroups = (groups: string[]) => {
    setMuscleGroupsState(groups);
    localStorage.setItem("muscleGroups", JSON.stringify(groups));
  };

  const addMuscleGroup = (group: string) => {
    if (!muscleGroups.includes(group) && group.trim()) {
      const newGroups = [...muscleGroups, group.trim()];
      setMuscleGroups(newGroups);
    }
  };

  const removeMuscleGroup = (group: string) => {
    const newGroups = muscleGroups.filter((g) => g !== group);
    setMuscleGroups(newGroups);
  };

  const reorderMuscleGroups = (fromIndex: number, toIndex: number) => {
    const newGroups = [...muscleGroups];
    const [removed] = newGroups.splice(fromIndex, 1);
    newGroups.splice(toIndex, 0, removed);
    setMuscleGroups(newGroups);
  };

  return (
    <SettingsProviderContext.Provider
      value={{
        weekStart,
        setWeekStart,
        muscleGroups,
        setMuscleGroups,
        addMuscleGroup,
        removeMuscleGroup,
        reorderMuscleGroups,
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
