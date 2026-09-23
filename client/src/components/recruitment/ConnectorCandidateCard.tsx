import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Building2,
  CheckCircle,
  Eye,
  Calendar,
  RefreshCw,
  Link2,
  Target,
  Shield,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { formatDateTime, formatDate } from "@/utils/dateFormatter";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

export interface ConnectorCandidate {
  id: string;
  candidateName: string;
  candidateEmail: string;
  anonymousId: string;
  avatarColor: string;
  matchScore: number;
  matchBreakdown: {
    skills: number;
    experience: number;
    salary: number;
  };
  currentTitle: string;
  currentCompany: string;
  experienceYears: number;
  skills: string[];
  expectedSalary?: number;
  noticePeriodDays?: number;
  stage:
    | "consent_pending"
    | "consent_accepted"
    | "shortlisted"
    | "interview_scheduled"
    | "interview_completed"
    | "offer_sent"
    | "offer_accepted"
    | "rejected"
    | "hired";
  stageUpdatedAt: string;
  jobTitle: string;
  jobCompany: string;
  bountyAmount: number;
  bountyPercentage: number; // 70 for direct, 50 for public
  referralType: "direct" | "public_claim";
  isRevealed: boolean; // Whether recruiter can see real name
  consentSentAt?: string;
  consentAcceptedAt?: string;
  interviewScheduledAt?: string;
  interviewCompletedAt?: string;
  offerSentAt?: string;
  offerAcceptedAt?: string;
  // 30-day SLA tracking
  slaStartedAt?: string; // When payment intent was created (interview scheduled)
  claimedViaLink?: boolean;
  claimedByName?: string;
  claimedAt?: string;
}

interface ConnectorCandidateCardProps {
  candidate: ConnectorCandidate;
  onSendConsent?: () => void;
  onResendConsent?: () => void;
  onViewDetails?: () => void;
  onSendHireConfirmation?: () => void;
}

