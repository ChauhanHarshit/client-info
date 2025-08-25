import { useEffect, useRef, useState, useCallback } from 'react';

interface UseUnsavedChangesProps {
  isOpen: boolean;
  onClose: () => void;
  watchFields?: Record<string, any>;
  disabled?: boolean;
}

interface UseUnsavedChangesReturn {
  hasUnsavedChanges: boolean;
  showDiscardDialog: boolean;
  handleClose: () => void;
  handleConfirmDiscard: () => void;
  handleCancelDiscard: () => void;
  updateInitialValues: (values: Record<string, any>) => void;
  getDialogProps: () => {
    onOpenChange: (open: boolean) => void;
    onPointerDownOutside?: (e: Event) => void;
    onEscapeKeyDown?: (e: KeyboardEvent) => void;
  };
}

export function useUnsavedChanges({
  isOpen,
  onClose,
  watchFields = {},
  disabled = false
}: UseUnsavedChangesProps): UseUnsavedChangesReturn {
  const initialValuesRef = useRef<Record<string, any>>({});
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Update initial values when modal opens or when explicitly called
  const updateInitialValues = useCallback((values: Record<string, any>) => {
    initialValuesRef.current = JSON.parse(JSON.stringify(values));
  }, []);

  // Set initial values when modal opens
  useEffect(() => {
    if (isOpen && Object.keys(watchFields).length > 0) {
      updateInitialValues(watchFields);
    }
  }, [isOpen, updateInitialValues]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (disabled || !isOpen) return false;
    
    const current = watchFields;
    const initial = initialValuesRef.current;
    
    // Deep comparison of form values, ignoring empty initial values
    const currentStr = JSON.stringify(current);
    const initialStr = JSON.stringify(initial);
    
    // Only consider it dirty if we moved away from the initial state
    return currentStr !== initialStr && JSON.stringify(initial) !== JSON.stringify({});
  }, [watchFields, disabled, isOpen]);

  // Handle close attempt
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  // Confirm discard - close modal and reset
  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    onClose();
  }, [onClose]);

  // Cancel discard - keep modal open
  const handleCancelDiscard = useCallback(() => {
    setShowDiscardDialog(false);
  }, []);

  // Get dialog props that can be spread on Dialog or DialogContent components
  const getDialogProps = useCallback(() => ({
    onOpenChange: (open: boolean) => {
      if (!open) {
        handleClose();
      }
    },
    onPointerDownOutside: (e: Event) => {
      e.preventDefault();
      handleClose();
    },
    onEscapeKeyDown: (e: KeyboardEvent) => {
      e.preventDefault();
      handleClose();
    }
  }), [handleClose]);

  return {
    hasUnsavedChanges: hasUnsavedChanges(),
    showDiscardDialog,
    handleClose,
    handleConfirmDiscard,
    handleCancelDiscard,
    updateInitialValues,
    getDialogProps
  };
}