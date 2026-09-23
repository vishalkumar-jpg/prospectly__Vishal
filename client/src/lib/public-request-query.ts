export function getPublicRequestQueryKey(
  requestId: string | undefined,
  sharerCode: string | undefined
) {
  return ["/api/marketplace/request", requestId, sharerCode] as const;
}
