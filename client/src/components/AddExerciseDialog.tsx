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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exerciseCategories } from "@/data/exercises";

interface AddExerciseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    category: string;
    muscleGroup: string;
    description: string;
  }) => void;
  isPending?: boolean;
}

const muscleGroups = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Core",
  "Legs",
  "Full Body",
];

export function AddExerciseDialog({
  isOpen,
  onClose,
  onSave,
  isPending = false,
}: AddExerciseDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (!name || !category || !muscleGroup || !description) return;
    onSave({ name, category, muscleGroup, description });
    setName("");
    setCategory("");
    setMuscleGroup("");
    setDescription("");
  };

  const handleClose = () => {
    setName("");
    setCategory("");
    setMuscleGroup("");
    setDescription("");
    onClose();
  };

  const categories = exerciseCategories.filter(c => c !== "All");

  const isValid = name && category && muscleGroup && description;

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
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="muscleGroup">Muscle Group</Label>
            <Select value={muscleGroup} onValueChange={setMuscleGroup}>
              <SelectTrigger data-testid="select-muscle-group">
                <SelectValue placeholder="Select muscle group" />
              </SelectTrigger>
              <SelectContent>
                {muscleGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
