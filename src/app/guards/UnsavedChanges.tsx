import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUnsavedGuard } from "@/shared/hooks/use-unsaved-guard";

/**
 * Context for managing unsaved changes state across form components.
 */
interface UnsavedChangesContextValue {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  markClean: () => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

/**
 * Hook to access the UnsavedChanges context.
 * Use this in form components to register their dirty state.
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const { setIsDirty, markClean } = useUnsavedChangesContext();
 *   const { formState: { isDirty } } = useForm();
 *
 *   useEffect(() => {
 *     setIsDirty(isDirty);
 *   }, [isDirty, setIsDirty]);
 *
 *   const onSubmit = async (data) => {
 *     await saveData(data);
 *     markClean(); // Clear dirty state after successful save
 *   };
 * }
 * ```
 */
export function useUnsavedChangesContext() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error("useUnsavedChangesContext must be used within UnsavedChangesGuard");
  }
  return context;
}

interface UnsavedChangesGuardProps {
  children: ReactNode;
  /**
   * Optional title for the confirmation dialog
   */
  title?: string;
  /**
   * Optional message for the confirmation dialog
   */
  message?: string;
  /**
   * Optional label for the confirm/leave button
   */
  confirmLabel?: string;
  /**
   * Optional label for the cancel/stay button
   */
  cancelLabel?: string;
}

/**
 * Route guard component that prevents navigation when there are unsaved changes.
 *
 * Wrap this around routes/pages that contain forms to prevent accidental navigation.
 *
 * @example
 * ```tsx
 * // In App.tsx routes
 * <Route
 *   path="/patients/:id/edit"
 *   element={
 *     <UnsavedChangesGuard>
 *       <PatientRegistrationPage />
 *     </UnsavedChangesGuard>
 *   }
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With custom messages
 * <UnsavedChangesGuard
 *   title="Discard changes?"
 *   message="Your patient information has not been saved."
 *   confirmLabel="Discard"
 *   cancelLabel="Keep Editing"
 * >
 *   <PatientRegistrationPage />
 * </UnsavedChangesGuard>
 * ```
 */
export function UnsavedChangesGuard({
  children,
  title = "Unsaved Changes",
  message = "You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?",
  confirmLabel = "Leave Page",
  cancelLabel = "Stay on Page",
}: UnsavedChangesGuardProps) {
  const [isDirty, setIsDirtyState] = useState(false);

  const setIsDirty = useCallback((dirty: boolean) => {
    setIsDirtyState(dirty);
  }, []);

  const markClean = useCallback(() => {
    setIsDirtyState(false);
  }, []);

  const { isBlocked, proceed, reset } = useUnsavedGuard(isDirty);

  const contextValue: UnsavedChangesContextValue = {
    isDirty,
    setIsDirty,
    markClean,
  };

  return (
    <UnsavedChangesContext.Provider value={contextValue}>
      {children}

      <Dialog open={isBlocked} onOpenChange={(open) => !open && reset()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={reset}>
              {cancelLabel}
            </Button>
            <Button variant="destructive" onClick={proceed}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UnsavedChangesContext.Provider>
  );
}

/**
 * Simpler variant that directly accepts isDirty prop instead of using context.
 * Use this when you have direct control over the dirty state.
 *
 * @example
 * ```tsx
 * function EditPage() {
 *   const { formState: { isDirty } } = useForm();
 *
 *   return (
 *     <UnsavedChangesPrompt isDirty={isDirty}>
 *       <form>...</form>
 *     </UnsavedChangesPrompt>
 *   );
 * }
 * ```
 */
interface UnsavedChangesPromptProps {
  children: ReactNode;
  isDirty: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function UnsavedChangesPrompt({
  children,
  isDirty,
  title = "Unsaved Changes",
  message = "You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?",
  confirmLabel = "Leave Page",
  cancelLabel = "Stay on Page",
}: UnsavedChangesPromptProps) {
  const { isBlocked, proceed, reset } = useUnsavedGuard(isDirty);

  return (
    <>
      {children}

      <Dialog open={isBlocked} onOpenChange={(open) => !open && reset()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={reset}>
              {cancelLabel}
            </Button>
            <Button variant="destructive" onClick={proceed}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
