import { WorkoutCard } from "../WorkoutCard";

export default function WorkoutCardExample() {
  return (
    <div className="p-8 max-w-sm">
      <WorkoutCard
        id="1"
        name="Upper Body Strength"
        date={new Date()}
        exerciseCount={6}
        duration={45}
        onStart={(id) => console.log("Starting workout:", id)}
      />
    </div>
  );
}
