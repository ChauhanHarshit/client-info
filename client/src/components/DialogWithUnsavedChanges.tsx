import { ReactNode, ReactElement, cloneElement, Children, isValidElement } from 'react';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";

interface DialogWithUnsavedChangesProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchFields?: Record<string, any>;
  disabled?: boolean;
}

export function DialogWithUnsavedChanges({
  children,
  open,
  onOpenChange,
  watchFields = {},
  disabled = false
}: DialogWithUnsavedChangesProps) {
  const {
    showDiscardDialog,
    handleClose,
    handleConfirmDiscard,
    handleCancelDiscard
  } = useUnsavedChanges({
    isOpen: open,
    onClose: () => onOpenChange(false),
    watchFields,
    disabled
  });

  // Clone Dialog and intercept onOpenChange
  const processChildren = (children: ReactNode): ReactNode => {
    return Children.map(children, (child) => {
      if (!isValidElement(child)) return child;

      // If it's a Dialog component, intercept onOpenChange
      if (child.type === Dialog) {
        return cloneElement(child as ReactElement, {
          ...child.props,
          open,
          onOpenChange: (newOpen: boolean) => {
            if (!newOpen) {
              handleClose();
            } else {
              onOpenChange(newOpen);
            }
          }
        });
      }

      // If it's a DialogContent, intercept pointer events to detect outside clicks
      if (child.type === DialogContent) {
        return cloneElement(child as ReactElement, {
          ...child.props,
          onPointerDownOutside: (e: Event) => {
            e.preventDefault();
            handleClose();
          },
          onEscapeKeyDown: (e: KeyboardEvent) => {
            e.preventDefault();
            handleClose();
          }
        });
      }

      // Recursively process children
      if (child.props?.children) {
        return cloneElement(child as ReactElement, {
          ...child.props,
          children: processChildren(child.props.children)
        });
      }

      return child;
    });
  };

  return (
    <>
      {processChildren(children)}
      <UnsavedChangesDialog
        open={showDiscardDialog}
        onConfirmDiscard={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </>
  );
}