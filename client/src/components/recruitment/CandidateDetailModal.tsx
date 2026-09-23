import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { isHttpOrHttpsUrl, isPdfFile } from "@/lib/url-utils";
import { formatDateTime } from "@/utils/dateFormatter";
import { formatDurationMonths } from "@/utils/formatter";
import { redactSensitiveText } from "@/utils/redactSensitiveText";
import CandidatePipelineTracker from "@/components/recruitment/CandidatePipelineTracker";
import { CandidateGapAnalysisSummary } from "@/components/recruitment/gap-analysis/CandidateGapAnalysisSummary";
import { CandidateAssessmentAnswers } from "@/components/recruitment/assessment-answer/CandidateAssessmentAnswers";
import { CandidateRejectionDetails } from "@/components/recruitment/CandidateRejectionDetails";
import {
  resolveApplicationFallbackSignals,
  resolveGapAnalysisForApplication,
} from "@/lib/recruitment/gap-analysis-resolve";
import PaymentAuthorizationCard from "@/components/recruitment/PaymentAuthorizationCard";
import { ConnectorIdentity } from "@/components/recruitment/ConnectorIdentity";
import {
  X,
  Calendar,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Shield,
  Briefcase,
  FileText,
  ExternalLink,
  Video,
  Eye,
  Send,
  GraduationCap,
  Layers,
  Wrench,
  FolderOpen,
  Sparkles,
  Languages,
  Award,
  User,
  Users,
  Wallet,
  ClipboardList,
} from "lucide-react";
import type {
  CandidateDetailResponse,
  ResumeMetadata,
} from "@/lib/api/recruitment";
import type { KanbanCandidate } from "@/pages/recruitment/job-kanban/types";

// Stages where the requester must not see identifying candidate details yet.
const HIDDEN_DETAIL_STAGES = [
  "processing",
  "in_review",
  "not_qualified",
] as const;
type HiddenDetailStage = (typeof HIDDEN_DETAIL_STAGES)[number];

type CertificationItem =
  | string
  | {
      name?: string;
      issuer?: string | null;
      year?: number | string;
    };

type LanguageItem =
  | string
  | {
      language?: string;
      proficiency?: string;
    };

const formatLanguageLabel = (languageItem: LanguageItem): string | null => {
  if (typeof languageItem === "string") {
    const label = languageItem.trim();
    return label.length > 0 ? label : null;
  }

  if (!languageItem || typeof languageItem !== "object") {
    return null;
  }

  const language =
    typeof languageItem.language === "string"
      ? languageItem.language.trim()
      : "";
  const proficiency =
    typeof languageItem.proficiency === "string"
      ? languageItem.proficiency.trim()
      : "";

  if (!language && !proficiency) {
    return null;
  }

  return [language || "Language", proficiency].filter(Boolean).join(" · ");
};

const formatCertificationLabel = (
  certification: CertificationItem
): string | null => {
  if (typeof certification === "string") {
    const label = certification.trim();
    return label.length > 0 ? label : null;
  }

  if (!certification || typeof certification !== "object") {
    return null;
  }

  const name =
    typeof certification.name === "string" ? certification.name.trim() : "";
  const issuer =
    typeof certification.issuer === "string" ? certification.issuer.trim() : "";
  const year =
    typeof certification.year === "number" ||
    typeof certification.year === "string"
      ? String(certification.year).trim()
      : "";

  if (!name && !issuer && !year) {
    return null;
  }

  return [name || "Certification", issuer, year].filter(Boolean).join(" · ");
};

function resumeMetadataStringArray(
  meta: ResumeMetadata | null | undefined,
  key: keyof ResumeMetadata
): string[] {
  if (!meta || typeof meta !== "object") return [];
  const raw = meta[key];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground";
const CHIP_BASE =
  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-default";

interface CandidateDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: KanbanCandidate | null;
  detail: CandidateDetailResponse | undefined;
  loading: boolean;
  onReject: (candidate: KanbanCandidate) => void;
  onShortlist: (candidate: KanbanCandidate) => void;
  onScheduleInterview: (candidate: KanbanCandidate) => void;
  onResendInvite: (candidate: KanbanCandidate) => void;
  /** Opens the in-app resume preview; the presigned URL is fetched on click. */
  onPreviewResume: () => void;
  /** Opens the resume in a new tab; the presigned URL is fetched on click. */
  onOpenResume: () => void;
  /** When false, hides recruiter workflow actions (Reject / Shortlist / etc.). */
  showActions?: boolean;
  /** When false, hides Reject actions (collaborators without candidate.reject). */
  canReject?: boolean;
}

