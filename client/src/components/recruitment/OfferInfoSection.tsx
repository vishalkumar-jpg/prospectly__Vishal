import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Gift, Timer, Eye } from "lucide-react";
import { utcDayjs } from "@/lib/dayjs";
import { CandidateApplication } from "@/lib/types/recruitment";

interface OfferInfoSectionProps {
  application: CandidateApplication;
  offerExpiryDays: number | null;
  onViewOffer?: () => void;
}

export function OfferInfoSection({
  application,
  offerExpiryDays,
  onViewOffer,
}: OfferInfoSectionProps) {
  if (application.status !== "offer_received" || !application.offerDetails) {
    return null;
  }

  return (
    <div className="bg-brand-success/10 border border-brand-success/30 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-brand-success" />
          <span className="font-semibold text-brand-success">
            Offer Details
          </span>
        </div>
        {offerExpiryDays !== null && (
          <Badge
            className={cn(
              "text-xs",
              offerExpiryDays <= 3
                ? "bg-brand-destructive/15 text-brand-destructive border-brand-destructive/30"
                : offerExpiryDays <= 7
                  ? "bg-brand-warning/15 text-brand-warning border-brand-warning/30"
                  : "bg-brand-success/15 text-brand-success border-brand-success/30"
            )}
          >
            <Timer className="h-3 w-3 mr-1" />
            {offerExpiryDays > 0
              ? `${offerExpiryDays} days to respond`
              : "Expired"}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-muted-foreground">Salary:</span>
          <span className="ml-2 font-semibold text-brand-success">
            ${application.offerDetails.salary.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Start Date:</span>
          <span className="ml-2 font-medium">
            {utcDayjs(application.offerDetails.startDate).local().format("L")}
          </span>
        </div>
      </div>

      {onViewOffer && (
        <Button
          size="sm"
          className="w-full bg-brand-gradient text-brand-foreground font-semibold shadow-brand-cta transition-all hover:shadow-brand-cta-lg hover:-translate-y-0.5"
          onClick={onViewOffer}
        >
          <Eye className="h-4 w-4 mr-2" />
          View & Respond to Offer
        </Button>
      )}
    </div>
  );
}
