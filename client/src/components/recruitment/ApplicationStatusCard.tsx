import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { utcDayjs } from "@/lib/dayjs";
import { htmlToPlainText } from "@/lib/rich-text";
import { CandidateEvaluationSection } from "./CandidateEvaluationSection";
import { EvaluationNotice } from "./EvaluationNotice";
import { ApplicationTimeline } from "./ApplicationTimeline";
import { ApplicationStatusHeader } from "./ApplicationStatusHeader";
import { InterviewInfoSection } from "./InterviewInfoSection";
import { OfferInfoSection } from "./OfferInfoSection";
import { Timer, AlertCircle, PartyPopper, BadgeDollarSign } from "lucide-react";
import { formatDate, formatDateTime } from "@/utils/dateFormatter";
import {
  formatCurrency,
  formatSalaryPeriod,
  formatSalaryRange,
  isValidSalaryRange,
} from "@/utils/formatter";
import { CandidateApplication } from "@/lib/types/recruitment";

interface ApplicationStatusCardProps {
  application: CandidateApplication;
  onBookInterview?: () => void;
  onViewOffer?: () => void;
  onViewDetails?: () => void;
  onViewBonus?: () => void;
}

export function ApplicationStatusCard({
  application,
  onViewOffer,
  onViewDetails,
  onViewBonus,
}: ApplicationStatusCardProps) {
  // Calculate days remaining for 30-day SLA timer
  const getDaysRemaining = () => {
    if (!application.slaStartedAt) return null;
    const startDate = utcDayjs(application.slaStartedAt);
    const endDate = startDate.add(30, "day");
    const now = utcDayjs();
    const daysRemaining = endDate.diff(now, "day");
    return daysRemaining;
  };

  const daysRemaining = getDaysRemaining();
  const hasValidSalary = isValidSalaryRange(
    application.salaryRange.min,
    application.salaryRange.max
  );
  const showTimer =
    daysRemaining !== null &&
    !["offer_accepted", "rejected", "jd_mismatched"].includes(
      application.status
    );

  // Calculate offer expiry
  const getOfferExpiryDays = () => {
    if (!application.offerDetails?.expiresAt) return null;
    const expiryDate = utcDayjs(application.offerDetails.expiresAt);
    const now = utcDayjs();
    const daysUntilExpiry = expiryDate.diff(now, "day");
    return daysUntilExpiry;
  };

  const offerExpiryDays = getOfferExpiryDays();

  return (
    <Card
      className={cn(
        "rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand-card",
        application.status === "offer_accepted" &&
          "border-l-4 border-l-brand-success bg-brand-success/5",
        application.status === "offer_received" &&
          "border-l-4 border-l-brand-warning bg-brand-warning/5",
        application.status === "rejected" &&
          "border-l-4 border-l-border opacity-75",
        application.status === "jd_mismatched" &&
          "border-l-4 border-l-brand-warning/40 opacity-75"
      )}
    >
      <CardContent className="p-5">
        <div className="relative flex flex-col lg:flex-row lg:items-start gap-4 min-h-0">
          {/* Left side - Job Info */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0 self-start">
            <ApplicationStatusHeader
              application={application}
              onViewDetails={onViewDetails}
            />

            {application.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-3 overflow-hidden line-clamp-6 break-words">
                {htmlToPlainText(application.description)}
              </p>
            )}

            {/* Interview Info */}
            <InterviewInfoSection application={application} />

            {/* Offer Info */}
            <OfferInfoSection
              application={application}
              offerExpiryDays={offerExpiryDays}
              onViewOffer={onViewOffer}
            />

            {/* Offer Accepted Info */}
            {application.status === "offer_accepted" && (
              <div className="bg-brand-success/10 border border-brand-success/30 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 text-brand-success">
                  <PartyPopper className="h-5 w-5" />
                  <span className="font-semibold">
                    Congratulations! You accepted the offer!
                  </span>
                </div>
                {application.startDate && (
                  <p className="text-sm text-brand-success mt-1">
                    Start Date: {formatDate(application.startDate)}{" "}
                    {application.offerAcceptedAt &&
                      `(Accepted on ${formatDate(application.offerAcceptedAt)})`}
                  </p>
                )}
              </div>
            )}

            {/* Rejected Info */}
            {application.status === "rejected" &&
              application.rejectionReason && (
                <div className="bg-muted border border-border rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      {application.rejectionReason}
                    </span>
                  </div>
                </div>
              )}

            {/* 30-Day Timer */}
            {showTimer && (
              <div
                className={cn(
                  "flex items-center gap-2 text-xs rounded-lg px-3 py-2",
                  daysRemaining! <= 3
                    ? "text-brand-destructive bg-brand-destructive/10"
                    : daysRemaining! <= 7
                      ? "text-brand-warning bg-brand-warning/10"
                      : "text-muted-foreground bg-muted"
                )}
              >
                <Timer className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                <span>
                  {daysRemaining! > 0
                    ? `${daysRemaining} days remaining in hiring window`
                    : "Hiring window expired"}
                </span>
                {daysRemaining! <= 7 && daysRemaining! > 0 && (
                  <AlertCircle className="h-3.5 w-3.5 ml-1" />
                )}
              </div>
            )}

            <EvaluationNotice application={application} />

            <CandidateEvaluationSection application={application} />

            {/* Candidate bonus — surfaced here so job-seekers without
                recruiting/Transactions access can still see their payout. */}
            {application.bonus && (
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onViewBonus}
                  className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950"
                >
                  <BadgeDollarSign className="h-4 w-4 mr-1.5" />
                  {application.bonus.amount
                    ? `View Bonus · ${formatCurrency(
                        Number(application.bonus.amount),
                        { currency: application.bonus.currency }
                      )}`
                    : "View Bonus"}
                </Button>
              </div>
            )}
          </div>

          <ApplicationTimeline application={application} />
        </div>

        {/* Footer */}
        <Separator className="my-4" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {hasValidSalary && (
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground">Salary Range:</span>
                <span className="font-medium text-foreground">
                  {formatSalaryRange(
                    application.salaryRange.min,
                    application.salaryRange.max,
                    application.salaryCurrency ??
                      application.salaryRange.currency
                  )}
                </span>
                {application.salaryPeriod && (
                  <span className="text-muted-foreground text-xs">
                    / {formatSalaryPeriod(application.salaryPeriod)}
                  </span>
                )}
              </span>
            )}
            <span>Applied {formatDateTime(application.appliedAt)}</span>
          </div>
          <span>Last updated {formatDateTime(application.lastUpdatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default ApplicationStatusCard;
