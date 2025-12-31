import { createContext, useContext, useState } from "react";

export type WeekStart = "sunday" | "monday";

type SettingsProviderProps = {
  children: React.ReactNode;
};

type SettingsProviderState = {
  weekStart: WeekStart;
  setWeekStart: (weekStart: WeekStart) => void;
};

const SettingsProviderContext = createContext<SettingsProviderState | undefined>(undefined);

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [weekStart, setWeekStartState] = useState<WeekStart>(() => {
    const stored = localStorage.getItem("weekStart");
    return (stored as WeekStart) || "sunday";
  });

  const setWeekStart = (newWeekStart: WeekStart) => {
    setWeekStartState(newWeekStart);
    localStorage.setItem("weekStart", newWeekStart);
  };

  return (
    <SettingsProviderContext.Provider value={{ weekStart, setWeekStart }}>
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
