import { ExerciseCard } from "../ExerciseCard";
import squatImage from "@assets/generated_images/Barbell_squat_exercise_photo_39428c05.png";

export default function ExerciseCardExample() {
  return (
    <div className="p-8 max-w-sm">
      <ExerciseCard
        id="1"
        name="Barbell Squat"
        category="Strength"
        muscleGroup="Legs"
        description="Compound lower body exercise targeting quads, glutes, and hamstrings. Stand with barbell on upper back, squat down keeping chest up."
        imageUrl={squatImage}
        onAdd={(id) => console.log("Added exercise:", id)}
      />
    </div>
  );
}
