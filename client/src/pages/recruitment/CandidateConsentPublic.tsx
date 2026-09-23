import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Briefcase,
  Building,
  MapPin,
  CheckCircle,
  XCircle,
  Shield,
  User,
  Clock,
  AlertTriangle,
  Calendar,
  Banknote,
  DollarSign,
  Trophy,
  Sparkles,
  Info,
  ClipboardCheck,
  ListChecks,
  Gift,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useVerifyConsent, useDeclineConsent } from "@/hooks/useConsent";
import { formatDateTime } from "@/utils/dateFormatter";
import {
  formatSalaryPeriod,
  formatCompactSalaryRange,
  isValidSalaryRange,
} from "@/utils/formatter";
import {
  formatRecruitmentExperienceLevel,
  formatRecruitmentEmploymentType,
} from "@/utils/recruitmentDisplay";
import { cn } from "@/lib/utils";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

const sectionIconWrapClassName = "bg-secondary text-muted-foreground";

function buildHowToApplySteps(companyName: string) {
  return [
    {
      title: "Show your interest.",
      description: `Tap "I'm Interested" to let ${companyName} know you'd like to apply for this role.`,
    },
    {
      title: "Create your account.",
      description:
        "Sign up in a few seconds so we can save your details and move you forward.",
    },
    {
      title: "Submit your application.",
      description:
        "Right after sign-up you'll be prompted to submit your application — and you're done.",
    },
  ] as const;
}

