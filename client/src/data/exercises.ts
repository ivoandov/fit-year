import squatImage from "@assets/generated_images/Barbell_squat_exercise_photo_39428c05.png";
import benchImage from "@assets/generated_images/Bench_press_exercise_photo_6f5085c2.png";
import deadliftImage from "@assets/generated_images/Deadlift_exercise_photo_0ef501a3.png";
import treadmillImage from "@assets/generated_images/Treadmill_running_exercise_photo_b0cf7ff7.png";
import pullupImage from "@assets/generated_images/Pull-ups_exercise_photo_303dd425.png";
import plankImage from "@assets/generated_images/Plank_exercise_photo_3a52c638.png";
import shoulderPressImage from "@assets/generated_images/female_shoulder_press_exercise.png";
import bicepCurlsImage from "@assets/generated_images/male_bicep_curls_exercise.png";
import tricepDipsImage from "@assets/generated_images/female_tricep_dips_exercise.png";
import lungesImage from "@assets/generated_images/male_lunges_exercise.png";
import latPulldownImage from "@assets/generated_images/female_lat_pulldown_exercise.png";
import cableFlyImage from "@assets/generated_images/male_cable_fly_exercise.png";

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  description: string;
  imageUrl?: string;
}

export const exerciseLibrary: Exercise[] = [
  {
    id: "1",
    name: "Barbell Squat",
    muscleGroups: ["Legs", "Core"],
    description: "Compound lower body exercise targeting quads, glutes, and hamstrings. Stand with barbell on upper back, squat down keeping chest up.",
    imageUrl: squatImage,
  },
  {
    id: "2",
    name: "Bench Press",
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    description: "Upper body pressing movement for chest, shoulders, and triceps. Lie on bench and press barbell from chest to full extension.",
    imageUrl: benchImage,
  },
  {
    id: "3",
    name: "Deadlift",
    muscleGroups: ["Back", "Legs", "Core"],
    description: "Full body compound exercise emphasizing posterior chain. Lift barbell from floor to standing position with proper hip hinge.",
    imageUrl: deadliftImage,
  },
  {
    id: "4",
    name: "Treadmill Run",
    muscleGroups: ["Cardio"],
    description: "Cardiovascular endurance training on treadmill. Adjust speed and incline for varying intensity levels.",
    imageUrl: treadmillImage,
  },
  {
    id: "5",
    name: "Pull-ups",
    muscleGroups: ["Back", "Biceps"],
    description: "Bodyweight exercise for back and biceps. Hang from bar and pull body up until chin clears the bar.",
    imageUrl: pullupImage,
  },
  {
    id: "6",
    name: "Plank",
    muscleGroups: ["Core"],
    description: "Isometric core strengthening exercise. Hold body in straight line position supported by forearms and toes.",
    imageUrl: plankImage,
  },
  {
    id: "7",
    name: "Shoulder Press",
    muscleGroups: ["Shoulders", "Triceps"],
    description: "Overhead pressing movement for shoulders and triceps. Press weight from shoulder level to full arm extension overhead.",
    imageUrl: shoulderPressImage,
  },
  {
    id: "8",
    name: "Bicep Curls",
    muscleGroups: ["Biceps"],
    description: "Isolation exercise for biceps. Curl weight from extended arm position to shoulder level while keeping elbows stationary.",
    imageUrl: bicepCurlsImage,
  },
  {
    id: "9",
    name: "Tricep Dips",
    muscleGroups: ["Triceps"],
    description: "Bodyweight exercise for triceps. Lower body by bending arms, then push back up to starting position.",
    imageUrl: tricepDipsImage,
  },
  {
    id: "10",
    name: "Lunges",
    muscleGroups: ["Legs", "Core"],
    description: "Unilateral leg exercise for quads, glutes, and balance. Step forward and lower back knee toward ground.",
    imageUrl: lungesImage,
  },
  {
    id: "11",
    name: "Lat Pulldown",
    muscleGroups: ["Back", "Biceps"],
    description: "Cable machine exercise for back and biceps. Pull bar down to chest level while keeping torso upright.",
    imageUrl: latPulldownImage,
  },
  {
    id: "12",
    name: "Cable Fly",
    muscleGroups: ["Chest"],
    description: "Isolation exercise for chest using cable machine. Bring handles together in front of body with slight arm bend.",
    imageUrl: cableFlyImage,
  },
];

export const muscleGroups = [
  "All",
  "Shoulders",
  "Chest",
  "Biceps",
  "Triceps",
  "Back",
  "Core",
  "Legs",
  "Cardio",
  "PT",
  "Flexibility",
  "Mobility",
];
