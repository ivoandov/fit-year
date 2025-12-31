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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { muscleGroups } from "@/data/exercises";

export type ExerciseType = "weight_reps" | "distance_time";

interface AddExerciseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    muscleGroups: string[];
    description: string;
    exerciseType: ExerciseType;
  }) => void;
  isPending?: boolean;
}

const selectableMuscleGroups = muscleGroups.filter(g => g !== "All");

export function AddExerciseDialog({
  isOpen,
  onClose,
  onSave,
  isPending = false,
}: AddExerciseDialogProps) {
  const [name, setName] = useState("");
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("weight_reps");

  const handleMuscleGroupToggle = (group: string) => {
    setSelectedMuscleGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const handleSave = () => {
    if (!name || selectedMuscleGroups.length === 0 || !description) return;
    onSave({ name, muscleGroups: selectedMuscleGroups, description, exerciseType });
    setName("");
    setSelectedMuscleGroups([]);
    setDescription("");
    setExerciseType("weight_reps");
  };

  const handleClose = () => {
    setName("");
    setSelectedMuscleGroups([]);
    setDescription("");
    setExerciseType("weight_reps");
    onClose();
  };

  const isValid = name && selectedMuscleGroups.length > 0 && description;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Exercise</DialogTitle>
          <DialogDescription>
            Create a custom exercise for your workout library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Exercise Name</Label>
            <Input
              id="name"
              placeholder="e.g., Romanian Deadlift"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-exercise-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={exerciseType} onValueChange={(v) => setExerciseType(v as ExerciseType)}>
              <SelectTrigger data-testid="select-exercise-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight_reps">Weight and Reps</SelectItem>
                <SelectItem value="distance_time">Distance and Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Muscle Groups</Label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {selectableMuscleGroups.map((group) => (
                <div key={group} className="flex items-center space-x-2">
                  <Checkbox
                    id={`muscle-${group}`}
                    checked={selectedMuscleGroups.includes(group)}
                    onCheckedChange={() => handleMuscleGroupToggle(group)}
                    data-testid={`checkbox-muscle-${group.toLowerCase()}`}
                  />
                  <label
                    htmlFor={`muscle-${group}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {group}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe how to perform the exercise..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-description"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isValid || isPending}
            data-testid="button-save-exercise"
          >
            {isPending ? "Saving..." : "Add Exercise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
