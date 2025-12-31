import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

interface ExerciseCardProps {
  id: string;
  name: string;
  muscleGroups: string[];
  description: string;
  imageUrl?: string;
  onAdd?: (id: string) => void;
}

export function ExerciseCard({
  id,
  name,
  muscleGroups,
  description,
  imageUrl,
  onAdd,
}: ExerciseCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-exercise-${id}`}>
      {imageUrl && (
        <div className="aspect-[16/10] sm:aspect-video overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="space-y-2 p-4 sm:p-6">
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          {muscleGroups.map((group) => (
            <Badge key={group} variant="secondary" className="text-xs" data-testid={`badge-muscle-${id}-${group.toLowerCase()}`}>
              {group}
            </Badge>
          ))}
        </div>
        <CardTitle className="text-base sm:text-lg" data-testid={`text-exercise-name-${id}`}>
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${id}`}>
          {description}
        </p>
      </CardContent>
      <CardFooter className="p-4 sm:p-6 pt-0 sm:pt-0">
        <Button
          onClick={() => onAdd?.(id)}
          className="w-full"
          size="sm"
          data-testid={`button-add-exercise-${id}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add to Workout
        </Button>
      </CardFooter>
    </Card>
  );
}