function renderHowToApply(companyName: string) {
  const steps = buildHowToApplySteps(companyName);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
      <div className="mb-5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-rose">
        <ClipboardCheck className="h-4 w-4 shrink-0" />
        How to Apply
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {steps.map((step, i) => (
          <div key={step.title} className="flex min-w-0 items-start gap-3">
            <div className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-brand-gradient text-[13px] font-bold text-white shadow-[0_3px_8px_rgba(184,31,142,0.3)]">
              {i + 1}
            </div>
            <p className="min-w-0 text-sm leading-snug text-muted-foreground">
              <span className="font-bold text-foreground">{step.title}</span>{" "}
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildConsentSidebarDetails({
  job,
  hasValidSalary,
  salaryMin,
  salaryMax,
}: {
  job: NonNullable<
    NonNullable<ReturnType<typeof useVerifyConsent>["data"]>["job"]
  >;
  hasValidSalary: boolean;
  salaryMin: number;
  salaryMax: number;
}) {
  return [
    ...(hasValidSalary
      ? [
          {
            label: "Salary Range",
            icon: Banknote,
            value: (
              <>
                {formatCompactSalaryRange(
                  salaryMin,
                  salaryMax,
                  job.salaryCurrency
                )}
                {job.salaryPeriod && (
                  <span className="ml-1 text-xs font-normal capitalize text-muted-foreground">
                    / {formatSalaryPeriod(job.salaryPeriod)}
                  </span>
                )}
              </>
            ),
          },
        ]
      : []),
    {
      label: "Department",
      icon: Briefcase,
      value: job.departmentName || "General",
    },
    {
      label: "Industry",
      icon: Building,
      value: job.industryName || "General",
    },
    {
      label: "Posted",
      icon: Calendar,
      value: formatDateTime(job.createdAt),
    },
  ];
}

function renderConsentSidebarDetails(
  details: ReturnType<typeof buildConsentSidebarDetails>
) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {details.map((detail, i) => (
        <div
          key={detail.label}
          className={cn(
            "flex items-start gap-3.5 px-5 py-4",
            i < details.length - 1 && "border-b border-border"
          )}
        >
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-brand-rose/10 text-brand-rose">
            <detail.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {detail.label}
            </div>
            <div className="text-sm font-semibold leading-snug text-foreground">
              {detail.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type ConsentActionSidebarProps = {
  isClosed: boolean;
  connectorName: string;
  companyName: string;
  onInterested: () => void;
  onDecline: () => void;
  showActionButtons?: boolean;
  className?: string;
};

function renderConsentActionCard({
  isClosed,
  connectorName,
  companyName,
  onInterested,
  onDecline,
  showActionButtons = true,
}: Omit<ConsentActionSidebarProps, "className">) {
  if (isClosed) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-red-600">
          <XCircle className="h-6 w-6" />
        </div>
        <h3 className="mb-2 text-lg font-extrabold">Position Closed</h3>
        <p className="text-sm text-muted-foreground">
          This job is no longer accepting applications. Thank you for your
          interest.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-brand-hero-gradient shadow-brand-card">
      <div className="px-5 pb-5 pt-5 text-white">
        <h3 className="mb-2 text-lg font-extrabold">
          Interested in this opportunity?
        </h3>
        <p className="text-sm leading-snug text-white/85">
          By accepting, you give {connectorName} permission to share your
          profile with {companyName}.
        </p>
      </div>
      {showActionButtons && (
        <div className="flex flex-col gap-2.5 px-5 pb-5">
          <Button
            size="lg"
            onClick={onInterested}
            className="w-full gap-2 bg-white font-bold text-brand-amethyst shadow-sm hover:bg-white/90"
          >
            <CheckCircle className="h-5 w-5" />
            Yes, I&apos;m Interested
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onDecline}
            className="w-full border-white/50 bg-transparent text-white hover:bg-white/10"
          >
            <XCircle className="mr-2 h-5 w-5" />
            No Thanks
          </Button>
        </div>
      )}
    </div>
  );
}

type ConsentSidebarProps = {
  isClosed: boolean;
  connectorName: string;
  companyName: string;
  sidebarDetails: ReturnType<typeof buildConsentSidebarDetails>;
  onInterested: () => void;
  onDecline: () => void;
  showActionButtons?: boolean;
  className?: string;
};

function renderConsentSidebar({
  isClosed,
  connectorName,
  companyName,
  sidebarDetails,
  onInterested,
  onDecline,
  showActionButtons = true,
  className,
}: ConsentSidebarProps) {
  return (
    <aside className={cn("flex min-w-0 flex-col gap-4", className)}>
      {renderConsentActionCard({
        isClosed,
        connectorName,
        companyName,
        onInterested,
        onDecline,
        showActionButtons,
      })}
      {!isClosed && (
        <>
          {renderReferredByCard(connectorName)}
          {renderConsentSidebarDetails(sidebarDetails)}
        </>
      )}
      <div className="text-center text-sm text-muted-foreground">
        Powered by{" "}
        <span className="font-semibold text-brand-amethyst">Prospectly</span>
      </div>
    </aside>
  );
}

function renderReferredByCard(connectorName: string) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        <User className="h-3.5 w-3.5 text-brand-amethyst" />
        Referred by
      </div>
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-brand-amethyst/10 text-brand-amethyst">
          <User className="h-6 w-6" />
        </div>
        <div>
          <p className="font-bold">{connectorName}</p>
          <div className="flex items-center gap-1 text-sm text-brand-amethyst">
            <Shield className="h-3 w-3" />
            <span>Verified Connector</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {connectorName} believes you&apos;d be a great fit for this role and has
        reached out on your behalf.
      </p>
    </div>
  );
}

const DECLINE_REASONS = [
  { value: "not_interested", label: "Not interested in this role" },
  { value: "bad_timing", label: "Bad timing - not looking to move right now" },
  { value: "salary", label: "Salary expectations don't match" },
  { value: "location", label: "Location/work arrangement doesn't work" },
  { value: "company", label: "Not interested in this company" },
  {
    value: "dont_know_connector",
    label: "I don't know this connector",
  },
  { value: "other", label: "Other reason" },
];

type ConsentView = "details" | "accept" | "decline" | "decline_success";

function getConsentWorkTypeLabel(workType: string): string {
  if (workType === "remote") return "Remote";
  if (workType === "hybrid") return "Hybrid";
  return "On-site";
}

function renderConsentEarlyExit({
  isLoading,
  consentData,
  view,
}: {
  isLoading: boolean;
  consentData: ReturnType<typeof useVerifyConsent>["data"];
  view: ConsentView;
}): React.ReactNode | null {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary">
        <div className="border-b border-border bg-background px-4 py-4 sm:px-8">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="container mx-auto max-w-[1180px] px-4 py-8 lg:px-6">
          <Skeleton className="mb-2 h-10 w-2/3" />
          <Skeleton className="mb-6 h-5 w-1/3" />
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex flex-1 flex-col gap-4">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
            <div className="hidden w-[340px] flex-col gap-4 lg:flex">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-56 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!consentData || consentData.status === "invalid") {
    return (
      <StatusScreen
        icon={AlertTriangle}
        tint="bg-red-100 text-red-600"
        title="Invalid Link"
        message="This consent link is invalid or has been tampered with."
      />
    );
  }

  if (consentData.status === "expired") {
    return (
      <StatusScreen
        icon={Clock}
        tint="bg-amber-100 text-amber-600"
        title="Link Expired"
        message="This consent link has expired. Please ask the connector to send a new one."
      />
    );
  }

  if (consentData.status === "declined") {
    return (
      <StatusScreen
        icon={XCircle}
        tint="bg-slate-100 text-slate-500"
        title="Already Declined"
        message="You have already declined this opportunity. This decision is permanent."
      />
    );
  }

  if (consentData.status === "accepted") {
    return (
      <StatusScreen
        icon={CheckCircle}
        tint="bg-emerald-100 text-emerald-600"
        title="Already Accepted"
        message="You have already accepted this opportunity. Check your applications for updates."
      />
    );
  }

  if (consentData.status === "superseded") {
    return (
      <StatusScreen
        icon={Info}
        tint="bg-amber-100 text-amber-600"
        title="Already Applied via Another Connector"
        message="You already accepted a consent request from another connector for this role. This link is no longer active."
      />
    );
  }

  if (view === "decline_success") {
    return (
      <StatusScreen
        icon={CheckCircle}
        tint="bg-emerald-100 text-emerald-600"
        title="Thank You!"
        message="Your response has been recorded. Your information will not be shared. You can close this page now."
      />
    );
  }

  return null;
}

function StatusScreen({
  icon: Icon,
  tint,
  title,
  message,
}: {
  icon: typeof AlertTriangle;
  tint: string;
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <div
          className={cn(
            "mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl",
            tint
          )}
        >
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <div className="text-sm text-muted-foreground">
          Powered by{" "}
          <span className="font-semibold text-brand-amethyst">Prospectly</span>
        </div>
      </div>
    </div>
  );
}

export default function CandidateConsentPublic() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: consentData, isLoading, refetch } = useVerifyConsent(token);
  const declineMutation = useDeclineConsent();

  const [view, setView] = useState<ConsentView>("details");
  const [declineReason, setDeclineReason] = useState("");
  const [declineNotes, setDeclineNotes] = useState("");

  // Shared by the sticky top-bar CTA and the sidebar card so both stay in sync.
  const handleInterested = async () => {
    const { data: freshData } = await refetch();
    if (freshData?.jobClosed) {
      toast({
        title: "Position closed",
        description:
          "This job was closed while you were reviewing. It is no longer accepting applications.",
        variant: "destructive",
      });
      return;
    }
    setView("accept");
  };

  const goDecline = () => setView("decline");

  const handleAccept = () => {
    if (!token) return;

    const dashboardUrl = `/dashboard?consentToken=${encodeURIComponent(token)}`;

    if (user) {
      navigate(dashboardUrl);
    } else {
      // Forward the consent JWT so the OAuth signup flow can verify it
      // and allow new-user registration (no marketplace-split attribution).
      const params = new URLSearchParams();
      params.set("consentToken", token);
      params.set("returnTo", dashboardUrl);
      navigate(`/signin?${params.toString()}`);
    }
  };

  const handleDecline = async () => {
    if (!declineReason) {
      toast({
        title: "Please select a reason",
        description: "Let us know why you're declining so we can improve.",
        variant: "destructive",
      });
      return;
    }

    if (
      declineReason === "other" &&
      (!declineNotes || declineNotes.trim().length < 50)
    ) {
      toast({
        title: "More details required",
        description: "Please provide at least 50 characters for the reason.",
        variant: "destructive",
      });
      return;
    }

    if (!token) return;

    try {
      await declineMutation.mutateAsync({
        token,
        reason: declineReason,
        notes: declineNotes || undefined,
      });
      setView("decline_success");
      toast({
        title: "Response recorded",
        description:
          declineReason === "dont_know_connector"
            ? "Thanks. This connector will not be able to refer you again."
            : "Thank you for your feedback. Your information will not be shared.",
      });
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const earlyExit = renderConsentEarlyExit({ isLoading, consentData, view });
  if (earlyExit) return earlyExit;

  const job = consentData!.job!;
  const connectorName = consentData.connectorName || "A connector";
  const successFeeAmount = job.successFeeAmount
    ? Number(job.successFeeAmount)
    : 0;
  const showSuccessFee = job.hasSuccessFee === true && successFeeAmount > 0;
  const hasProbationPeriod =
    job.probationPeriodDays != null && job.probationPeriodDays > 0;
  const isClosed = consentData.jobClosed === true;

  const salaryMin = Number(job.salaryRangeMin);
  const salaryMax = Number(job.salaryRangeMax);
  const hasValidSalary = isValidSalaryRange(salaryMin, salaryMax);

  const workTypeLabel = getConsentWorkTypeLabel(job.workType);
  const employmentTypeLabel = formatRecruitmentEmploymentType(
    job.employmentType
  );

  const sections = [
    {
      id: "about",
      label: "About",
      icon: Info,
      heading: "About the Role",
      content: job.description,
    },
    {
      id: "requirements",
      label: "Requirements",
      icon: ClipboardCheck,
      heading: "Requirements",
      content: job.requirements,
    },
    {
      id: "responsibilities",
      label: "Responsibilities",
      icon: ListChecks,
      heading: "Responsibilities",
      content: job.responsibilities,
    },
    {
      id: "benefits",
      label: "Benefits",
      icon: Gift,
      heading: "Benefits",
      content: job.benefits,
    },
  ].filter((s) => s.content);

  const sidebarDetails = buildConsentSidebarDetails({
    job,
    hasValidSalary,
    salaryMin,
    salaryMax,
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-secondary pb-24 text-foreground md:pb-8">
      {/* Topbar */}
      <header className="sticky top-0 z-[60] flex h-[60px] items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-xl sm:px-8">
        <Link to="/" className="flex flex-shrink-0 items-center gap-2">
          <img
            src="/prospectly-logo.png"
            alt="Prospectly"
            className="h-8 w-auto"
          />
        </Link>
        {!isClosed && view === "details" && (
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="outline" size="sm" onClick={goDecline}>
              No Thanks
            </Button>
            <Button
              size="sm"
              onClick={handleInterested}
              className="gap-1.5 bg-brand-gradient text-white shadow-brand-cta hover:shadow-brand-cta-lg"
            >
              <CheckCircle className="h-4 w-4" />
              I&apos;m Interested
            </Button>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-6 pt-6 sm:px-7">
        {/* Job-closed banner */}
        {isClosed && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="mb-1 text-lg font-semibold text-amber-900">
                  This position has been closed
                </h2>
                <p className="text-sm text-amber-700">
                  {consentData.closedAt
                    ? `This job was closed on ${formatDateTime(consentData.closedAt)}`
                    : "This job is no longer accepting applications"}
                  {consentData.closedReason
                    ? ` — ${consentData.closedReason}`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Job header — clean, no gradient */}
        <section className="mb-6">
          <h1 className="mb-2 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-[40px]">
            {job.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted-foreground">
            <span>
              at{" "}
              <span className="font-semibold text-foreground">
                {job.companyName}
              </span>
            </span>
            {employmentTypeLabel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                {employmentTypeLabel}
              </span>
            )}
            {job.workType && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {workTypeLabel}
              </span>
            )}
            {job.experienceLevel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {formatRecruitmentExperienceLevel(job.experienceLevel)}
              </span>
            )}
          </div>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Posted on {formatDateTime(job.createdAt)}
          </p>
        </section>

        {/* Success bonus highlight — surfaced above the fold */}
        {showSuccessFee && (
          <section className="mb-6 rounded-2xl border border-border bg-card px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="flex items-center gap-3.5">
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-brand-amethyst/10 text-brand-amethyst">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    Success Bonus
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold leading-none tracking-tight text-foreground">
                      ${formatMoneyWithCommas(successFeeAmount)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      one-time, paid to you
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden h-9 w-px bg-border sm:block" />
              <p className="flex-1 text-[13px] leading-relaxed text-muted-foreground">
                {hasProbationPeriod ? (
                  <>
                    Paid after you complete the{" "}
                    <span className="font-medium text-foreground">
                      {job.probationPeriodDays}-day probation
                    </span>{" "}
                    and convert to a full-time permanent employee.
                  </>
                ) : (
                  <>
                    Paid once you&apos;re officially hired and join as a
                    full-time employee.
                  </>
                )}
              </p>
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-3 text-[12px] leading-relaxed text-muted-foreground">
              <span>Separate from your regular salary</span>
              {hasProbationPeriod && (
                <>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-rose" />
                    requires completing the full probation period
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-rose" />
                    paid after permanent employee confirmation
                  </span>
                </>
              )}
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-rose" />
                specific timing outlined in your employment contract
              </span>
            </div>
          </section>
        )}

        {/* Main layout */}
        <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {!isClosed && renderHowToApply(job.companyName)}

            {!isClosed &&
              renderConsentSidebar({
                isClosed,
                connectorName,
                companyName: job.companyName,
                sidebarDetails,
                onInterested: handleInterested,
                onDecline: goDecline,
                showActionButtons: false,
                className: "lg:hidden",
              })}

            {((job.requiredSkills?.length ?? 0) > 0 ||
              (job.preferredSkills?.length ?? 0) > 0) && (
              <section className="rounded-2xl border border-border bg-card p-6">
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <div className="mb-4 last:mb-0">
                    <div className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-rose" />
                      Required Skills
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {job.requiredSkills.map((skill: string) => (
                        <span
                          key={skill}
                          className="rounded-full border border-brand-rose/15 bg-brand-rose/10 px-3.5 py-1.5 text-xs font-bold text-brand-rose transition-colors hover:bg-brand-rose hover:text-white"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {job.preferredSkills && job.preferredSkills.length > 0 && (
                  <div>
                    <div className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-amethyst" />
                      Preferred Skills
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {job.preferredSkills.map((skill: string) => (
                        <span
                          key={skill}
                          className="rounded-full border border-brand-amethyst/15 bg-brand-amethyst/10 px-3.5 py-1.5 text-xs font-bold text-brand-amethyst transition-colors hover:bg-brand-amethyst hover:text-white"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {job.salaryRangeNotes && (
              <div className="flex items-start gap-2 rounded-2xl border border-brand-sky/15 bg-brand-sky/5 px-4 py-3">
                <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky" />
                <div className="text-sm text-foreground">
                  <span className="font-semibold">Salary note:</span>{" "}
                  {job.salaryRangeNotes}
                </div>
              </div>
            )}

            {sections.map((s) => (
              <section
                key={s.id}
                id={s.id}
                className={cn(
                  "rounded-2xl border border-border bg-card p-6 sm:p-7",
                  isClosed && "opacity-80"
                )}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={cn(
                      "grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl",
                      sectionIconWrapClassName
                    )}
                  >
                    <s.icon className="h-[18px] w-[18px]" />
                  </div>
                  <h2 className="text-lg font-extrabold tracking-tight">
                    {s.heading}
                  </h2>
                </div>
                <RichTextContent value={s.content} className="max-w-[680px]" />
              </section>
            ))}
          </div>

          {renderConsentSidebar({
            isClosed,
            connectorName,
            companyName: job.companyName,
            sidebarDetails,
            onInterested: handleInterested,
            onDecline: goDecline,
            showActionButtons: !isClosed,
            className: cn(
              "min-w-0 flex-col gap-4",
              isClosed
                ? "lg:w-[340px] lg:shrink-0"
                : "hidden lg:flex lg:w-[340px] lg:shrink-0 lg:self-start lg:sticky lg:top-[72px] lg:z-10"
            ),
          })}
        </div>
      </main>

      {/* Mobile sticky action bar */}
      {!isClosed && view === "details" && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t border-border bg-background/95 p-3 backdrop-blur-xl md:hidden">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={goDecline}
          >
            No Thanks
          </Button>
          <Button
            size="lg"
            onClick={handleInterested}
            className="flex-1 gap-1.5 bg-brand-gradient text-white shadow-brand-cta"
          >
            <CheckCircle className="h-5 w-5" />
            I'm Interested
          </Button>
        </div>
      )}

      {/* Confirm interest dialog */}
      <Dialog
        open={!isClosed && view === "accept"}
        onOpenChange={(open) => {
          if (!open) setView("details");
        }}
      >
        <DialogContent className="max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-2xl">
          <DialogHeader>
            <div className="mx-auto mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
              <CheckCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">
              Confirm Your Interest
            </DialogTitle>
            <DialogDescription className="text-center">
              {connectorName} will introduce you to {job.companyName}. Your
              anonymized profile will be shared first, and your full details
              will only be revealed once the recruiter shortlists you.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full gap-2 bg-brand-gradient text-white shadow-brand-cta transition-all hover:shadow-brand-cta-lg"
              onClick={handleAccept}
            >
              <CheckCircle className="h-5 w-5" />
              Confirm &amp; Proceed
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => setView("details")}
            >
              Go Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline dialog */}
      <Dialog
        open={!isClosed && view === "decline"}
        onOpenChange={(open) => {
          if (!open && !declineMutation.isPending) setView("details");
        }}
      >
        <DialogContent className="max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Not interested? No problem!</DialogTitle>
            <DialogDescription>
              Your information will not be shared. Please let us know why so we
              can better match opportunities in the future.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block text-sm">Reason for declining</Label>
              <RadioGroup
                value={declineReason}
                onValueChange={(value) => {
                  setDeclineReason(value);
                  setDeclineNotes("");
                }}
              >
                {DECLINE_REASONS.map((reason) => (
                  <div
                    key={reason.value}
                    className="flex items-center space-x-2 py-2"
                  >
                    <RadioGroupItem value={reason.value} id={reason.value} />
                    <Label
                      htmlFor={reason.value}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {reason.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {declineReason === "other" && (
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-semibold">
                  Additional notes
                  <span className="text-brand-destructive">*</span>{" "}
                  <span className="font-normal text-muted-foreground">
                    (Minimum 50 characters required)
                  </span>
                </Label>
                <Textarea
                  id="notes"
                  value={declineNotes}
                  onChange={(e) =>
                    setDeclineNotes(e.target.value.slice(0, 500))
                  }
                  placeholder="e.g. Position filled, budget changes, role no longer needed..."
                  className="min-h-[120px] resize-none"
                />
                <div className="flex justify-end">
                  <span className="text-xs text-muted-foreground">
                    {declineNotes.length}/500
                  </span>
                </div>
              </div>
            )}

            {declineReason === "dont_know_connector" && (
              <div className="space-y-2">
                <Label
                  htmlFor="dont-know-notes"
                  className="text-sm font-semibold"
                >
                  Additional details{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="dont-know-notes"
                  value={declineNotes}
                  onChange={(e) =>
                    setDeclineNotes(e.target.value.slice(0, 500))
                  }
                  placeholder="Tell us more if you'd like..."
                  className="min-h-[100px] resize-none"
                />
                <div className="flex justify-end">
                  <span className="text-xs text-muted-foreground">
                    {declineNotes.length}/500
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full bg-brand-gradient text-white shadow-brand-cta transition-all hover:shadow-brand-cta-lg"
              onClick={handleDecline}
              disabled={
                declineMutation.isPending ||
                !declineReason ||
                (declineReason === "other" &&
                  (!declineNotes || declineNotes.trim().length < 50))
              }
            >
              {declineMutation.isPending ? "Submitting..." : "Submit & Close"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => setView("details")}
              disabled={declineMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-8 border-t border-border bg-card sm:mt-12">
        <div className="container mx-auto max-w-[1180px] px-4 py-6 sm:px-7 lg:py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <img
                src="/prospectly-logo.png"
                alt="Prospectly"
                className="h-6 w-auto"
              />
              <span className="text-xs font-semibold text-muted-foreground sm:text-sm">
                Recruitment made rewarding
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold sm:gap-6 sm:text-sm">
              <Link
                to="/privacy"
                className="text-muted-foreground transition-colors hover:text-brand-amethyst"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-muted-foreground transition-colors hover:text-brand-amethyst"
              >
                Terms
              </Link>
              <a
                href="mailto:support@prospectly.com"
                className="text-muted-foreground transition-colors hover:text-brand-amethyst"
              >
                Help
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