function CandidateDetailFooterActions({
  detail,
  candidate,
  onReject,
  onShortlist,
  onScheduleInterview,
  onResendInvite,
  canReject = true,
}: Pick<
  CandidateDetailModalProps,
  | "detail"
  | "candidate"
  | "onReject"
  | "onShortlist"
  | "onScheduleInterview"
  | "onResendInvite"
  | "canReject"
>) {
  if (!detail || !candidate) return null;

  const rejectButtonClass =
    "border-brand-destructive/30 bg-brand-destructive/10 text-brand-destructive transition-all hover:border-brand-destructive/50 hover:bg-brand-destructive/15 hover:text-brand-destructive";
  const primaryButtonClass =
    "bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg";

  if (detail.stage === "in_review") {
    return (
      <>
        {canReject ? (
          <Button
            variant="outline"
            className={rejectButtonClass}
            onClick={() => onReject(candidate)}
          >
            <ThumbsDown className="mr-2 h-4 w-4" /> Reject
          </Button>
        ) : null}
        <Button
          className={primaryButtonClass}
          onClick={() => onShortlist(candidate)}
        >
          <ThumbsUp className="mr-2 h-4 w-4" /> Shortlist
        </Button>
      </>
    );
  }

  if (detail.stage === "shortlisted") {
    return (
      <>
        {canReject ? (
          <Button
            variant="outline"
            className={rejectButtonClass}
            onClick={() => onReject(candidate)}
          >
            <ThumbsDown className="mr-2 h-4 w-4" /> Reject
          </Button>
        ) : null}
        <Button
          className={primaryButtonClass}
          onClick={() => onScheduleInterview(candidate)}
        >
          <Calendar className="mr-2 h-4 w-4" /> Schedule Interview
        </Button>
      </>
    );
  }

  if (detail.stage === "interview_invite_sent") {
    return (
      <>
        {canReject ? (
          <Button
            variant="outline"
            className={rejectButtonClass}
            onClick={() => onReject(candidate)}
          >
            <ThumbsDown className="mr-2 h-4 w-4" /> Reject
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="border-brand-amethyst/30 text-brand-amethyst transition-all hover:border-brand-amethyst/50 hover:bg-brand-amethyst/10"
          onClick={() => onResendInvite(candidate)}
        >
          <Send className="mr-2 h-4 w-4" /> Resend Invite
        </Button>
      </>
    );
  }

  if (detail.stage === "interview_scheduled") {
    return (
      <Button
        variant="outline"
        className="col-span-2 border-brand-amethyst/30 text-brand-amethyst transition-all hover:border-brand-amethyst/50 hover:bg-brand-amethyst/10"
        onClick={() => onScheduleInterview(candidate)}
      >
        <Calendar className="mr-2 h-4 w-4" /> Reschedule Interview
      </Button>
    );
  }

  if (detail.stage === "interview_completed") {
    return canReject ? (
      <Button
        variant="outline"
        className={rejectButtonClass}
        onClick={() => onReject(candidate)}
      >
        <ThumbsDown className="mr-2 h-4 w-4" /> Reject
      </Button>
    ) : null;
  }

  return null;
}

function CandidateDetailModalHero({
  candidate,
  detail,
  isHidden,
}: {
  candidate: KanbanCandidate | null;
  detail: CandidateDetailResponse | undefined;
  isHidden: boolean;
}) {
  return (
    <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient px-5 pb-4 pt-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
      />
      <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogClose>

      <div className="relative flex items-start gap-3 pr-10">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/20 text-base font-extrabold backdrop-blur-sm">
          {(candidate?.anonymousId ?? detail?.anonymousLabel ?? "")
            .slice(-2)
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <DialogTitle className="truncate text-lg font-extrabold leading-tight tracking-tight text-white">
              {detail?.revealedName ||
                detail?.anonymousLabel ||
                candidate?.anonymousId}
            </DialogTitle>
            {detail?.stageLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {detail.stageLabel}
              </span>
            )}
          </div>
          <DialogDescription className="sr-only">
            Detailed candidate profile, application pipeline and actions.
          </DialogDescription>

          {(detail?.resumeJobTitle ||
            detail?.currentTitle ||
            detail?.totalYearsExp != null) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-white/95">
              {(detail?.resumeJobTitle || detail?.currentTitle) && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  {detail?.resumeJobTitle || detail?.currentTitle}
                </span>
              )}
              {detail?.totalYearsExp != null && (
                <span className="rounded-full bg-white/18 px-2.5 py-0.5 text-xs font-bold">
                  {detail.totalYearsExp} Years of Experience
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/85">
            {detail && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Applied {formatDateTime(detail.createdAt)}
              </span>
            )}
            {detail?.referrer && (
              <span className="inline-flex items-center gap-1.5">
                <Avatar className="h-4 w-4">
                  {detail.referrer.avatar && (
                    <AvatarImage
                      src={detail.referrer.avatar}
                      alt={detail.referrer.name}
                    />
                  )}
                  <AvatarFallback className="bg-white/25 text-[8px] text-white">
                    {detail.referrer.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                Referred by{" "}
                <span className="font-bold text-white">
                  {detail.referrer.name}
                </span>
              </span>
            )}
            {isHidden && (
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Details hidden
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type CandidateDetailTabFlags = {
  hasPaymentTab: boolean;
  hasAssessmentTab: boolean;
  hasExperienceTab: boolean;
  hasSkillsTab: boolean;
  hasTechTab: boolean;
  hasProjectsTab: boolean;
  skillsCount: number;
  projectsCount: number;
  assessmentCount: number;
};

function CandidateDetailModalTabBar({
  triggerClass,
  countPill,
  flags,
}: {
  triggerClass: string;
  countPill: string;
  flags: CandidateDetailTabFlags;
}) {
  const {
    hasPaymentTab,
    hasAssessmentTab,
    hasExperienceTab,
    hasSkillsTab,
    hasTechTab,
    hasProjectsTab,
    skillsCount,
    projectsCount,
    assessmentCount,
  } = flags;

  return (
    <div className="shrink-0 overflow-x-auto border-b border-border bg-background px-5 sm:px-6">
      <TabsList className="flex h-auto w-max justify-start gap-1 rounded-none bg-transparent p-0">
        {hasPaymentTab && (
          <TabsTrigger value="payment" className={triggerClass}>
            <Wallet className="mr-1.5 h-3.5 w-3.5" />
            Payment
          </TabsTrigger>
        )}
        {hasAssessmentTab && (
          <TabsTrigger value="assessment" className={triggerClass}>
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            Assessment
            <span className={countPill}>{assessmentCount}</span>
          </TabsTrigger>
        )}
        <TabsTrigger value="overview" className={triggerClass}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Overview
        </TabsTrigger>
        {hasExperienceTab && (
          <TabsTrigger value="experience" className={triggerClass}>
            <Briefcase className="mr-1.5 h-3.5 w-3.5" />
            Experience
          </TabsTrigger>
        )}
        {hasSkillsTab && (
          <TabsTrigger value="skills" className={triggerClass}>
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            Skills
            <span className={countPill}>{skillsCount}</span>
          </TabsTrigger>
        )}
        {hasTechTab && (
          <TabsTrigger value="tech" className={triggerClass}>
            <Wrench className="mr-1.5 h-3.5 w-3.5" />
            Tech &amp; Tools
          </TabsTrigger>
        )}
        {hasProjectsTab && (
          <TabsTrigger value="projects" className={triggerClass}>
            <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
            Projects
            <span className={countPill}>{projectsCount}</span>
          </TabsTrigger>
        )}
      </TabsList>
    </div>
  );
}

function CandidateDetailModalContent({
  open,
  onOpenChange,
  candidate,
  detail,
  loading,
  onReject,
  onShortlist,
  onScheduleInterview,
  onResendInvite,
  onPreviewResume,
  onOpenResume,
  showActions = true,
  canReject = true,
}: CandidateDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const bodyRef = useRef<HTMLDivElement>(null);

  // Reset to the first visible tab whenever a different candidate is opened.
  // Tab order is: Payment → Assessment → Overview.
  const hasAssessmentResponses = (detail?.assessmentResponses?.length ?? 0) > 0;
  useEffect(() => {
    const firstTab = detail?.transaction
      ? "payment"
      : hasAssessmentResponses
        ? "assessment"
        : "overview";
    setActiveTab(firstTab);
  }, [candidate?.id, detail?.transaction, hasAssessmentResponses]);

  const meta = detail?.resumeMetadata;

  const languageLabels = useMemo(() => {
    const languages = Array.isArray(meta?.languages) ? meta!.languages : [];
    return languages
      .map((language) => formatLanguageLabel(language as LanguageItem))
      .filter((label): label is string => Boolean(label));
  }, [meta]);

  const certificationLabels = useMemo(() => {
    const certifications = Array.isArray(meta?.certifications)
      ? meta!.certifications
      : [];
    return certifications
      .map((certification) =>
        formatCertificationLabel(certification as CertificationItem)
      )
      .filter((label): label is string => Boolean(label));
  }, [meta]);

  const resumeToolsList = useMemo(
    () => resumeMetadataStringArray(meta, "tools"),
    [meta]
  );
  const resumeTechnologiesList = useMemo(
    () => resumeMetadataStringArray(meta, "technologies"),
    [meta]
  );
  const resumeLegacyToolsTechnologies = useMemo(
    () => resumeMetadataStringArray(meta, "toolsTechnologies"),
    [meta]
  );

  // Masked only while the stage hides details AND the server has not revealed
  // them. Early candidate-details access flips `detailsRevealed` on from
  // `in_review`; with the flag off this matches the previous stage-only logic.
  const isHidden = detail
    ? HIDDEN_DETAIL_STAGES.includes(detail.stage as HiddenDetailStage) &&
      !detail.detailsRevealed
    : false;

  const jobHistory = meta?.jobHistory ?? [];
  const education = meta?.education ?? [];
  const domainExpertise = meta?.domainExpertise ?? [];
  const projects = meta?.projects ?? [];
  const skills = detail?.skills ?? [];

  const hasSkillMatchSection = useMemo(() => {
    if (!detail) return false;
    if (detail.analysisStatus === "completed") return true;
    if (detail.analysisStatus === "failed") return true;
    if (detail.analysisStatus === "pending") return true;
    const matched = detail.matchedSkills?.filter(Boolean) ?? [];
    const missing = detail.missingSkills?.filter(Boolean) ?? [];
    return matched.length > 0 || missing.length > 0;
  }, [detail]);

  const hasExperienceTab =
    jobHistory.length > 0 ||
    education.length > 0 ||
    certificationLabels.length > 0 ||
    languageLabels.length > 0;
  const hasSkillsTab = skills.length > 0;
  const hasTechTab =
    resumeToolsList.length > 0 ||
    resumeTechnologiesList.length > 0 ||
    resumeLegacyToolsTechnologies.length > 0;
  const hasProjectsTab = projects.length > 0;
  const hasPaymentTab = !!detail?.transaction;
  const assessmentResponses = detail?.assessmentResponses ?? [];
  const hasAssessmentTab = assessmentResponses.length > 0;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };

  const triggerClass =
    "relative h-auto rounded-none border-b-2 border-transparent bg-transparent px-3.5 py-3 text-[13.5px] font-bold text-muted-foreground shadow-none transition-colors data-[state=active]:border-brand-amethyst data-[state=active]:bg-transparent data-[state=active]:text-brand-amethyst data-[state=active]:shadow-none hover:text-foreground";
  const countPill =
    "ml-1.5 rounded-full bg-muted px-1.5 py-px font-mono text-[10.5px] font-bold text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl max-sm:rounded-none"
        mobileFullscreen
        hideCloseButton
      >
        <CandidateDetailModalHero
          candidate={candidate}
          detail={detail}
          isHidden={isHidden}
        />

        {loading || !detail || !candidate ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* Pinned pipeline */}
            {detail.pipelineSteps?.length > 0 && (
              <div className="shrink-0 border-b border-border bg-background px-5 py-3 sm:px-6">
                <CandidatePipelineTracker
                  steps={detail.pipelineSteps}
                  currentStage={detail.stage}
                />
              </div>
            )}

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="flex min-h-0 flex-1 flex-col"
            >
              <CandidateDetailModalTabBar
                triggerClass={triggerClass}
                countPill={countPill}
                flags={{
                  hasPaymentTab,
                  hasAssessmentTab,
                  hasExperienceTab,
                  hasSkillsTab,
                  hasTechTab,
                  hasProjectsTab,
                  skillsCount: skills.length,
                  projectsCount: projects.length,
                  assessmentCount: assessmentResponses.length,
                }}
              />

              {/* Body */}
              <div
                ref={bodyRef}
                className="flex-1 overflow-y-auto bg-app p-5 sm:p-6"
              >
                {/* ASSESSMENT */}
                {hasAssessmentTab && (
                  <TabsContent
                    value="assessment"
                    className="mt-0 focus-visible:outline-none"
                  >
                    <CandidateAssessmentAnswers
                      responses={assessmentResponses}
                    />
                  </TabsContent>
                )}

                {/* OVERVIEW */}
                <TabsContent
                  value="overview"
                  className="mt-0 space-y-5 focus-visible:outline-none"
                >
                  {!isHidden && detail.revealedName && (
                    <div className="rounded-xl border border-brand-success/20 bg-brand-success/10 p-4 shadow-sm">
                      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-brand-success">
                        <Shield className="h-3.5 w-3.5" /> Personal Details
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Name</span>
                          <span className="font-semibold text-foreground">
                            {detail.revealedName}
                          </span>
                        </div>
                        {detail.revealedEmail && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Email</span>
                            <span className="font-medium text-foreground">
                              {detail.revealedEmail}
                            </span>
                          </div>
                        )}
                        {detail.revealedLinkedIn && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              LinkedIn
                            </span>
                            {isHttpOrHttpsUrl(detail.revealedLinkedIn) ? (
                              <a
                                href={detail.revealedLinkedIn}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 font-medium text-brand-amethyst transition-colors hover:underline"
                              >
                                View Profile{" "}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="font-medium text-muted-foreground">
                                {detail.revealedLinkedIn}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {detail.rejection ? (
                    <CandidateRejectionDetails rejection={detail.rejection} />
                  ) : null}

                  {/*
                    Connectors are only present once the candidate is hired —
                    the API withholds them beforehand so the recruiter evaluates
                    on merit. The connector-side view receives an empty list, so
                    this section simply never renders there.
                  */}
                  {!!detail.connectors?.length && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4 shadow-sm">
                      <p
                        className={cn(
                          SECTION_LABEL,
                          "mb-3 flex items-center gap-1.5"
                        )}
                      >
                        <Users className="h-3 w-3" /> Connectors
                      </p>
                      <div className="space-y-3">
                        {detail.connectors.map((connector) => (
                          <ConnectorIdentity
                            key={connector.connectorUserId}
                            name={connector.name}
                            role={connector.role}
                            avatar={connector.avatar}
                            email={connector.email}
                            jobTitle={connector.jobTitle}
                            company={connector.company}
                            linkedinUrl={connector.linkedinUrl}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {detail.aiSummary && (
                    <div className="relative overflow-hidden rounded-xl border border-brand-amethyst/15 bg-gradient-to-br from-brand-amethyst/10 to-brand-rose/5 p-4 shadow-sm">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand-amethyst">
                        <Sparkles className="h-3.5 w-3.5" /> AI Summary
                      </p>
                      <p className="relative text-sm leading-relaxed text-foreground/80">
                        {isHidden
                          ? redactSensitiveText(detail.aiSummary)
                          : detail.aiSummary}
                      </p>
                    </div>
                  )}

                  {domainExpertise.length > 0 && (
                    <div>
                      <p
                        className={cn(
                          SECTION_LABEL,
                          "mb-2.5 flex items-center gap-1.5"
                        )}
                      >
                        <Layers className="h-3 w-3" /> Domain Expertise
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {domainExpertise.map((domain, i) => (
                          <span
                            key={i}
                            className={cn(
                              CHIP_BASE,
                              "border border-brand-amethyst/20 bg-brand-amethyst/10 text-brand-amethyst hover:bg-brand-amethyst/15"
                            )}
                          >
                            {domain}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <CandidateGapAnalysisSummary
                    data={
                      detail.analysisStatus === "completed"
                        ? resolveGapAnalysisForApplication(detail.gapAnalysis)
                        : null
                    }
                    fallbackSignals={
                      detail.analysisStatus === "completed"
                        ? resolveApplicationFallbackSignals(detail)
                        : null
                    }
                    legacyMatchScore={detail.matchScore}
                    analysisStatus={detail.analysisStatus}
                    analysisNote={detail.analysisNote}
                  />

                  {/* Server decides resume visibility (interview reveal or early
                      resume access); trust detail.hasResume rather than the
                      identity-masking isHidden flag. The actual file URL is a
                      short-lived presigned link fetched on demand (resumeUrl). */}
                  {detail.hasResume && (
                    <div>
                      <p className={cn(SECTION_LABEL, "mb-2.5")}>Resume</p>
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-brand-amethyst/30">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-brand-rose">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {detail.resumeFileName || "Resume.pdf"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {detail.resumeFileName
                              ?.split(".")
                              .pop()
                              ?.toUpperCase() || "PDF"}{" "}
                            Document
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {isPdfFile(null, detail.resumeFileName) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 text-brand-amethyst hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                              onClick={onPreviewResume}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-muted-foreground hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                            onClick={onOpenResume}
                          >
                            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isHidden && detail.interview && (
                    <div className="rounded-xl border border-brand-sky/20 bg-brand-sky/10 p-4 shadow-sm">
                      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-brand-sky">
                        <Calendar className="h-3.5 w-3.5" /> Interview Details
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Scheduled
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatDateTime(detail.interview.scheduledAt)}
                          </span>
                        </div>
                        {detail.interview.meetingLink && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Meeting
                            </span>
                            {isHttpOrHttpsUrl(detail.interview.meetingLink) ? (
                              <a
                                href={detail.interview.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 font-medium text-brand-sky transition-colors hover:underline"
                              >
                                <Video className="h-3 w-3" /> Join Meeting
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 font-medium text-brand-sky">
                                <Video className="h-3 w-3" />{" "}
                                {detail.interview.meetingLink}
                              </span>
                            )}
                          </div>
                        )}
                        {detail.interview.notes && (
                          <div className="mt-2 border-t border-brand-sky/20 pt-2">
                            <p className="mb-1 text-xs text-muted-foreground">
                              Notes
                            </p>
                            <p className="text-sm text-foreground">
                              {detail.interview.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!detail.aiSummary &&
                    !hasSkillMatchSection &&
                    domainExpertise.length === 0 &&
                    (isHidden || !detail.revealedName) &&
                    (isHidden || !detail.hasResume) &&
                    (isHidden || !detail.interview) && (
                      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                        <User className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                          No overview details available yet.
                        </p>
                      </div>
                    )}
                </TabsContent>

                {/* PAYMENT */}
                {hasPaymentTab && (
                  <TabsContent
                    value="payment"
                    className="mt-0 focus-visible:outline-none"
                  >
                    <PaymentAuthorizationCard
                      transaction={detail.transaction!}
                    />
                  </TabsContent>
                )}

                {/* EXPERIENCE */}
                {hasExperienceTab && (
                  <TabsContent
                    value="experience"
                    className="mt-0 space-y-6 focus-visible:outline-none"
                  >
                    {jobHistory.length > 0 && (
                      <div>
                        <p
                          className={cn(
                            SECTION_LABEL,
                            "mb-4 flex items-center gap-1.5"
                          )}
                        >
                          <Briefcase className="h-3 w-3" /> Experience
                        </p>
                        <div className="relative">
                          <div className="absolute bottom-[20px] left-[5px] top-[20px] w-px bg-border" />
                          <div className="space-y-4">
                            {jobHistory.map((job, i) => {
                              const isCurrentJob = job.isCurrent === true;
                              return (
                                <div key={i} className="relative flex gap-4">
                                  <div className="relative z-10 mt-[5px]">
                                    <div
                                      className={cn(
                                        "h-2.5 w-2.5 rounded-full",
                                        isCurrentJob
                                          ? "bg-brand-amethyst"
                                          : "bg-muted-foreground/30"
                                      )}
                                    />
                                  </div>
                                  <div className="pb-4">
                                    <p className="text-sm font-semibold leading-tight text-foreground">
                                      {job.title}
                                    </p>
                                    <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                                      {job.company}
                                    </p>
                                    {job.startDate && (
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {job.startDate} –{" "}
                                        {job.isCurrent
                                          ? "Present"
                                          : job.endDate || ""}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {education.length > 0 && (
                      <div>
                        <p
                          className={cn(
                            SECTION_LABEL,
                            "mb-3 flex items-center gap-1.5"
                          )}
                        >
                          <GraduationCap className="h-3 w-3" /> Education
                        </p>
                        <div className="space-y-2">
                          {education.map((edu, i) => (
                            <div
                              key={i}
                              className="flex gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-brand-sky/30 hover:shadow-sm"
                            >
                              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-sky ring-2 ring-brand-sky/20" />
                              <div>
                                {[edu.degree, edu.field].some(Boolean) && (
                                  <p className="text-sm font-semibold text-foreground">
                                    {[edu.degree, edu.field]
                                      .filter(Boolean)
                                      .join(" — ")}
                                  </p>
                                )}
                                {[edu.institution, edu.year].some(Boolean) && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {edu.institution}
                                    {edu.year ? (
                                      <span className="ml-1.5 text-muted-foreground/70">
                                        · {edu.year}
                                      </span>
                                    ) : null}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {certificationLabels.length > 0 && (
                      <div>
                        <p
                          className={cn(
                            SECTION_LABEL,
                            "mb-3 flex items-center gap-1.5"
                          )}
                        >
                          <Award className="h-3 w-3" /> Certifications
                        </p>
                        <div className="space-y-2">
                          {certificationLabels.map((label, i) => (
                            <div
                              key={i}
                              className="flex gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-brand-warning/30 hover:shadow-sm"
                            >
                              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-warning ring-2 ring-brand-warning/20" />
                              <p className="text-sm font-medium text-foreground">
                                {label}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {languageLabels.length > 0 && (
                      <div>
                        <p
                          className={cn(
                            SECTION_LABEL,
                            "mb-2.5 flex items-center gap-1.5"
                          )}
                        >
                          <Languages className="h-3 w-3" /> Languages
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {languageLabels.map((label, i) => (
                            <span
                              key={i}
                              className={cn(
                                CHIP_BASE,
                                "border border-brand-sky/20 bg-brand-sky/10 text-brand-sky hover:bg-brand-sky/15"
                              )}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* SKILLS */}
                {hasSkillsTab && (
                  <TabsContent
                    value="skills"
                    className="mt-0 focus-visible:outline-none"
                  >
                    <p
                      className={cn(
                        SECTION_LABEL,
                        "mb-2.5 flex items-center gap-1.5"
                      )}
                    >
                      <Layers className="h-3 w-3" /> Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((skill, i) => (
                        <span
                          key={i}
                          className={cn(
                            CHIP_BASE,
                            "border border-border bg-card text-foreground shadow-sm hover:border-brand-amethyst/30 hover:bg-brand-amethyst/5 hover:text-brand-amethyst"
                          )}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </TabsContent>
                )}

                {/* TECH & TOOLS */}
                {hasTechTab && (
                  <TabsContent
                    value="tech"
                    className="mt-0 space-y-6 focus-visible:outline-none"
                  >
                    {resumeToolsList.length > 0 && (
                      <div>
                        <p
                          className={cn(
                            SECTION_LABEL,
                            "mb-2.5 flex items-center gap-1.5"
                          )}
                        >
                          <Wrench className="h-3 w-3" /> Tools
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {resumeToolsList.map((tool, i) => (
                            <span
                              key={i}
                              className={cn(
                                CHIP_BASE,
                                "border border-border bg-card text-foreground shadow-sm hover:bg-muted"
                              )}
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {resumeTechnologiesList.length > 0 && (
                      <div>
                        <p
                          className={cn(
                            SECTION_LABEL,
                            "mb-2.5 flex items-center gap-1.5"
                          )}
                        >
                          <Layers className="h-3 w-3" /> Technologies
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {resumeTechnologiesList.map((tech, i) => (
                            <span
                              key={i}
                              className={cn(
                                CHIP_BASE,
                                "border border-border bg-card text-foreground shadow-sm hover:bg-muted"
                              )}
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {resumeToolsList.length === 0 &&
                      resumeTechnologiesList.length === 0 &&
                      resumeLegacyToolsTechnologies.length > 0 && (
                        <div>
                          <p
                            className={cn(
                              SECTION_LABEL,
                              "mb-2.5 flex items-center gap-1.5"
                            )}
                          >
                            <Wrench className="h-3 w-3" /> Tools &amp;
                            Technologies
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {resumeLegacyToolsTechnologies.map((item, i) => (
                              <span
                                key={i}
                                className={cn(
                                  CHIP_BASE,
                                  "border border-border bg-card text-foreground shadow-sm hover:bg-muted"
                                )}
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </TabsContent>
                )}

                {/* PROJECTS */}
                {hasProjectsTab && (
                  <TabsContent
                    value="projects"
                    className="mt-0 focus-visible:outline-none"
                  >
                    <p
                      className={cn(
                        SECTION_LABEL,
                        "mb-3 flex items-center gap-1.5"
                      )}
                    >
                      <FolderOpen className="h-3 w-3" /> Projects
                    </p>
                    <div className="space-y-3">
                      {projects.map((project, i) => (
                        <div
                          key={i}
                          className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-brand-amethyst/30 hover:shadow-sm"
                        >
                          <div className="mb-1.5 flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-brand-amethyst">
                              {project.name}
                            </p>
                            {project.durationMonths && (
                              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {formatDurationMonths(project.durationMonths)}
                              </span>
                            )}
                          </div>
                          {project.role && (
                            <p className="mb-1.5 text-xs font-semibold text-brand-amethyst">
                              {project.role}
                            </p>
                          )}
                          {project.description && (
                            <p className="mb-2.5 text-xs leading-relaxed text-muted-foreground">
                              {project.description}
                            </p>
                          )}
                          {project.skillsUsed && (
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(project.skillsUsed)
                                ? project.skillsUsed
                                : project.skillsUsed.split(/,\s*/)
                              ).map((s, j) => (
                                <span
                                  key={j}
                                  className="rounded-full border border-brand-amethyst/20 bg-brand-amethyst/10 px-2 py-0.5 text-[10px] font-medium text-brand-amethyst"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </div>
            </Tabs>

            {showActions ? (
              <div className="shrink-0 border-t border-border bg-background px-5 py-4 sm:px-6">
                <div className="grid grid-cols-2 gap-3">
                  <CandidateDetailFooterActions
                    detail={detail}
                    candidate={candidate}
                    onReject={onReject}
                    onShortlist={onShortlist}
                    onScheduleInterview={onScheduleInterview}
                    onResendInvite={onResendInvite}
                    canReject={canReject}
                  />
                </div>
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CandidateDetailModal(props: CandidateDetailModalProps) {
  return <CandidateDetailModalContent {...props} />;
}
