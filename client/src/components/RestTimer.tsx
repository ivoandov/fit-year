import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pause, Play, SkipForward, Minimize2, Maximize2 } from "lucide-react";

const TIMER_STORAGE_KEY = "rest_timer_end_time";
const TIMER_PAUSED_KEY = "rest_timer_paused_remaining";

interface RestTimerProps {
  isOpen: boolean;
  onClose: () => void;
  initialSeconds?: number;
  exerciseName?: string;
  nextExerciseName?: string;
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendTimerCompleteNotification(exerciseName: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Rest Complete", {
      body: `Time to start your next ${exerciseName} set!`,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "rest-timer",
      renotify: true,
    } as any);
  }
}

export function RestTimer({
  isOpen,
  onClose,
  initialSeconds = 90,
  exerciseName = "Rest",
  nextExerciseName,
}: RestTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const endTimeRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const computeRemaining = useCallback((): number => {
    if (!endTimeRef.current) return 0;
    return Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
  }, []);

  const tick = useCallback(() => {
    const remaining = computeRemaining();
    setSeconds(remaining);
    if (remaining <= 0) {
      clearTimer();
      localStorage.removeItem(TIMER_STORAGE_KEY);
      localStorage.removeItem(TIMER_PAUSED_KEY);
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        sendTimerCompleteNotification(exerciseName);
      }
    }
  }, [computeRemaining, clearTimer, exerciseName]);

  const startCounting = useCallback((remainingSecs: number) => {
    clearTimer();
    hasCompletedRef.current = false;
    endTimeRef.current = Date.now() + remainingSecs * 1000;
    localStorage.setItem(TIMER_STORAGE_KEY, String(endTimeRef.current));
    localStorage.removeItem(TIMER_PAUSED_KEY);
    intervalRef.current = setInterval(tick, 500);
    tick();
  }, [clearTimer, tick]);

  // On open: initialize timer
  useEffect(() => {
    if (!isOpen) {
      clearTimer();
      endTimeRef.current = null;
      hasCompletedRef.current = false;
      localStorage.removeItem(TIMER_STORAGE_KEY);
      localStorage.removeItem(TIMER_PAUSED_KEY);
      setSeconds(initialSeconds);
      setIsPaused(false);
      setIsMinimized(false);
      return;
    }

    requestNotificationPermission();

    const savedEnd = localStorage.getItem(TIMER_STORAGE_KEY);
    const savedPausedRemaining = localStorage.getItem(TIMER_PAUSED_KEY);

    if (savedPausedRemaining) {
      const rem = parseInt(savedPausedRemaining, 10);
      setSeconds(rem);
      setIsPaused(true);
      endTimeRef.current = null;
    } else if (savedEnd) {
      const end = parseInt(savedEnd, 10);
      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (remaining > 0) {
        endTimeRef.current = end;
        setSeconds(remaining);
        setIsPaused(false);
        intervalRef.current = setInterval(tick, 500);
        tick();
      } else {
        localStorage.removeItem(TIMER_STORAGE_KEY);
        setSeconds(0);
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
          sendTimerCompleteNotification(exerciseName);
        }
      }
    } else {
      startCounting(initialSeconds);
    }

    return () => {
      clearTimer();
    };
  }, [isOpen]);

  // Handle visibility change: when user returns to the tab, resync the display
  useEffect(() => {
    if (!isOpen) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !isPaused) {
        clearTimer();
        const remaining = computeRemaining();
        setSeconds(remaining);
        if (remaining > 0) {
          intervalRef.current = setInterval(tick, 500);
        } else if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
          sendTimerCompleteNotification(exerciseName);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isOpen, isPaused, computeRemaining, clearTimer, tick, exerciseName]);

  const handlePauseResume = () => {
    if (isPaused) {
      startCounting(seconds);
      setIsPaused(false);
    } else {
      clearTimer();
      endTimeRef.current = null;
      localStorage.removeItem(TIMER_STORAGE_KEY);
      localStorage.setItem(TIMER_PAUSED_KEY, String(seconds));
      setIsPaused(true);
    }
  };

  const progress = ((initialSeconds - seconds) / initialSeconds) * 100;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const timeString = `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;

  // Floating minimized pill
  if (isOpen && isMinimized) {
    const pillCircumference = 2 * Math.PI * 16;
    const pillOffset = pillCircumference * (1 - progress / 100);

    return (
      <div
        className="fixed bottom-20 right-4 z-[9999] flex items-center gap-2 bg-background border border-border rounded-full shadow-lg px-3 py-2 cursor-pointer hover-elevate"
        onClick={() => setIsMinimized(false)}
        data-testid="pill-rest-timer-minimized"
      >
        {/* Mini circular progress */}
        <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="16" stroke="hsl(var(--muted))" strokeWidth="2.5" fill="none" />
            <circle
              cx="18"
              cy="18"
              r="16"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={pillCircumference}
              strokeDashoffset={pillOffset}
              className="transition-all duration-500 ease-linear"
            />
          </svg>
          <span className="relative z-10 text-[10px] font-bold leading-none">
            {seconds === 0 ? "✓" : minutes > 0 ? `${minutes}m` : `${remainingSeconds}s`}
          </span>
        </div>

        {/* Time display */}
        <span className="text-sm font-semibold tabular-nums" data-testid="text-pill-countdown">
          {seconds === 0 ? "Done!" : timeString}
        </span>

        {/* Pause/Play button — stop propagation so it doesn't expand */}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); handlePauseResume(); }}
          data-testid="button-pill-pause-resume"
        >
          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </Button>

        {/* Skip / close button */}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          data-testid="button-pill-skip"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </Button>

        {/* Expand icon */}
        <Maximize2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      </div>
    );
  }

  // Full dialog
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="sm:max-w-md border-0 bg-background/95 backdrop-blur-sm p-0"
        data-testid="dialog-rest-timer"
      >
        <div className="flex flex-col items-center px-6 pt-6 pb-6">
          {/* Header */}
          <h2 className="text-xl font-semibold w-full mb-6" data-testid="text-exercise-name">
            {exerciseName}
          </h2>

          <div className="relative w-64 h-64 flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full bg-[#1a1a1a] border-4 border-[#2a2a2a]" />
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="128" cy="128" r="120" stroke="#2a2a2a" strokeWidth="6" fill="none" />
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="white"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 ease-linear"
              />
            </svg>
            <div className="relative z-10 flex flex-col items-center">
              <div className="text-6xl font-bold tracking-tight" data-testid="text-countdown">
                {timeString}
              </div>
              <div className="text-muted-foreground text-sm mt-1">
                {seconds === 0 ? "Rest complete!" : "Minutes"}
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={handlePauseResume}
              data-testid="button-pause-timer"
            >
              {isPaused ? (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </>
              )}
            </Button>
            <Button
              className="flex-1 h-12"
              onClick={onClose}
              data-testid="button-skip-timer"
            >
              <SkipForward className="h-5 w-5 mr-2" />
              Next Set
            </Button>
          </div>

          <Button
            variant="ghost"
            className="mt-3 w-full text-muted-foreground"
            onClick={() => setIsMinimized(true)}
            data-testid="button-minimize-timer"
          >
            <Minimize2 className="h-4 w-4 mr-2" />
            Minimize Timer
          </Button>

          {nextExerciseName && (
            <div className="mt-6 w-full p-4 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
              <p className="text-xs text-muted-foreground mb-1">Up Next</p>
              <p className="font-medium">{nextExerciseName}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
