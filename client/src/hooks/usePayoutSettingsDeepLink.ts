import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toAbsoluteAppUrl } from "@/utils/refer-candidate-return";

export const PAYOUT_SETTINGS_QUERY_PARAM = "openPayoutSettings";

function stripPayoutSettingsParam(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(PAYOUT_SETTINGS_QUERY_PARAM);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

type UsePayoutSettingsDeepLinkOptions = {
  onOpen: () => void;
};

export function usePayoutSettingsDeepLink({
  onOpen,
}: UsePayoutSettingsDeepLinkOptions) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  const returnPath = useMemo(() => {
    const cleanSearch = stripPayoutSettingsParam(location.search);
    return `${location.pathname}${cleanSearch}`;
  }, [location.pathname, location.search]);

  const connectReturnUrl = useMemo(
    () => toAbsoluteAppUrl(returnPath),
    [returnPath]
  );

  const connectRefreshUrl = connectReturnUrl;

  const clearDeepLinkParam = useCallback(() => {
    if (!searchParams.has(PAYOUT_SETTINGS_QUERY_PARAM)) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(PAYOUT_SETTINGS_QUERY_PARAM);
        return next;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get(PAYOUT_SETTINGS_QUERY_PARAM) !== "1") return;
    onOpenRef.current();
    clearDeepLinkParam();
  }, [searchParams, clearDeepLinkParam]);

  const handleClose = useCallback(() => {
    clearDeepLinkParam();
  }, [clearDeepLinkParam]);

  const handleSuccess = useCallback(() => {
    clearDeepLinkParam();
    void queryClient.invalidateQueries({
      queryKey: ["/api/stripe/connect/status"],
    });
  }, [clearDeepLinkParam, queryClient]);

  return {
    connectReturnUrl,
    connectRefreshUrl,
    handleClose,
    handleSuccess,
  };
}
