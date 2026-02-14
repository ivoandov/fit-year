export interface BuiltInExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  description: string;
  imageUrl: string;
  exerciseType: "weight_reps" | "distance_time";
  isAssisted?: boolean;
}

export const builtInExercises: BuiltInExercise[] = [
  {
    id: "1",
    name: "Barbell Squat",
    muscleGroups: ["Legs"],
    description: "Compound lower body exercise targeting quads, glutes, and hamstrings. Stand with barbell on upper back, squat down keeping chest up.",
    imageUrl: "/generated_images/Barbell_squat_exercise_photo_39428c05.png",
    exerciseType: "weight_reps",
  },
  {
    id: "2",
    name: "Bench Press",
    muscleGroups: ["Chest", "Triceps"],
    description: "Upper body pressing movement for chest, shoulders, and triceps. Lie on bench and press barbell from chest to full extension.",
    imageUrl: "/generated_images/Bench_press_exercise_photo_6f5085c2.png",
    exerciseType: "weight_reps",
  },
  {
    id: "3",
    name: "Deadlift",
    muscleGroups: ["Back", "Legs"],
    description: "Full body compound exercise emphasizing posterior chain. Lift barbell from floor to standing position with proper hip hinge.",
    imageUrl: "/generated_images/Deadlift_exercise_photo_0ef501a3.png",
    exerciseType: "weight_reps",
  },
  {
    id: "4",
    name: "Treadmill Run",
    muscleGroups: ["Cardio"],
    description: "Cardiovascular endurance training on treadmill. Adjust speed and incline for varying intensity levels.",
    imageUrl: "/objects/public/exercises/Treadmill_running_exercise_photo_b0cf7ff7.jpg",
    exerciseType: "distance_time",
  },
  {
    id: "5",
    name: "Pull-ups",
    muscleGroups: ["Back", "Biceps"],
    description: "Bodyweight exercise for back and biceps. Hang from bar and pull body up until chin clears the bar.",
    imageUrl: "/objects/public/exercises/Pull-ups_exercise_photo_303dd425.jpg",
    exerciseType: "weight_reps",
  },
  {
    id: "6",
    name: "Plank",
    muscleGroups: ["Abs/Core"],
    description: "Isometric core strengthening exercise. Hold body in straight line position supported by forearms and toes.",
    imageUrl: "/objects/public/exercises/Plank_exercise_photo_3a52c638.jpg",
    exerciseType: "distance_time",
  },
  {
    id: "7",
    name: "Shoulder Press",
    muscleGroups: ["Shoulders", "Triceps"],
    description: "Overhead pressing movement for shoulders and triceps. Press weight from shoulder level to full arm extension overhead.",
    imageUrl: "/objects/public/exercises/female_shoulder_press_exercise.jpg",
    exerciseType: "weight_reps",
  },
  {
    id: "8",
    name: "Bicep Curls",
    muscleGroups: ["Biceps"],
    description: "Isolation exercise for biceps. Curl weight from extended arm position to shoulder level while keeping elbows stationary.",
    imageUrl: "/generated_images/male_bicep_curls_exercise.png",
    exerciseType: "weight_reps",
  },
  {
    id: "9",
    name: "Tricep Dips",
    muscleGroups: ["Triceps", "Chest"],
    description: "Bodyweight exercise for triceps. Lower body by bending arms, then push back up to starting position.",
    imageUrl: "/objects/public/exercises/female_tricep_dips_exercise.jpg",
    exerciseType: "weight_reps",
  },
  {
    id: "10",
    name: "Lunges",
    muscleGroups: ["Legs"],
    description: "Unilateral leg exercise for quads, glutes, and balance. Step forward and lower back knee toward ground.",
    imageUrl: "/objects/public/exercises/male_lunges_exercise.jpg",
    exerciseType: "weight_reps",
  },
  {
    id: "11",
    name: "Lat Pulldown",
    muscleGroups: ["Back", "Biceps"],
    description: "Cable machine exercise for back and biceps. Pull bar down to chest level while keeping torso upright.",
    imageUrl: "/objects/public/exercises/female_lat_pulldown_exercise.jpg",
    exerciseType: "weight_reps",
  },
  {
    id: "12",
    name: "Cable Fly",
    muscleGroups: ["Chest"],
    description: "Isolation exercise for chest using cable machine. Bring handles together in front of body with slight arm bend.",
    imageUrl: "/objects/public/exercises/male_cable_fly_exercise.jpg",
    exerciseType: "weight_reps",
  },
];
