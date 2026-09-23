import { useState } from "react";
import { api } from "@/lib/api";
import type { PublicDealData } from "@/pages/public-deal";

type NavigateFn = (path: string) => void;

export function usePublicRequestClaim(params: {
  request: PublicDealData | null;
  requestId: string | undefined;
  sharerCode: string | undefined;
  navigate: NavigateFn;
}) {
  const { request, requestId, sharerCode, navigate } = params;
  const [claiming, setClaiming] = useState(false);
  const [showClaimedModal, setShowClaimedModal] = useState(false);

  const handleClaimRequest = async () => {
    if (!request || !requestId || !sharerCode) return;

    api.marketplace
      .trackEvent(requestId, sharerCode, { eventType: "claim_start" })
      .catch(() => {
        // Silent fail for tracking
      });

    if (request.isClaimed) {
      setShowClaimedModal(true);
      return;
    }

    setClaiming(true);

    const searchParams = new URLSearchParams();
    searchParams.set("originRequestId", requestId);
    searchParams.set("originRef", sharerCode);
    searchParams.set(
      "returnTo",
      `/verify-connection?requestId=${encodeURIComponent(requestId)}&sharerCode=${encodeURIComponent(sharerCode)}`
    );
    navigate(`/signin?${searchParams.toString()}`);
  };

  return {
    claiming,
    showClaimedModal,
    setShowClaimedModal,
    handleClaimRequest,
  };
}
