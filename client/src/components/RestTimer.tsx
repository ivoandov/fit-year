import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pause, Play, SkipForward } from "lucide-react";

interface RestTimerProps {
  isOpen: boolean;
  onClose: () => void;
  initialSeconds?: number;
  exerciseName?: string;
  nextExerciseName?: string;
}

export function RestTimer({ 
  isOpen, 
  onClose, 
  initialSeconds = 90,
  exerciseName = "Rest",
  nextExerciseName
}: RestTimerProps) {
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
  
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md border-0 bg-background/95 backdrop-blur-sm p-0" 
        data-testid="dialog-rest-timer"
      >
        <div className="flex flex-col items-center px-6 pt-8 pb-6">
          <h2 className="text-xl font-semibold text-center mb-8" data-testid="text-exercise-name">
            {exerciseName}
          </h2>

          <div className="relative w-64 h-64 flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full bg-[#1a1a1a] border-4 border-[#2a2a2a]" />
            
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="#2a2a2a"
                strokeWidth="6"
                fill="none"
              />
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
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="text-6xl font-bold tracking-tight" data-testid="text-countdown">
                {minutes.toString().padStart(2, '0')}:{remainingSeconds.toString().padStart(2, '0')}
              </div>
              <div className="text-muted-foreground text-sm mt-1">
                Minutes
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setIsPaused(!isPaused)}
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
