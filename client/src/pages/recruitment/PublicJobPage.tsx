import { useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Briefcase,
  Building2,
  MapPin,
  Banknote,
  DollarSign,
  Users,
  Sparkles,
  ArrowRight,
  User,
  Loader2,
  AlertTriangle,
  LogIn,
  Trophy,
  Clock,
  Info,
  ClipboardCheck,
  ListChecks,
  Gift,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicJob } from "@/hooks/usePublicJob";
import SEO from "@/components/SEO";
import { buildPublicJobSeoMeta, OG_RECRUITING_IMAGE } from "@/lib/og-meta";
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

const JOB_MARKETPLACE_PATH = "/recruiting/job-marketplace";

type PublicJob = NonNullable<ReturnType<typeof usePublicJob>["job"]>;

function renderPublicJobLoading() {
  return (
    <div className="min-h-screen bg-secondary">
      <div className="border-b border-border bg-background py-4">
        <div className="container mx-auto px-4 lg:px-6">
          <Skeleton className="h-8 w-36" />
        </div>
      </div>
      <div className="container mx-auto max-w-[1180px] px-4 lg:px-6 py-8">
        <Skeleton className="mb-6 h-40 w-full rounded-2xl" />
        <Skeleton className="mb-6 h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function renderPublicJobNotFound({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  return (
    <div className="min-h-screen bg-secondary">
      <div className="border-b border-border bg-background py-4">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">Job Opportunity</span>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 lg:px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Job No Longer Available</h1>
        <p className="mx-auto mb-6 max-w-md text-muted-foreground">
          This job posting has been closed or is no longer accepting candidates.
          Browse other opportunities on our marketplace.
        </p>
        <Button
          onClick={() => navigate(JOB_MARKETPLACE_PATH)}
          className="bg-brand-gradient text-white shadow-brand-cta hover:shadow-brand-cta-lg hover:-translate-y-0.5"
        >
          Browse Jobs
        </Button>
        <div className="mt-8 text-sm text-muted-foreground">
          Powered by{" "}
          <span className="font-semibold text-brand-amethyst">Prospectly</span>
        </div>
      </div>
    </div>
  );
}

function getWorkTypeLabel({ workType }: { workType?: string | null }) {
  if (workType === "remote") return "Remote";
  if (workType === "hybrid") return "Hybrid";
  return "On-site";
}

function computePublicJobDerived({ job }: { job: PublicJob }) {
  const rawSalaryMin = Number(job.salaryRangeMin);
  const rawSalaryMax = Number(job.salaryRangeMax);
  const hasValidSalary = isValidSalaryRange(rawSalaryMin, rawSalaryMax);
  const salaryMin = hasValidSalary ? rawSalaryMin : 0;
  const salaryMax = hasValidSalary ? rawSalaryMax : 0;
  const bountyAmount = Number(job.bountyAmount);
  const rawConnectorPayout = Number(job.connectorPayout);
  const rawSharerPayout = Number(job.sharerPayout);
  const connectorEarnings = Number.isFinite(rawConnectorPayout)
    ? rawConnectorPayout
    : 0;
  const sharerEarnings = Number.isFinite(rawSharerPayout) ? rawSharerPayout : 0;
  const isClosed = job.status === "closed";
  const successFeeAmount = job.successFeeAmount
    ? Number(job.successFeeAmount)
    : 0;
  const showSuccessFee = job.hasSuccessFee === true && successFeeAmount > 0;
  const hasProbationPeriod =
    job.probationPeriodDays != null && job.probationPeriodDays > 0;

  return {
    hasValidSalary,
    salaryMin,
    salaryMax,
    bountyAmount,
    connectorEarnings,
    sharerEarnings,
    isClosed,
    successFeeAmount,
    showSuccessFee,
    hasProbationPeriod,
    workTypeLabel: getWorkTypeLabel({ workType: job.workType }),
  };
}

function buildPublicJobSections({ job }: { job: PublicJob }) {
  return [
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
}

function buildSidebarJobDetails({
  job,
  hasValidSalary,
  salaryMin,
  salaryMax,
  workTypeLabel,
}: {
  job: PublicJob;
  hasValidSalary: boolean;
  salaryMin: number;
  salaryMax: number;
  workTypeLabel: string;
}) {
  return [
    // Salary range is optional — omit the row entirely when not provided.
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
      label: "Company",
      icon: Building2,
      value: job.companyName || "—",
    },
    {
      label: "Location",
      icon: MapPin,
      value: job.location || "Not specified",
    },
    {
      label: "Work Type",
      icon: Briefcase,
      value: workTypeLabel || "—",
    },
  ];
}

const sectionIconWrapClassName = "bg-secondary text-muted-foreground";

type ReferralSidebarProps = {
  sidebarDetails: ReturnType<typeof buildSidebarJobDetails>;
  referrerCode: string | undefined;
  authLoading: boolean;
  showActionButtons: boolean;
  handleClaimAsCandidate: () => void;
  className?: string;
};

