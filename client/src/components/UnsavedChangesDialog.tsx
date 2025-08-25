import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface UnsavedChangesDialogProps {
  open: boolean;
  onConfirmDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  open,
  onConfirmDiscard,
  onCancel
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Discard changes?
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            You have unsaved changes. Are you sure you want to discard them?
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-end mt-6">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirmDiscard}
          >
            Discard Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}