import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "@/constants/recruitment-status-config";
import { Building2, MapPin, FileText, AlertCircle } from "lucide-react";
import { CandidateApplication } from "@/lib/types/recruitment";
import {
  formatRecruitmentWorkType,
  formatRecruitmentExperienceLevel,
  formatRecruitmentEmploymentType,
} from "@/utils/recruitmentDisplay";

interface ApplicationStatusHeaderProps {
  application: CandidateApplication;
  onViewDetails?: () => void;
}

export function ApplicationStatusHeader({
  application,
  onViewDetails,
}: ApplicationStatusHeaderProps) {
  const statusConfig = STATUS_CONFIG[application.status];
  const StatusIcon = statusConfig.icon;
  const isProcessingStage = application.status === "processing";
  const analysisSettled =
    application.analysisStatus === "failed" ||
    application.analysisStatus === "completed";
  const showProcessingSpinner = isProcessingStage && !analysisSettled;
  const processingFailed =
    isProcessingStage && application.analysisStatus === "failed";
  const BadgeIcon = processingFailed ? AlertCircle : StatusIcon;

  const employmentTypeLabel = formatRecruitmentEmploymentType(
    application.employmentType
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <h3 className="font-semibold text-lg text-foreground break-words">
            {application.jobTitle}
          </h3>
          <Badge
            className={cn(
              "border transition-all duration-300 font-medium cursor-default",
              statusConfig.color,
              statusConfig.hoverColor
            )}
            variant="outline"
          >
            <BadgeIcon
              className={cn(
                "h-3.5 w-3.5 mr-1",
                showProcessingSpinner && "animate-spin",
                processingFailed && "text-destructive"
              )}
            />
            {statusConfig.label}
          </Badge>
        </div>
        {onViewDetails && (
          <Button onClick={onViewDetails} variant="outline" size="sm">
            <FileText className="h-3.5 w-3.5 mr-1" />
            Job Details
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Building2 className="h-4 w-4" />
          {application.companyName}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          {application.location}
        </span>
        {employmentTypeLabel && (
          <Badge variant="outline" className="text-xs">
            {employmentTypeLabel}
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {formatRecruitmentWorkType(application.workType)}
        </Badge>
        {application.experienceLevel && (
          <Badge variant="outline" className="text-xs">
            {formatRecruitmentExperienceLevel(application.experienceLevel)}
          </Badge>
        )}
      </div>
    </>
  );
}
