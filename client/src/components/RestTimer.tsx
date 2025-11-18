import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pause, Play, SkipForward } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RestTimerProps {
  isOpen: boolean;
  onClose: () => void;
  initialSeconds?: number;
}

export function RestTimer({ isOpen, onClose, initialSeconds = 90 }: RestTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSeconds(initialSeconds);
      setIsPaused(false);
      return;
    }

    if (isPaused || seconds === 0) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, seconds, initialSeconds]);

  const progress = ((initialSeconds - seconds) / initialSeconds) * 100;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-rest-timer">
        <DialogHeader>
          <DialogTitle data-testid="text-timer-title">Rest Timer</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <div className="absolute inset-0">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                  className="text-primary transition-all duration-1000"
                />
              </svg>
            </div>
            <div className="text-5xl font-bold" data-testid="text-countdown">
              {minutes}:{remainingSeconds.toString().padStart(2, '0')}
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setIsPaused(!isPaused)}
              data-testid="button-pause-timer"
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setSeconds((prev) => Math.min(prev + 15, 300))}
              data-testid="button-add-time"
            >
              +15s
            </Button>
            <Button
              size="icon"
              onClick={onClose}
              data-testid="button-skip-timer"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