export function ConnectorCandidateCard({
  candidate,
  onResendConsent,
  onViewDetails,
  onSendHireConfirmation,
}: ConnectorCandidateCardProps) {
  const isPublicClaim = candidate.referralType === "public_claim";

  // Calculate days remaining for 30-day SLA timer
  const getDaysRemaining = () => {
    if (!candidate.slaStartedAt && !candidate.interviewScheduledAt) return null;
    const startDate = new Date(
      candidate.slaStartedAt || candidate.interviewScheduledAt!
    );
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);
    const now = new Date();
    const daysRemaining = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysRemaining;
  };

  const daysRemaining = getDaysRemaining();
  const showTimer =
    daysRemaining !== null && !["hired", "rejected"].includes(candidate.stage);

  const getMatchColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 70) return "text-teal-600 bg-teal-50 border-teal-200";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-slate-500 bg-slate-50";
  };

  // Display name based on reveal status
  const displayName = candidate.isRevealed
    ? candidate.candidateName
    : candidate.anonymousId;

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-all duration-200",
        candidate.stage === "hired" && "bg-emerald-50/50"
      )}
    >
      <CardContent className="p-3">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Avatar className={cn("h-9 w-9", candidate.avatarColor)}>
              <AvatarFallback className={candidate.avatarColor}>
                {candidate.isRevealed
                  ? candidate.candidateName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                  : candidate.anonymousId.slice(-2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1">
                <p className="font-medium text-sm">{displayName}</p>
                {!candidate.isRevealed && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Shield className="h-3 w-3 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Identity hidden until recruiter shortlists
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-xs text-slate-500">{candidate.currentTitle}</p>
            </div>
          </div>
          <Badge
            className={cn(
              "text-xs border",
              getMatchColor(candidate.matchScore)
            )}
          >
            {candidate.matchScore}%
          </Badge>
        </div>

        {/* Job Info */}
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
          <Briefcase className="h-3 w-3" />
          <span className="">{candidate.jobTitle}</span>
          <span className="text-slate-300">•</span>
          <Building2 className="h-3 w-3" />
          <span className="">{candidate.jobCompany}</span>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1 mb-2">
          {candidate.skills.slice(0, 3).map((skill, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-slate-100"
            >
              {skill}
            </Badge>
          ))}
          {candidate.skills.length > 3 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-slate-100"
            >
              +{candidate.skills.length - 3}
            </Badge>
          )}
        </div>

        {/* Bounty & Type Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isPublicClaim
                  ? "bg-purple-50 text-purple-600 border-purple-200"
                  : "bg-teal-50 text-teal-600 border-teal-200"
              )}
            >
              {isPublicClaim ? (
                <>
                  <Link2 className="h-3 w-3 mr-1" />
                  Via Link • 50%
                </>
              ) : (
                <>
                  <Target className="h-3 w-3 mr-1" />
                  Direct • 70%
                </>
              )}
            </Badge>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "text-sm font-bold",
                candidate.stage === "hired"
                  ? "text-emerald-600"
                  : "text-slate-700"
              )}
            >
              ${formatMoneyWithCommas(candidate.bountyAmount)}
            </p>
          </div>
        </div>

        {/* Public Claim Info */}
        {isPublicClaim && candidate.claimedByName && candidate.claimedAt && (
          <div className="text-xs text-purple-600 bg-purple-50 rounded px-2 py-1 mb-2">
            Claimed by {candidate.claimedByName} on{" "}
            {formatDate(candidate.claimedAt)}
          </div>
        )}

        {/* Interview Time (if scheduled) */}
        {candidate.interviewScheduledAt && (
          <div className="flex items-center gap-1 text-xs text-cyan-600 bg-cyan-50 rounded px-2 py-1 mb-2">
            <Calendar className="h-3 w-3" />
            Interview: {formatDateTime(candidate.interviewScheduledAt)}
          </div>
        )}

        {/* 30-Day SLA Timer */}
        {showTimer && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs rounded px-2 py-1 mb-2",
              daysRemaining! <= 3
                ? "text-red-600 bg-red-50"
                : daysRemaining! <= 7
                  ? "text-amber-600 bg-amber-50"
                  : "text-slate-600 bg-slate-50"
            )}
          >
            <Timer className="h-3 w-3" />
            {daysRemaining! > 0
              ? `${daysRemaining} days remaining`
              : "SLA expired"}
            {daysRemaining! <= 7 && daysRemaining! > 0 && (
              <AlertTriangle className="h-3 w-3 ml-1" />
            )}
          </div>
        )}

        {/* Hired badge — uses stageUpdatedAt as the moved-to-hired timestamp
            (the system clock when the recruiter advanced the stage). The
            denormalized hired_at column was removed; stage_history is the
            authoritative source for past stage transitions. */}
        {candidate.stage === "hired" && (
          <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1 mb-2">
            <CheckCircle className="h-3 w-3" />
            Hired on {formatDate(candidate.stageUpdatedAt)}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-1 mt-2">
          {/* Consent Pending - Resend option */}
          {candidate.stage === "consent_pending" && !isPublicClaim && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={onResendConsent}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Resend
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={onViewDetails}
              >
                <Eye className="h-3 w-3" />
              </Button>
            </>
          )}

          {/* Consent Accepted - View only (waiting for recruiter to shortlist) */}
          {candidate.stage === "consent_accepted" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={onViewDetails}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Details
            </Button>
          )}

          {/* Shortlisted onwards - Read-only for connector (recruiter handles scheduling) */}
          {candidate.stage === "shortlisted" && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs text-slate-500"
              onClick={onViewDetails}
            >
              <Eye className="h-3 w-3 mr-1" />
              Awaiting Interview
            </Button>
          )}

          {/* Interview stages - View progress */}
          {["interview_scheduled", "interview_completed"].includes(
            candidate.stage
          ) && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs text-slate-500"
              onClick={onViewDetails}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Progress
            </Button>
          )}

          {/* Offer stages - Can send hire confirmation */}
          {["offer_sent", "offer_accepted"].includes(candidate.stage) &&
            !isPublicClaim && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={onViewDetails}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={onSendHireConfirmation}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Confirm Hire
                </Button>
              </>
            )}

          {/* Offer stages for public claims - View only */}
          {["offer_sent", "offer_accepted"].includes(candidate.stage) &&
            isPublicClaim && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-7 text-xs text-slate-500"
                onClick={onViewDetails}
              >
                <Eye className="h-3 w-3 mr-1" />
                View Only
              </Button>
            )}

          {/* Hired/Rejected - Final states */}
          {["hired", "rejected"].includes(candidate.stage) && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs text-slate-500"
              onClick={onViewDetails}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Details
            </Button>
          )}

          {/* Public claims in early stages - View only */}
          {isPublicClaim &&
            [
              "shortlisted",
              "interview_scheduled",
              "interview_completed",
            ].includes(candidate.stage) && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-7 text-xs text-slate-500"
                onClick={onViewDetails}
              >
                <Eye className="h-3 w-3 mr-1" />
                View Only
              </Button>
            )}
        </div>

        {/* Read-only indicator for public claims */}
        {isPublicClaim && (
          <div className="text-center text-[10px] text-purple-500 mt-1">
            Read-only • You'll earn referral payout when hired
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ConnectorCandidateCard;
