import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ExerciseCard } from "@/components/ExerciseCard";
import { AddExerciseDialog } from "@/components/AddExerciseDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { exerciseLibrary, exerciseCategories, type Exercise } from "@/data/exercises";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DBExercise {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  description: string;
  imageUrl: string | null;
}

export default function ExercisesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const { data: dbExercises = [], isError } = useQuery<DBExercise[]>({
    queryKey: ["/api/exercises"],
  });

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error loading exercises",
        description: "There was a problem loading custom exercises from the database.",
        variant: "destructive",
      });
    }
  }, [isError, toast]);

  const customExercises: Exercise[] = dbExercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    category: ex.category,
    muscleGroup: ex.muscleGroup,
    description: ex.description,
    imageUrl: ex.imageUrl || undefined,
  }));

  const allExercises = [...exerciseLibrary, ...customExercises];

  const createMutation = useMutation({
    mutationFn: async (exercise: { name: string; category: string; muscleGroup: string; description: string }) => {
      const imageUrl = getCategoryPlaceholderImage(exercise.category);
      return apiRequest("POST", "/api/exercises", {
        ...exercise,
        imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      setShowAddDialog(false);
      toast({
        title: "Exercise Created",
        description: "Your custom exercise has been added to the library.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create exercise. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getCategoryPlaceholderImage = (category: string): string => {
    const categoryImages: Record<string, string> = {
      Chest: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
      Back: "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400&h=300&fit=crop",
      Shoulders: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400&h=300&fit=crop",
      Biceps: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=300&fit=crop",
      Triceps: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=300&fit=crop",
      Core: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
      Cardio: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&h=300&fit=crop",
      PT: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
      Flexibility: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
      Mobility: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
    };
    return categoryImages[category] || "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=300&fit=crop";
  };

  const filteredExercises = allExercises.filter((exercise) => {
    const matchesCategory = selectedCategory === "All" || exercise.category === selectedCategory;
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          exercise.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddExercise = (id: string) => {
    console.log("Adding exercise to workout:", id);
  };

  const handleCreateExercise = (data: { name: string; category: string; muscleGroup: string; description: string }) => {
    createMutation.mutate(data);
  };

  return (
    <div className="flex-1 overflow-auto h-full">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-8 sm:pb-12 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">
              Exercise Library
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse and add exercises to your workouts
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-exercise">
            <Plus className="h-4 w-4 mr-2" />
            Add Exercise
          </Button>
        </div>

        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
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
          <ScrollArea className="w-full sm:w-auto whitespace-nowrap">
            <div className="flex gap-2 pb-2 sm:pb-0">
              {exerciseCategories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap hover-elevate active-elevate-2 text-xs sm:text-sm"
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`badge-category-${category.toLowerCase()}`}
                >
                  {category}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="sm:hidden" />
          </ScrollArea>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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

        <AddExerciseDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSave={handleCreateExercise}
          isPending={createMutation.isPending}
        />
      </div>
    </div>
  );
}