function renderReferralSidebar({
  sidebarDetails,
  referrerCode,
  authLoading,
  showActionButtons,
  handleClaimAsCandidate,
  className,
}: ReferralSidebarProps) {
  return (
    <aside className={cn("flex min-w-0 flex-col gap-4", className)}>
      {showActionButtons && referrerCode && (
        <Button
          size="lg"
          onClick={handleClaimAsCandidate}
          className="w-full gap-2 bg-brand-gradient text-white shadow-brand-cta"
          disabled={authLoading}
        >
          <User className="h-5 w-5" />
          Apply Now
        </Button>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {sidebarDetails.map((detail, i) => (
          <div
            key={detail.label}
            className={cn(
              "flex items-start gap-3.5 px-5 py-4",
              i < sidebarDetails.length - 1 && "border-b border-border"
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
    </aside>
  );
}

type PublicJobViewProps = {
  job: PublicJob;
  navigate: (path: string) => void;
  referrerCode: string | undefined;
  isClosed: boolean;
  authLoading: boolean;
  successFeeAmount: number;
  showSuccessFee: boolean;
  hasProbationPeriod: boolean;
  workTypeLabel: string;
  sections: ReturnType<typeof buildPublicJobSections>;
  sidebarDetails: ReturnType<typeof buildSidebarJobDetails>;
  handleClaimAsCandidate: () => void;
  handleCloseModal: () => void;
  handleSubmitConnector: () => void;
  showClaimModal: boolean;
  isSubmitting: boolean;
};

function renderPublicJobView({
  job,
  navigate,
  referrerCode,
  isClosed,
  authLoading,
  successFeeAmount,
  showSuccessFee,
  hasProbationPeriod,
  workTypeLabel,
  sections,
  sidebarDetails,
  handleClaimAsCandidate,
  handleCloseModal,
  handleSubmitConnector,
  showClaimModal,
  isSubmitting,
}: PublicJobViewProps) {
  const employmentTypeLabel = formatRecruitmentEmploymentType(
    job.employmentType
  );
  return (
    <div className="min-h-screen overflow-x-clip bg-secondary pb-24 text-foreground md:pb-8">
      {/* Topbar — logo only on mobile; desktop has sidebar CTAs */}
      <header className="sticky top-0 z-[60] flex h-[60px] items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-xl sm:px-8">
        <Link to="/" className="flex flex-shrink-0 items-center gap-2">
          <img
            src="/prospectly-logo.png"
            alt="Prospectly"
            className="h-8 w-auto"
          />
        </Link>
        {isClosed && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/signin")}
            className="gap-1.5"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-6 pt-6 sm:px-7">
        {/* Closed Job Banner */}
        {isClosed && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="mb-1 text-lg font-semibold text-amber-900">
                  This position is no longer accepting applications
                </h2>
                {job.closedAt && (
                  <p className="mb-2 text-sm text-amber-700">
                    Closed on {formatDateTime(job.closedAt)}
                  </p>
                )}
                <p className="text-sm text-amber-700">
                  Know someone who might be a great fit for other roles? Sign in
                  to explore referral opportunities.
                </p>
                <Button
                  onClick={() => navigate(JOB_MARKETPLACE_PATH)}
                  className="mt-4 bg-amber-600 text-white hover:bg-amber-700"
                >
                  Explore Opportunities
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Job header — clean, no gradient */}
        <section className="mb-6">
          <h1 className="mb-2 text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-[32px]">
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
                      one-time, paid to Candidate
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden h-9 w-px bg-border sm:block" />
              <p className="flex-1 text-[13px] leading-relaxed text-muted-foreground">
                {hasProbationPeriod ? (
                  <>
                    Paid after your completes the{" "}
                    <span className="font-medium text-foreground">
                      {job.probationPeriodDays}-day probation
                    </span>{" "}
                    and converts to a full-time permanent employee.
                  </>
                ) : (
                  <>
                    Paid once you're officially hired and join as a full-time
                    employee.
                  </>
                )}
              </p>
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-3 text-[12px] leading-relaxed text-muted-foreground">
              <span>Separate from the regular salary</span>
              {hasProbationPeriod && (
                <>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-rose" />
                    You must complete the full probation period
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-rose" />
                    Paid after permanent employee confirmation
                  </span>
                </>
              )}
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-rose" />
                Specific timing outlined in the employment contract
              </span>
            </div>
          </section>
        )}

        {/* Main layout — flex columns so left content stacks without grid row gap */}
        <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
          {/* Left column */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {!isClosed &&
              renderReferralSidebar({
                sidebarDetails,
                referrerCode,
                authLoading,
                showActionButtons: false,
                handleClaimAsCandidate,
                className: "lg:hidden",
              })}

            {/* Skills */}
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
                      {job.requiredSkills.map((skill) => (
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
                      {job.preferredSkills.map((skill) => (
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

            {/* Salary note */}
            {job.salaryRangeNotes && (
              <div className="flex items-start gap-2 rounded-2xl border border-brand-sky/15 bg-brand-sky/5 px-4 py-3">
                <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky" />
                <div className="text-sm text-foreground">
                  <span className="font-semibold">Salary note:</span>{" "}
                  {job.salaryRangeNotes}
                </div>
              </div>
            )}

            {/* Content sections — individual cards, no tabs */}
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

          {!isClosed &&
            renderReferralSidebar({
              sidebarDetails,
              referrerCode,
              authLoading,
              showActionButtons: true,
              handleClaimAsCandidate,
              className:
                "hidden min-w-0 flex-col gap-4 lg:flex lg:w-[340px] lg:shrink-0 lg:self-start lg:sticky lg:top-[72px] lg:z-10",
            })}
        </div>
      </main>

      {/* Mobile sticky action bar */}
      {!isClosed && referrerCode && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t border-border bg-background/95 p-3 backdrop-blur-xl md:hidden">
          <Button
            size="lg"
            className="min-w-0 flex-1 gap-1.5 bg-brand-gradient text-white shadow-brand-cta"
            onClick={handleClaimAsCandidate}
            disabled={authLoading}
          >
            <User className="h-5 w-5 shrink-0" />
            Apply Now
          </Button>
        </div>
      )}

      {/* Connector Flow Modal */}
      <Dialog open={showClaimModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Submit a Candidate</DialogTitle>
            <DialogDescription>
              You'll need to sign in to submit candidate details.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
              <Users className="h-8 w-8" />
            </div>
            <p className="mb-4 text-muted-foreground">
              Sign in to your Prospectly account to submit candidates and track
              your earnings.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Don't have an account? You'll be able to create one.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitConnector}
              disabled={isSubmitting}
              className="bg-brand-gradient text-white shadow-brand-cta hover:shadow-brand-cta-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Continue to Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
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

export default function PublicJobPage() {
  const { shareCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const ref = searchParams.get("ref");
  const jobId = shareCode;
  const referrerCode = ref || undefined;

  const { job, loading, error } = usePublicJob(jobId, ref, true);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClaimAsCandidate = () => {
    if (!referrerCode) return;

    const applyParams = `applyJobId=${jobId}&ref=${referrerCode}`;

    if (user) {
      navigate(`/dashboard?${applyParams}`);
    } else {
      // Forward originJobId + originRef so the OAuth signup flow can verify
      // the public-page provenance and allow new-user registration.
      const params = new URLSearchParams();
      if (jobId) params.set("originJobId", jobId);
      params.set("originRef", referrerCode);
      params.set("returnTo", `/dashboard?${applyParams}`);
      navigate(`/signin?${params.toString()}`);
    }
  };

  const handleSubmitConnector = async () => {
    setIsSubmitting(true);
    toast({
      title: "Please sign in to continue",
      description:
        "You'll need to create an account or sign in to submit candidates.",
    });

    // Forward the job id and (optional) sharer code as origin-tracking params
    // so that signup can write a recruitment_connector_origins row.
    // `connectorSignup=true` distinguishes this connector-signup flow from
    // the candidate-apply flow ("I'm Interested"), which uses the same
    // share params for signup gating but must NOT produce an origin row.
    // The navigation target AFTER signin is handled by the post-welcome
    // popup — we intentionally do NOT set a returnTo here.
    const params = new URLSearchParams();
    if (jobId) params.set("originJobId", jobId);
    if (referrerCode) params.set("originRef", referrerCode);
    params.set("connectorSignup", "true");
    const query = params.toString();
    navigate(query ? `/signin?${query}` : "/signin");
    setIsSubmitting(false);
  };

  const handleCloseModal = () => {
    setShowClaimModal(false);
  };

  if (loading) return renderPublicJobLoading();
  if (error || !job) return renderPublicJobNotFound({ navigate });

  const {
    hasValidSalary,
    salaryMin,
    salaryMax,
    isClosed,
    successFeeAmount,
    showSuccessFee,
    hasProbationPeriod,
    workTypeLabel,
  } = computePublicJobDerived({ job });

  const sections = buildPublicJobSections({ job });
  const sidebarDetails = buildSidebarJobDetails({
    job,
    hasValidSalary,
    salaryMin,
    salaryMax,
    workTypeLabel,
  });

  const jobSeo = buildPublicJobSeoMeta(job);

  return (
    <>
      <SEO
        title={jobSeo.title}
        description={jobSeo.description}
        canonical={`/jobs/${job.id}`}
        ogImage={OG_RECRUITING_IMAGE}
      />
      {renderPublicJobView({
        job,
        navigate,
        referrerCode,
        isClosed,
        authLoading,
        successFeeAmount,
        showSuccessFee,
        hasProbationPeriod,
        workTypeLabel,
        sections,
        sidebarDetails,
        handleClaimAsCandidate,
        handleCloseModal,
        handleSubmitConnector,
        showClaimModal,
        isSubmitting,
      })}
    </>
  );
}
