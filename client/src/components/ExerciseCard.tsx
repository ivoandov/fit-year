import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

interface ExerciseCardProps {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  description: string;
  imageUrl?: string;
  onAdd?: (id: string) => void;
}

export function ExerciseCard({
  id,
  name,
  category,
  muscleGroup,
  description,
  imageUrl,
  onAdd,
}: ExerciseCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-exercise-${id}`}>
      {imageUrl && (
        <div className="aspect-video overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="space-y-2">
        <div className="flex gap-2">
          <Badge variant="secondary" data-testid={`badge-category-${id}`}>
            {category}
          </Badge>
          <Badge variant="outline" data-testid={`badge-muscle-${id}`}>
            {muscleGroup}
          </Badge>
        </div>
        <CardTitle className="text-lg" data-testid={`text-exercise-name-${id}`}>
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${id}`}>
          {description}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onAdd?.(id)}
          className="w-full"
          data-testid={`button-add-exercise-${id}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add to Workout
        </Button>
      </CardFooter>
    </Card>
  );
}
