import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface ScheduleWorkoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule?: (data: ScheduleData) => void;
}

export interface ScheduleData {
  workoutName: string;
  date: Date;
  repeatType: "none" | "daily" | "weekly" | "custom";
  repeatInterval?: number;
}

export function ScheduleWorkoutDialog({
  isOpen,
  onClose,
  onSchedule,
}: ScheduleWorkoutDialogProps) {
  const [workoutName, setWorkoutName] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [repeatType, setRepeatType] = useState<"none" | "daily" | "weekly" | "custom">("none");
  const [repeatInterval, setRepeatInterval] = useState(1);

  const handleSchedule = () => {
    onSchedule?.({
      workoutName,
      date,
      repeatType,
      repeatInterval: repeatType === "custom" ? repeatInterval : undefined,
    });
    onClose();
    setWorkoutName("");
    setDate(new Date());
    setRepeatType("none");
    setRepeatInterval(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto" data-testid="dialog-schedule-workout">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl" data-testid="text-dialog-title">Schedule Workout</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Set up a workout and configure when it repeats
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          <div className="space-y-2">
            <Label htmlFor="workout-name" className="text-sm">Workout Name</Label>
            <Input
              id="workout-name"
              placeholder="e.g., Upper Body Strength"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              data-testid="input-workout-name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Start Date</Label>
            <div className="flex justify-center overflow-x-auto">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                className="rounded-md border"
                data-testid="calendar-start-date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repeat-type" className="text-sm">Repeat</Label>
            <Select
              value={repeatType}
              onValueChange={(value: "none" | "daily" | "weekly" | "custom") =>
                setRepeatType(value)
              }
            >
              <SelectTrigger id="repeat-type" data-testid="select-repeat-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="custom">Every N days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {repeatType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="repeat-interval" className="text-sm">Repeat every</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="repeat-interval"
                  type="number"
                  min="1"
                  value={repeatInterval}
                  onChange={(e) => setRepeatInterval(parseInt(e.target.value) || 1)}
                  className="w-20 sm:w-24"
                  data-testid="input-repeat-interval"
                />
                <span className="text-xs sm:text-sm text-muted-foreground">days</span>
              </div>
            </div>
          )}

          <div className="rounded-md bg-muted p-3 sm:p-4">
            <p className="text-xs sm:text-sm font-medium mb-1">Summary</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {workoutName || "Workout"} on {format(date, "PP")}
              {repeatType === "daily" && ", repeating daily"}
              {repeatType === "weekly" && ", repeating weekly"}
              {repeatType === "custom" && `, every ${repeatInterval} days`}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto" data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!workoutName}
            className="w-full sm:w-auto"
            data-testid="button-schedule"
          >
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
