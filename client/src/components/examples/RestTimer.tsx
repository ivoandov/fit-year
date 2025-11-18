import { useState } from "react";
import { RestTimer } from "../RestTimer";
import { Button } from "@/components/ui/button";

export default function RestTimerExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8 flex items-center justify-center">
      <Button onClick={() => setIsOpen(true)}>
        Open Rest Timer
      </Button>
      <RestTimer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialSeconds={90}
      />
    </div>
  );
}
