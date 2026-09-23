import { createContext, useCallback, useContext, useEffect, useState } from "react";

type SuppressionSetter = (delta: number) => void;

export const ProfileGateSuppressionContext =
  createContext<SuppressionSetter | null>(null);

/**
 * Owns the suppression counter for `ProfileCompletionGate`.
 *
 * A counter rather than a boolean so overlapping suppressors cannot release the
 * gate early when the first of them unmounts.
 */
export function useProfileGateSuppressionState() {
  const [suppressCount, setSuppressCount] = useState(0);

  const setSuppression = useCallback<SuppressionSetter>(
    (delta) => setSuppressCount((count) => count + delta),
    []
  );

  return { isSuppressed: suppressCount > 0, setSuppression };
}

/**
 * Hides the completion gate for as long as the calling component is mounted.
 *
 * Used by flows that collect the same details themselves — the apply modals ask
 * for a country — so the user is never shown two dialogs asking the same thing.
 * Releasing on unmount is what makes the dismiss case work: closing the apply
 * modal without submitting leaves the country unsaved, and the gate takes over.
 */
export function useSuppressProfileGate() {
  const setSuppression = useContext(ProfileGateSuppressionContext);

  useEffect(() => {
    setSuppression?.(1);

    return () => setSuppression?.(-1);
  }, [setSuppression]);
}
