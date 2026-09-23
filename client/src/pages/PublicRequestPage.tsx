import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePublicRequest } from "@/hooks/usePublicRequest";
import { usePublicRequestTracking } from "@/hooks/usePublicRequestTracking";
import { usePublicRequestClaim } from "@/hooks/usePublicRequestClaim";
import { toPublicDealData } from "@/lib/public-request-mapper";
import {
  PublicRequestLoading,
  PublicRequestNotFound,
  PublicRequestView,
} from "./public-deal";

const REQUEST_NOT_FOUND_MESSAGE =
  "This introduction opportunity is not available or the link has expired.";

export default function PublicRequestPage() {
  const { requestId, sharerCode } = useParams();
  const navigate = useNavigate();
  const {
    request: requestData,
    loading,
    error,
  } = usePublicRequest(requestId, sharerCode);

  const request = useMemo(
    () => (requestData ? toPublicDealData(requestData) : null),
    [requestData]
  );

  const invalidLink = !requestId || !sharerCode;

  usePublicRequestTracking({ requestId, sharerCode, requestData });

  const {
    claiming,
    showClaimedModal,
    setShowClaimedModal,
    handleClaimRequest,
  } = usePublicRequestClaim({ request, requestId, sharerCode, navigate });

  if (invalidLink) {
    return (
      <PublicRequestNotFound
        message="Invalid introduction opportunity link"
        onGoHome={() => navigate("/")}
      />
    );
  }

  if (loading) return <PublicRequestLoading />;

  if (error || !request) {
    return (
      <PublicRequestNotFound
        message={REQUEST_NOT_FOUND_MESSAGE}
        onGoHome={() => navigate("/")}
      />
    );
  }

  return (
    <PublicRequestView
      request={request}
      requestId={requestId}
      sharerCode={sharerCode}
      claiming={claiming}
      showClaimedModal={showClaimedModal}
      onClaimedModalChange={setShowClaimedModal}
      onClaim={handleClaimRequest}
    />
  );
}
