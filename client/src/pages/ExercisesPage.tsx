import { useState } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import squatImage from "@assets/generated_images/Barbell_squat_exercise_photo_39428c05.png";
import benchImage from "@assets/generated_images/Bench_press_exercise_photo_6f5085c2.png";
import deadliftImage from "@assets/generated_images/Deadlift_exercise_photo_0ef501a3.png";
import treadmillImage from "@assets/generated_images/Treadmill_running_exercise_photo_b0cf7ff7.png";
import pullupImage from "@assets/generated_images/Pull-ups_exercise_photo_303dd425.png";
import plankImage from "@assets/generated_images/Plank_exercise_photo_3a52c638.png";

export default function ExercisesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All", "Strength", "Cardio", "Flexibility"];

  const mockExercises = [
    {
      id: "1",
      name: "Barbell Squat",
      category: "Strength",
      muscleGroup: "Legs",
      description: "Compound lower body exercise targeting quads, glutes, and hamstrings. Stand with barbell on upper back, squat down keeping chest up.",
      imageUrl: squatImage,
    },
    {
      id: "2",
      name: "Bench Press",
      category: "Strength",
      muscleGroup: "Chest",
      description: "Upper body pressing movement for chest, shoulders, and triceps. Lie on bench and press barbell from chest to full extension.",
      imageUrl: benchImage,
    },
    {
      id: "3",
      name: "Deadlift",
      category: "Strength",
      muscleGroup: "Back",
      description: "Full body compound exercise emphasizing posterior chain. Lift barbell from floor to standing position with proper hip hinge.",
      imageUrl: deadliftImage,
    },
    {
      id: "4",
      name: "Treadmill Run",
      category: "Cardio",
      muscleGroup: "Full Body",
      description: "Cardiovascular endurance training on treadmill. Adjust speed and incline for varying intensity levels.",
      imageUrl: treadmillImage,
    },
    {
      id: "5",
      name: "Pull-ups",
      category: "Strength",
      muscleGroup: "Back",
      description: "Bodyweight exercise for back and biceps. Hang from bar and pull body up until chin clears the bar.",
      imageUrl: pullupImage,
    },
    {
      id: "6",
      name: "Plank",
      category: "Flexibility",
      muscleGroup: "Core",
      description: "Isometric core strengthening exercise. Hold body in straight line position supported by forearms and toes.",
      imageUrl: plankImage,
    },
  ];

  const filteredExercises = mockExercises.filter((exercise) => {
    const matchesCategory = selectedCategory === "All" || exercise.category === selectedCategory;
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          exercise.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddExercise = (id: string) => {
    console.log("Adding exercise to workout:", id);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Exercise Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and add exercises to your workouts
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap hover-elevate active-elevate-2"
                onClick={() => setSelectedCategory(category)}
                data-testid={`badge-category-${category.toLowerCase()}`}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              {...exercise}
              onAdd={handleAddExercise}
            />
          ))}
        </div>

        {filteredExercises.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No exercises found</p>
          </div>
        )}
      </div>
    </div>
  );
}
