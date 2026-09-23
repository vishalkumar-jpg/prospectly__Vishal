import { useEffect } from "react";
import { api } from "@/lib/api";
import type { PublicRequestData } from "@/lib/api/marketplace";

export function usePublicRequestTracking(params: {
  requestId: string | undefined;
  sharerCode: string | undefined;
  requestData: PublicRequestData | null;
}) {
  const { requestId, sharerCode, requestData } = params;

  useEffect(() => {
    if (!requestId || !sharerCode || !requestData) return;

    api.marketplace
      .trackEvent(requestId, sharerCode, { eventType: "view" })
      .catch(() => {
        // Silent fail for tracking
      });
  }, [requestId, sharerCode, requestData?.id]);
}
