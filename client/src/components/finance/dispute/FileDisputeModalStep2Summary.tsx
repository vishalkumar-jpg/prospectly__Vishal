import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IntroductionForDispute } from "@/types/dispute";

interface FileDisputeModalStep2SummaryProps {
  selectedIntro: IntroductionForDispute;
}

export function FileDisputeModalStep2Summary({
  selectedIntro,
}: FileDisputeModalStep2SummaryProps) {
  return (
    <Card className="p-4 bg-muted/50">
      <h4 className="font-semibold mb-2">Introduction Summary</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Contact:</span>
          <span className="ml-2 font-medium">{selectedIntro.contactName}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Bounty:</span>
          <span className="ml-2 font-medium">
            {(() => {
              const bounty = Number(selectedIntro.bountyAmount);
              return isFinite(bounty) && bounty > 0
                ? `$${bounty.toLocaleString()}`
                : "—";
            })()}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Your Role:</span>
          <Badge variant="outline" className="ml-2">
            {selectedIntro.userRole}
          </Badge>
        </div>
        <div>
          <span className="text-muted-foreground">Status:</span>
          <Badge variant="outline" className="ml-2">
            {selectedIntro.paymentStatus ?? "Unknown"}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
