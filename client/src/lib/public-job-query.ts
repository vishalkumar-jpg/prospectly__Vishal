export function getPublicJobQueryKey(
  jobId: string | undefined,
  ref?: string | null,
  includeClosed?: boolean
) {
  const normalizedRef = ref || undefined;
  return [
    "/api/recruitment/jobs/public",
    jobId,
    normalizedRef,
    includeClosed,
  ] as const;
}
