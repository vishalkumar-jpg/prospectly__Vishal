import type { Dispute } from "@/types/dispute";
import { DisputeDetailsOverview } from "./DisputeDetailsOverview";
import { DisputeDetailsSections } from "./DisputeDetailsSections";

interface DisputeDetailsContentProps {
  dispute: Dispute;
}

export function DisputeDetailsContent({ dispute }: DisputeDetailsContentProps) {
  return (
    <div className="space-y-4">
      <DisputeDetailsOverview dispute={dispute} />
      <DisputeDetailsSections dispute={dispute} />
    </div>
  );
}
