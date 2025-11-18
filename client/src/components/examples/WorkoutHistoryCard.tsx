import { WorkoutHistoryCard } from "../WorkoutHistoryCard";

export default function WorkoutHistoryCardExample() {
  return (
    <div className="p-8 max-w-2xl">
      <WorkoutHistoryCard
        id="1"
        workoutName="Upper Body Strength"
        date={new Date(Date.now() - 86400000)}
        duration={45}
        exerciseCount={6}
        totalVolume={3250}
        exercises={[
          {
            name: "Bench Press",
            sets: [
              { weight: 135, reps: 10 },
              { weight: 185, reps: 8 },
              { weight: 225, reps: 6 },
            ],
          },
          {
            name: "Barbell Row",
            sets: [
              { weight: 135, reps: 10 },
              { weight: 155, reps: 8 },
              { weight: 175, reps: 6 },
            ],
          },
        ]}
      />
    </div>
  );
}
