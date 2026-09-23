import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  notificationPreferencesApi,
  type SaveNotificationPreferencesBody,
} from "@/lib/api/notification-preferences";

export const notificationPreferencesKeys = {
  me: ["notification-preferences", "me"] as const,
  public: (tokenKey: string) =>
    ["notification-preferences", "public", tokenKey] as const,
};

export function useNotificationPreferencesMe() {
  return useQuery({
    queryKey: notificationPreferencesKeys.me,
    queryFn: () => notificationPreferencesApi.getMine(),
  });
}

export function useSaveNotificationPreferencesMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveNotificationPreferencesBody) =>
      notificationPreferencesApi.saveMine(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationPreferencesKeys.me,
      });
    },
  });
}

export function useNotificationPreferencesPublic(params: {
  u?: string;
  e?: string;
  sig?: string;
  enabled?: boolean;
}) {
  const tokenKey = `${params.u ?? ""}:${params.e ?? ""}:${params.sig ?? ""}`;
  return useQuery({
    queryKey: notificationPreferencesKeys.public(tokenKey),
    queryFn: () => notificationPreferencesApi.getPublic(params),
    enabled: Boolean(params.sig && (params.u || params.e)),
  });
}

export function useSaveNotificationPreferencesPublic() {
  return useMutation({
    mutationFn: notificationPreferencesApi.savePublic,
  });
}
