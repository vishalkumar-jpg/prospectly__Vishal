import { FAILURE_REASON_LABELS } from "@/components/introduction/UnfulfilledTab.types";
import { labelRequesterArchiveReason } from "@/constants/requester-archive-reasons";

export function formatRefundReason(code: string | null | undefined): string {
  if (!code) return "";
  if (FAILURE_REASON_LABELS[code]) {
    return FAILURE_REASON_LABELS[code];
  }
  return labelRequesterArchiveReason(code);
}
