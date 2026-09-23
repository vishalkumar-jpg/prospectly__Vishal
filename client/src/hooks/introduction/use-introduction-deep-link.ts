import { useEffect, useRef } from "react";
import type { DeepLinkAction } from "@/constants/introduction-messages";
import { api } from "@/lib/api";
import type { IntroductionEmailLinkParams } from "@/types/introduction-deep-link";
import { useToast } from "@/hooks/use-toast";
import {
  getDeepLinkNotFoundToast,
  getDeepLinkStatusToast,
  type DeepLinkNotFoundContext,
} from "./deep-link-status-toasts";
import {
  deepLinkMatchesAction,
  getActionableDeepLinkStatus,
} from "./deep-link.utils";

type UseIntroductionDeepLinkOptions<T> = {
  emailLinkParams: IntroductionEmailLinkParams | null;
  isLoading: boolean;
  action: DeepLinkAction;
  enabled?: boolean;
  items: T[];
  findItem: (requestId: string) => T | undefined;
  canOpen?: (item: T) => boolean;
  isReadyForOpen?: (item: T) => boolean;
  onReady: (item: T) => void;
  onHandled?: () => void;
  notFoundContext: DeepLinkNotFoundContext;
  refetch?: () => Promise<void> | void;
};

type UseIntroductionDeepLinkLocalOptions<T> = {
  emailLinkParams: IntroductionEmailLinkParams | null;
  isLoading: boolean;
  enabled?: boolean;
  canOpen?: (item: T) => boolean;
  findItem: (requestId: string) => T | undefined;
  onReady: (item: T) => void;
  onHandled?: () => void;
  notFoundContext: DeepLinkNotFoundContext;
  showNotFoundOnMiss?: boolean;
  openOnFound?: boolean;
  items?: unknown[];
};

function canOpenItem<T>(
  item: T,
  canOpen?: (item: T) => boolean,
  isReadyForOpen?: (item: T) => boolean
): boolean {
  if (isReadyForOpen) {
    return isReadyForOpen(item);
  }
  if (canOpen) {
    return canOpen(item);
  }
  return true;
}

export function useIntroductionDeepLink<T>({
  emailLinkParams,
  isLoading,
  action,
  enabled = true,
  items,
  findItem,
  canOpen,
  isReadyForOpen,
  onReady,
  onHandled,
  notFoundContext,
  refetch,
}: UseIntroductionDeepLinkOptions<T>) {
  const { toast } = useToast();
  const handledRef = useRef<string | null>(null);
  const statusCheckRef = useRef<string | null>(null);
  const pendingOpenRef = useRef<string | null>(null);
  const refetchAttemptedRef = useRef<string | null>(null);
  const findItemRef = useRef(findItem);
  const onReadyRef = useRef(onReady);
  const refetchRef = useRef(refetch);
  const canOpenRef = useRef(canOpen);
  const isReadyForOpenRef = useRef(isReadyForOpen);

  findItemRef.current = findItem;
  onReadyRef.current = onReady;
  refetchRef.current = refetch;
  canOpenRef.current = canOpen;
  isReadyForOpenRef.current = isReadyForOpen;

  useEffect(() => {
    if (!enabled || !emailLinkParams || isLoading) {
      return;
    }
    if (!deepLinkMatchesAction(emailLinkParams, action)) {
      return;
    }
    if (handledRef.current === emailLinkParams.requestId) {
      return;
    }

    const requestId = emailLinkParams.requestId;
    const actionableStatus = getActionableDeepLinkStatus(action);

    const markHandled = () => {
      handledRef.current = requestId;
      pendingOpenRef.current = null;
      refetchAttemptedRef.current = null;
      onHandled?.();
    };

    const tryOpenReadyItem = () => {
      const item = findItemRef.current(requestId);
      if (
        item &&
        canOpenItem(item, canOpenRef.current, isReadyForOpenRef.current)
      ) {
        onReadyRef.current(item);
        markHandled();
        return true;
      }
      return false;
    };

    if (pendingOpenRef.current === requestId) {
      if (tryOpenReadyItem()) {
        return;
      }
      if (refetchRef.current && refetchAttemptedRef.current !== requestId) {
        refetchAttemptedRef.current = requestId;
        void refetchRef.current();
        return;
      }
      const notFound = getDeepLinkNotFoundToast(notFoundContext);
      toast(notFound);
      markHandled();
      return;
    }

    if (statusCheckRef.current === requestId) {
      return;
    }

    let cancelled = false;
    statusCheckRef.current = requestId;

    void (async () => {
      try {
        const { status } = await api.introductions.getDeepLinkStatus(
          requestId,
          action
        );
        if (cancelled) {
          return;
        }

        const toastConfig = getDeepLinkStatusToast(status, notFoundContext);
        if (toastConfig) {
          toast(toastConfig);
          markHandled();
          return;
        }

        if (status === actionableStatus) {
          if (tryOpenReadyItem()) {
            return;
          }
          pendingOpenRef.current = requestId;
          if (refetchRef.current && refetchAttemptedRef.current !== requestId) {
            refetchAttemptedRef.current = requestId;
            await refetchRef.current();
          }
          return;
        }

        const fallback = getDeepLinkNotFoundToast(notFoundContext);
        toast(fallback);
        markHandled();
      } catch {
        if (cancelled) {
          return;
        }
        toast(getDeepLinkNotFoundToast(notFoundContext));
        markHandled();
      } finally {
        if (!cancelled && statusCheckRef.current === requestId) {
          statusCheckRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
      if (statusCheckRef.current === requestId) {
        statusCheckRef.current = null;
      }
    };
  }, [
    emailLinkParams,
    isLoading,
    action,
    enabled,
    items,
    onHandled,
    notFoundContext,
    toast,
  ]);
}

export function useIntroductionDeepLinkLocal<T>({
  emailLinkParams,
  isLoading,
  enabled = true,
  canOpen,
  items,
  findItem,
  onReady,
  onHandled,
  notFoundContext,
  showNotFoundOnMiss = true,
  openOnFound = true,
}: UseIntroductionDeepLinkLocalOptions<T>) {
  const { toast } = useToast();
  const handledRef = useRef<string | null>(null);
  const findItemRef = useRef(findItem);
  const onReadyRef = useRef(onReady);
  const canOpenRef = useRef(canOpen);

  findItemRef.current = findItem;
  onReadyRef.current = onReady;
  canOpenRef.current = canOpen;

  useEffect(() => {
    if (!enabled || !emailLinkParams || isLoading) {
      return;
    }
    if (handledRef.current === emailLinkParams.requestId) {
      return;
    }

    const requestId = emailLinkParams.requestId;
    const item = findItemRef.current(requestId);

    if (!item) {
      if (showNotFoundOnMiss) {
        toast(getDeepLinkNotFoundToast(notFoundContext));
        handledRef.current = requestId;
        onHandled?.();
      }
      return;
    }

    if (!openOnFound) {
      return;
    }

    if (canOpenRef.current && !canOpenRef.current(item)) {
      handledRef.current = requestId;
      onHandled?.();
      return;
    }

    handledRef.current = requestId;
    onReadyRef.current(item);
    onHandled?.();
  }, [
    emailLinkParams,
    isLoading,
    enabled,
    items,
    onHandled,
    notFoundContext,
    showNotFoundOnMiss,
    openOnFound,
    toast,
  ]);
}
