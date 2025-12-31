import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Pencil, X } from "lucide-react";

interface ExerciseCardProps {
  id: string;
  name: string;
  muscleGroups: string[];
  description: string;
  imageUrl?: string;
  exerciseType?: string;
  isEditable?: boolean;
  onAdd?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function ExerciseCard({
  id,
  name,
  muscleGroups,
  description,
  imageUrl,
  isEditable = false,
  onEdit,
  onAdd,
}: ExerciseCardProps) {
  const [showImageDialog, setShowImageDialog] = useState(false);

  return (
    <>
      <Card className="overflow-hidden hover-elevate" data-testid={`card-exercise-${id}`}>
        {imageUrl && (
          <div 
            className="aspect-[16/10] sm:aspect-video overflow-hidden cursor-pointer"
            onClick={() => setShowImageDialog(true)}
            data-testid={`image-container-${id}`}
          >
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
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
        <CardFooter className="p-4 sm:p-6 pt-0 sm:pt-0 gap-2">
          {isEditable && (
            <Button
              onClick={() => onEdit?.(id)}
              variant="outline"
              size="sm"
              data-testid={`button-edit-exercise-${id}`}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button
            onClick={() => onAdd?.(id)}
            className="flex-1"
            size="sm"
            data-testid={`button-add-exercise-${id}`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to Workout
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-none">
          <div className="relative">
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 z-10 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={() => setShowImageDialog(false)}
              data-testid={`button-close-image-${id}`}
            >
              <X className="h-4 w-4" />
            </Button>
            {imageUrl && (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                data-testid={`image-fullsize-${id}`}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
