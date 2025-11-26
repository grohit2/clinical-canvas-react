import { useEffect, useCallback, useRef } from "react";

/**
 * Hook to prevent accidental navigation when there are unsaved changes.
 *
 * Features:
 * - Adds `beforeunload` listener to warn before closing/refreshing the tab
 * - Note: React Router's useBlocker requires a data router (createBrowserRouter).
 *   Since we use BrowserRouter, in-app navigation blocking is not available.
 *   The beforeunload handler still works for browser close/refresh.
 *
 * @param isDirty - Whether there are unsaved changes
 * @param message - Optional custom message (only used for beforeunload in supported browsers)
 * @returns Object with blocker state and methods (blocker features are no-ops without data router)
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const { formState: { isDirty } } = useForm();
 *   const { isBlocked, proceed, reset } = useUnsavedGuard(isDirty);
 *
 *   return (
 *     <>
 *       <form>...</form>
 *       {isBlocked && (
 *         <ConfirmDialog
 *           open={isBlocked}
 *           onConfirm={proceed}
 *           onCancel={reset}
 *         />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useUnsavedGuard(
  isDirty: boolean,
  message: string = "You have unsaved changes. Are you sure you want to leave?"
) {
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  // Handle browser close/refresh
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirtyRef.current) return;

      // Standard way to trigger browser's native dialog
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = message;
      return message;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [message]);

  // Note: useBlocker from react-router-dom requires a "data router" (createBrowserRouter).
  // Since we're using BrowserRouter, in-app navigation blocking is not available.
  // The beforeunload handler above still protects against browser close/refresh.

  // Provide no-op implementations for blocker methods
  const proceed = useCallback(() => {
    // No-op: useBlocker not available with BrowserRouter
  }, []);

  const reset = useCallback(() => {
    // No-op: useBlocker not available with BrowserRouter
  }, []);

  return {
    /**
     * Whether navigation is currently blocked (always false without data router)
     */
    isBlocked: false,

    /**
     * The blocker state (always "unblocked" without data router)
     */
    blockerState: "unblocked" as const,

    /**
     * Call this to proceed with the blocked navigation
     */
    proceed,

    /**
     * Call this to cancel the blocked navigation and stay on page
     */
    reset,

    /**
     * The location user is trying to navigate to (always null without data router)
     */
    blockedLocation: null,
  };
}

/**
 * Simpler version that just adds the beforeunload handler
 * without React Router integration (for use outside of router context)
 */
export function useBeforeUnloadGuard(isDirty: boolean, message?: string) {
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;

      e.preventDefault();
      e.returnValue = message || "";
      return message || "";
    }

    if (isDirty) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [isDirty, message]);
}
