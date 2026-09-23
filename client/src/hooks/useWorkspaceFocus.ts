import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGettingStartedProgressQueryKey,
  useGettingStartedProgress,
} from "@/hooks/useGettingStartedProgress";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { APP_MODULES, hasModuleAccess } from "@/lib/modules";
import {
  isPreferredWorkspace,
  isPrimaryWorkspace,
  primaryFromPreferred,
  resolvePrimaryWorkspace,
  type PreferredWorkspace,
  type PrimaryWorkspace,
} from "@/lib/workspace-focus";
import type { GettingStartedProgress } from "@/lib/api/getting-started";

export function useWorkspaceFocus() {
  const { user, updateUserConfiguration, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: progress } = useGettingStartedProgress();

  const canAccessRecruiting = hasModuleAccess(
    user?.accessibleModules,
    APP_MODULES.RECRUITING
  );

  const storedPreferred = useMemo((): PreferredWorkspace | null => {
    const fromProgress = progress?.preferredWorkspace;
    if (isPreferredWorkspace(fromProgress)) return fromProgress;
    const fromConfig = user?.userConfiguration?.preferredWorkspace;
    if (isPreferredWorkspace(fromConfig)) return fromConfig;
    return null;
  }, [
    progress?.preferredWorkspace,
    user?.userConfiguration?.preferredWorkspace,
  ]);

  const storedPrimary = useMemo((): PrimaryWorkspace | null => {
    const fromProgress = progress?.primaryWorkspace;
    if (isPrimaryWorkspace(fromProgress)) return fromProgress;
    const fromConfig = user?.userConfiguration?.primaryWorkspace;
    if (isPrimaryWorkspace(fromConfig)) return fromConfig;
    return null;
  }, [progress?.primaryWorkspace, user?.userConfiguration?.primaryWorkspace]);

  const preferredWorkspace = storedPreferred ?? "recruiting";

  const focus = resolvePrimaryWorkspace({
    storedPrimary,
    canAccessRecruiting,
  });

  const showFocusSwitcher = canAccessRecruiting;

  const applyOptimistic = useCallback(
    (patch: {
      preferredWorkspace?: PreferredWorkspace;
      primaryWorkspace?: PrimaryWorkspace;
    }) => {
      updateUserConfiguration(patch);
      if (user?.id == null) return;
      queryClient.setQueryData(
        getGettingStartedProgressQueryKey(user.id),
        (prev: GettingStartedProgress | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...(patch.preferredWorkspace !== undefined
              ? { preferredWorkspace: patch.preferredWorkspace }
              : {}),
            ...(patch.primaryWorkspace !== undefined
              ? { primaryWorkspace: patch.primaryWorkspace }
              : {}),
            step1Complete: canAccessRecruiting ? true : prev.step1Complete,
            hasFocusStep: canAccessRecruiting,
          };
        }
      );
    },
    [canAccessRecruiting, queryClient, updateUserConfiguration, user?.id]
  );

  const { mutateAsync: persistConfig, isPending } = useMutation({
    mutationFn: (patch: {
      preferredWorkspace?: PreferredWorkspace;
      primaryWorkspace?: PrimaryWorkspace;
    }) => api.profiles.updateConfiguration(patch),
    onError: () => {
      toast({
        title: "Couldn’t save preference",
        description: "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: async () => {
      if (user?.id != null) {
        await queryClient.invalidateQueries({
          queryKey: getGettingStartedProgressQueryKey(user.id),
        });
      }
      await refreshUser();
    },
  });

  const setPreferredAndPrimary = useCallback(
    async (
      nextPreferred: PreferredWorkspace,
      bothPrimary: PrimaryWorkspace = "recruiting"
    ) => {
      if (!canAccessRecruiting && nextPreferred !== "prospecting") return;
      const nextPrimary = canAccessRecruiting
        ? primaryFromPreferred(nextPreferred, bothPrimary)
        : "prospecting";
      const patch = {
        preferredWorkspace: nextPreferred,
        primaryWorkspace: nextPrimary,
      };
      applyOptimistic(patch);
      try {
        await persistConfig(patch);
      } catch {
        // onError toast + onSettled handle rollback; swallow for void callers.
      }
    },
    [applyOptimistic, canAccessRecruiting, persistConfig]
  );

  const setFocus = useCallback(
    async (next: PrimaryWorkspace) => {
      if (!canAccessRecruiting && next !== "prospecting") return;
      // DB requires preferred = both OR preferred = primary. Switching the
      // header focus away from a single preferred promotes preferred to both.
      const patch =
        storedPreferred != null &&
        storedPreferred !== "both" &&
        storedPreferred !== next
          ? { preferredWorkspace: "both" as const, primaryWorkspace: next }
          : { primaryWorkspace: next };
      applyOptimistic(patch);
      await persistConfig(patch);
    },
    [applyOptimistic, canAccessRecruiting, persistConfig, storedPreferred]
  );

  return {
    preferredWorkspace,
    storedPreferred,
    focus,
    storedPrimary,
    canAccessRecruiting,
    showFocusSwitcher,
    hasFocusStep: canAccessRecruiting,
    setPreferredAndPrimary,
    setFocus,
    isPending,
  };
}
