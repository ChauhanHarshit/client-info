import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GripVertical } from "lucide-react";

interface Team {
  id: number;
  name: string;
  color: string;
  displayOrder: number;
}

interface TeamOrderingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SortableTeamItem({ team }: { team: Team }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center p-3 bg-white border rounded-lg shadow-sm ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing mr-3 text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex items-center flex-1">
        <div
          className="w-3 h-3 rounded-full mr-3"
          style={{ backgroundColor: team.color }}
        />
        <span className="font-medium">{team.name}</span>
      </div>
      <span className="text-sm text-gray-500">Order: {team.displayOrder}</span>
    </div>
  );
}

export function TeamOrderingModal({ isOpen, onClose }: TeamOrderingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [teams, setTeams] = useState<Team[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<Team[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ["/api/teams"],
    enabled: isOpen,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (teamOrders: { id: number; displayOrder: number }[]) => {
      return await apiRequest("/api/teams/order", "PATCH", teamOrders);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team order updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team order",
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = teams.findIndex((team) => team.id === active.id);
      const newIndex = teams.findIndex((team) => team.id === over.id);

      const newTeams = arrayMove(teams, oldIndex, newIndex);
      
      // Update display order based on new positions
      const updatedTeams = newTeams.map((team, index) => ({
        ...team,
        displayOrder: index + 1,
      }));

      setPendingOrder(updatedTeams);
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmReorder = () => {
    const teamOrders = pendingOrder.map((team) => ({
      id: team.id,
      displayOrder: team.displayOrder,
    }));

    setTeams(pendingOrder);
    updateOrderMutation.mutate(teamOrders);
    setShowConfirmDialog(false);
  };

  const handleCancelReorder = () => {
    setShowConfirmDialog(false);
    setPendingOrder([]);
  };

  // Initialize teams when data is loaded
  if (teamsData && Array.isArray(teamsData) && teams.length === 0) {
    const sortedTeams = [...teamsData].sort((a, b) => a.displayOrder - b.displayOrder);
    setTeams(sortedTeams);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reorder Teams</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Drag and drop teams to reorder them. This will affect how teams appear in all dropdown menus throughout the system.
            </p>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading teams...</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={teams.map((team) => team.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <SortableTeamItem key={team.id} team={team} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Team Reordering</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the display order of teams across all UI dropdowns and may affect team-based permissions. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReorder}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReorder}
              disabled={updateOrderMutation.isPending}
            >
              {updateOrderMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}