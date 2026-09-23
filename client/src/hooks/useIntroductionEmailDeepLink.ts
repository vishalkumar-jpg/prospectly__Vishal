import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type {
  IntroductionEmailLinkAction,
  IntroductionEmailLinkParams,
} from "@/types/introduction-deep-link";

function parseAction(value: string | null): IntroductionEmailLinkAction | null {
  if (
    value === "acknowledge" ||
    value === "feedback" ||
    value === "review" ||
    value === "republish" ||
    value === "marketplace"
  ) {
    return value;
  }
  return null;
}

export function useIntroductionEmailLinkParams() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const handledRef = useRef(false);
  const [emailLinkParams, setEmailLinkParams] =
    useState<IntroductionEmailLinkParams | null>(null);

  useEffect(() => {
    if (handledRef.current || !user?.id) {
      return;
    }

    const requestId = searchParams.get("request");
    if (!requestId || !requestId.trim()) {
      return;
    }

    handledRef.current = true;
    const action = parseAction(searchParams.get("action"));
    setSearchParams({}, { replace: true });
    setEmailLinkParams({ requestId, action });
  }, [user?.id, searchParams, setSearchParams]);

  const clearEmailLinkParams = () => setEmailLinkParams(null);

  return { emailLinkParams, clearEmailLinkParams };
}
