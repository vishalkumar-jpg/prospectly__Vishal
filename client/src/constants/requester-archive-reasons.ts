/**
 * Requester archive withdrawal reasons (value + user-facing label).
 * Keep `value` strings in sync with
 * `server/src/modules/introductions/requester-pipeline/requester-archive.constants.ts`
 * (`REQUESTER_ARCHIVE_REASONS`).
 */
export const REQUESTER_ARCHIVE_REASON_OPTIONS = [
  {
    value: "not_interested_connecting_with_prospect",
    label: "I'm not interested in connecting with this prospect.",
  },
  {
    value: "connector_or_scheduling_timeout",
    label:
      "The connector has not responded, or a meeting still is not scheduled, within 7 days.",
  },
  {
    value: "already_in_network",
    label: "I already have a relationship with this prospect in my network.",
  },
  { value: "other", label: "Other" },
] as const;

const LEGACY_REASON_VALUE_MAP: Record<string, string> = {
  connected_elsewhere: "not_interested_connecting_with_prospect",
};

export function labelRequesterArchiveReason(
  code: string | null | undefined
): string {
  if (!code) return "";
  const normalized =
    LEGACY_REASON_VALUE_MAP[code as keyof typeof LEGACY_REASON_VALUE_MAP] ??
    code;
  const row = REQUESTER_ARCHIVE_REASON_OPTIONS.find(
    (o) => o.value === normalized
  );
  if (row) return row.label;
  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
