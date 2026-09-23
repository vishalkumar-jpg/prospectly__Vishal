import { useAuth } from "@/contexts/AuthContext";
import {
  ProfileGateSuppressionContext,
  useProfileGateSuppressionState,
} from "@/contexts/profile-gate-suppression";
import { getPayoutCurrencyForCountry } from "@/lib/stripe-connect";
import { ProfileCompletionModal } from "./ProfileCompletionModal";

/**
 * Renders the app as normal, overlaying a blocking modal when the signed-in
 * user still owes a profile detail.
 *
 * Children stay mounted on purpose: the user keeps the page they navigated to
 * and lands back on it the moment the gate clears, instead of being redirected
 * away and losing their destination.
 *
 * A child flow that collects the same details itself can silence the modal via
 * `useSuppressProfileGate`.
 */
export function ProfileCompletionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { isSuppressed, setSuppression } = useProfileGateSuppressionState();

  // Mirrors the server's `isSupportedPayoutCountry` check rather than a bare
  // truthiness test, so a legacy row holding an unsupported code (which the
  // payout flow cannot use) is still gated.
  const needsCountry = getPayoutCurrencyForCountry(user?.country) === null;

  // Organization is optional, so it is prompted only until the user picks one
  // or confirms past it.
  const needsOrganisationPrompt =
    !user?.hasOrganisation && !user?.userConfiguration?.hasSkippedOrganisation;

  const needsCompletion =
    !loading && !!user && (needsCountry || needsOrganisationPrompt);

  return (
    <ProfileGateSuppressionContext.Provider value={setSuppression}>
      {children}
      {needsCompletion && !isSuppressed && <ProfileCompletionModal />}
    </ProfileGateSuppressionContext.Provider>
  );
}
