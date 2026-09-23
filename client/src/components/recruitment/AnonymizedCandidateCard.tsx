import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  Clock,
  CheckCircle,
  Calendar,
  DollarSign,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Award,
  AlertCircle,
  Lock,
  Shield,
  User,
} from "lucide-react";

// Anonymized candidate profile - no personal details
export interface AnonymizedCandidate {
  id: string;
  // Anonymous identifiers
  anonymousId: string; // e.g., "Candidate #A7"
  avatarColor: string; // For visual distinction

  // Professional Info (anonymized)
  currentTitle: string;
  currentCompany: string; // Anonymized: "Company A" or "Top 4 Consulting Firm"
  experienceYears: number;

  // Skills
  skills: string[];

  // Expectations
  expectedSalary?: number;
  noticePeriodDays?: number;
  availability?: string;

  // Pipeline Stage
  stage:
    | "applied"
    | "screening"
    | "interview"
    | "offer"
    | "offer_accepted"
    | "rejected"
    | "in_review"
    | "shortlisted"
    | "interview_scheduled";
  stageUpdatedAt: string;

  // Connector Info (also anonymized to requester)
  connectorAnonymousId: string;
}

interface AnonymizedCandidateCardProps {
  candidate: AnonymizedCandidate;
  isSelected?: boolean;
  onSelect?: () => void;
  onViewDetails?: () => void;
  onShortlist?: () => void;
  onReject?: () => void;
  onScheduleInterview?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

const STAGE_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof User }
> = {
  applied: { label: "Applied", color: "bg-blue-100 text-blue-700", icon: User },
  screening: {
    label: "Screening",
    color: "bg-purple-100 text-purple-700",
    icon: Eye,
  },
  interview: {
    label: "Interview",
    color: "bg-indigo-100 text-indigo-700",
    icon: Calendar,
  },
  offer: {
    label: "Offer Extended",
    color: "bg-teal-100 text-teal-700",
    icon: Award,
  },
  offer_accepted: {
    label: "Offer Accepted",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-slate-100 text-slate-500",
    icon: AlertCircle,
  },
  in_review: {
    label: "In Review",
    color: "bg-amber-100 text-amber-700",
    icon: Eye,
  },
  shortlisted: {
    label: "Shortlisted",
    color: "bg-blue-100 text-blue-700",
    icon: ThumbsUp,
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    color: "bg-green-100 text-green-700",
    icon: Calendar,
  },
};

export function AnonymizedCandidateCard({
  candidate,
  isSelected,
  onSelect,
  onViewDetails,
  onShortlist,
  onReject,
  onScheduleInterview,
  showActions = true,
  compact = false,
}: AnonymizedCandidateCardProps) {
  const stageConfig = STAGE_CONFIG[candidate.stage] || {
    label: candidate.stage,
    color: "bg-slate-100 text-slate-500",
    icon: User,
  };
  const StageIcon = stageConfig.icon;

  if (compact) {
    return (
      <Card
        className={cn(
          "group cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-teal-500 bg-teal-50/50"
        )}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                className={cn(
                  "h-10 w-10 border-2 border-white shadow",
                  candidate.avatarColor
                )}
              >
                <AvatarFallback className={candidate.avatarColor}>
                  {candidate.anonymousId.slice(-2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{candidate.anonymousId}</p>
                <p className="text-xs text-slate-500">
                  {candidate.currentTitle}
                </p>
              </div>
            </div>
            <Badge className={cn("gap-1", stageConfig.color)}>
              <StageIcon className="h-3 w-3" />
              {stageConfig.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group transition-all duration-200 hover:shadow-lg",
        isSelected && "ring-2 ring-teal-500 bg-teal-50/50",
        candidate.stage === "offer_accepted" &&
          "border-emerald-200 bg-emerald-50/30"
      )}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <Avatar
              className={cn(
                "h-14 w-14 border-2 border-white shadow-lg",
                candidate.avatarColor
              )}
            >
              <AvatarFallback
                className={cn("text-lg font-bold", candidate.avatarColor)}
              >
                {candidate.anonymousId.slice(-2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">{candidate.anonymousId}</h3>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Shield className="h-3 w-3" />
                  <span>Anonymized</span>
                </div>
              </div>
              <p className="text-sm text-slate-600">{candidate.currentTitle}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <Building2 className="h-3 w-3" />
                <span>{candidate.currentCompany}</span>
                <span className="text-slate-300">|</span>
                <Briefcase className="h-3 w-3" />
                <span>{candidate.experienceYears}+ years</span>
              </div>
            </div>
          </div>
          <Badge className={cn("gap-1", stageConfig.color)}>
            <StageIcon className="h-3 w-3" />
            {stageConfig.label}
          </Badge>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Key Skills</p>
          <div className="flex flex-wrap gap-1">
            {candidate.skills.slice(0, 6).map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {candidate.skills.length > 6 && (
              <Badge variant="secondary" className="text-xs">
                +{candidate.skills.length - 6} more
              </Badge>
            )}
          </div>
        </div>

        {/* Expectations */}
        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          {candidate.expectedSalary && (
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Expected Salary
              </p>
              <p className="font-medium">
                ${candidate.expectedSalary.toLocaleString()}
              </p>
            </div>
          )}
          {candidate.noticePeriodDays !== undefined && (
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Notice Period
              </p>
              <p className="font-medium">
                {candidate.noticePeriodDays === 0
                  ? "Immediate"
                  : `${candidate.noticePeriodDays} days`}
              </p>
            </div>
          )}
          {candidate.availability && (
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Available
              </p>
              <p className="font-medium">{candidate.availability}</p>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="h-3 w-3" />
            <span>Referred by {candidate.connectorAnonymousId}</span>
          </div>

          {showActions && (
            <div className="flex items-center gap-2">
              {(candidate.stage === "applied" ||
                candidate.stage === "in_review") && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReject}
                    className="border-brand-destructive/30 bg-brand-destructive/10 text-brand-destructive hover:border-brand-destructive/50 hover:bg-brand-destructive/15 hover:text-brand-destructive"
                  >
                    <ThumbsDown className="h-3 w-3 mr-1" />
                    Pass
                  </Button>
                  <Button
                    size="sm"
                    onClick={onShortlist}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <ThumbsUp className="h-3 w-3 mr-1" />
                    Shortlist
                  </Button>
                </>
              )}
              {(candidate.stage === "screening" ||
                candidate.stage === "interview" ||
                candidate.stage === "shortlisted") && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReject}
                    className="border-brand-destructive/30 bg-brand-destructive/10 text-brand-destructive hover:border-brand-destructive/50 hover:bg-brand-destructive/15 hover:text-brand-destructive"
                  >
                    <ThumbsDown className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={onScheduleInterview}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Schedule Interview
                  </Button>
                </>
              )}
              {candidate.stage === "interview_scheduled" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onScheduleInterview}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Reschedule
                </Button>
              )}
              {candidate.stage === "offer" && (
                <Button
                  size="sm"
                  onClick={onViewDetails}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Mark as Offer Accepted
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AnonymizedCandidateCard;
