import { useBountyStages } from "./useBountyStages";

/**
 * Simple hook to get bounty percentages for each stage
 * Returns an object mapping stage IDs to their percentage values
 */
export function useBountyPercentages() {
  const { stages, loading, error, getBountyPercentage } = useBountyStages();

  // Create a mapping of stage IDs to percentages
  const percentages = {
    request_accepted: getBountyPercentage("request_accepted"),
    intro_sent: getBountyPercentage("intro_sent"),
    response_received: getBountyPercentage("response_received"),
    meeting_booked: getBountyPercentage("meeting_booked"),
    meeting_completed: getBountyPercentage("meeting_completed"),
    peer_feedback: getBountyPercentage("peer_feedback"),
    platform_fee: getBountyPercentage("platform_fee"),
  };

  return {
    percentages,
    loading,
    error,
    getBountyPercentage,
    stages,
  };
}
