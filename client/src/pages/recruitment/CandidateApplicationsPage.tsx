import { useState, useMemo, useCallback } from "react";
import SEO from "@/components/SEO";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { PipelineTabs } from "@/components/pipeline/PipelineTabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle,
  Clock,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ApplicationStatusCard } from "@/components/recruitment/ApplicationStatusCard";
import type { CandidateApplication } from "@/lib/types/recruitment";
import { CandidateInterviewBookingDialog } from "@/components/recruitment/CandidateInterviewBookingDialog";
import { CandidateOfferDialog } from "@/components/recruitment/CandidateOfferDialog";
import JobDetailsDrawer from "@/components/recruitment/JobDetailsDrawer";
import { CandidateBonusModal } from "@/components/finance/recruitment/CandidateBonusModal";
import { useMyApplications } from "@/hooks/useMyApplications";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRouteTab } from "@/hooks/useRouteTab";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { MY_APPLICATIONS_TABS, TAB_ROUTE_BASES } from "@/lib/tab-routes";
import type { MyApplicationItem } from "@/lib/api/recruitment";
import { useAuth } from "@/contexts/AuthContext";
import { APP_MODULES, hasModuleAccess } from "@/lib/modules";
const VALID_STATUSES: CandidateApplication["status"][] = [
  "applied",
  "processing",
  "under_review",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
  "offer_received",
  "offer_accepted",
  "rejected",
  "jd_mismatched",
];

const VALID_WORK_TYPES: CandidateApplication["workType"][] = [
  "remote",
  "hybrid",
  "onsite",
];

function mapApplicationStatus(status: string): CandidateApplication["status"] {
  if (VALID_STATUSES.includes(status as CandidateApplication["status"])) {
    return status as CandidateApplication["status"];
  }
  return "under_review";
}

function mapWorkType(workType: string): CandidateApplication["workType"] {
  if (VALID_WORK_TYPES.includes(workType as CandidateApplication["workType"])) {
    return workType as CandidateApplication["workType"];
  }
  return "onsite";
}

function mapPlatformToInterviewType(
  platform: string | null
): "video" | "phone" | "in_person" {
  if (!platform) return "video";
  const p = platform.toLowerCase();
  if (["zoom", "google_meet", "teams", "webex"].includes(p)) return "video";
  if (p === "phone") return "phone";
  return "in_person";
}

function mapApiToApplication(item: MyApplicationItem): CandidateApplication {
  return {
    id: item.id,
    jobId: item.jobId,
    jobTitle: item.jobTitle,
    companyName: item.companyName,
    companyLogo: null,
    description: item.description,
    location: item.location,
    experienceLevel: item.experienceLevel,
    employmentType: item.employmentType,
    workType: mapWorkType(item.workType),
    salaryRange: item.salaryRange,
    salaryPeriod: item.salaryPeriod,
    salaryCurrency: item.salaryCurrency ?? item.salaryRange.currency,
    status: mapApplicationStatus(item.status),
    appliedAt: item.appliedAt,
    lastUpdatedAt: item.lastUpdatedAt,
    timeline: item.timeline,
    interviewScheduledAt: item.interviewMeetingDate ?? undefined,
    interviewType: mapPlatformToInterviewType(item.interviewMeetingPlatform),
    interviewDuration: item.interviewMeetingDuration ?? undefined,
    meetingLink: item.interviewMeetingLink ?? undefined,
    // Skill analysis fields
    matchScore: item.matchScore,
    matchedSkills: item.matchedSkills ?? null,
    missingSkills: item.missingSkills ?? null,
    analysisStatus: item.analysisStatus,
    analysisAt: item.analysisAt,
    evaluationRetryCount: item.evaluationRetryCount ?? 0,
    bonus: item.bonus ?? null,
    gapAnalysis: item.gapAnalysis ?? null,
  };
}

// Shared constant for completed statuses
const COMPLETED_STATUSES = new Set([
  "offer_accepted",
  "rejected",
  "jd_mismatched",
]);

export default function CandidateApplicationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  // The in-app Job Marketplace is gated by recruiting module access. Only offer
  // the "Browse Jobs" CTA to users who can actually open it; everyone else gets
  // a neutral empty state (they reach jobs via public share links).
  const canAccessRecruiting = hasModuleAccess(
    user?.accessibleModules,
    APP_MODULES.RECRUITING
  );
  const {
    applications: apiApplications,
    loading,
    error,
    refetch,
  } = useMyApplications();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await refetch();
      if (result.isError || result.error) {
        toast({
          title: "Refresh failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Refreshed",
        description: "Your applications list is up to date.",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, toast]);

  // Local overrides for optimistic updates (accept/decline offer)
  const [localOverrides, setLocalOverrides] = useState<
    Map<string, Partial<CandidateApplication>>
  >(new Map());

  const applications = useMemo(() => {
    const mapped = apiApplications.map(mapApiToApplication);
    if (localOverrides.size === 0) return mapped;
    return mapped.map((app) => {
      const override = localOverrides.get(app.id);
      return override ? { ...app, ...override } : app;
    });
  }, [apiApplications, localOverrides]);

  const [activeTab, setActiveTab] = useRouteTab<
    (typeof MY_APPLICATIONS_TABS)[number]
  >({
    basePath: TAB_ROUTE_BASES.myApplications,
    allowedTabs: MY_APPLICATIONS_TABS,
    defaultTab: "all",
  });
  const { search: searchInput, setSearch: setSearchInput } = useRouteSearch();
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [showInterviewBooking, setShowInterviewBooking] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showJobDetailsPopup, setShowJobDetailsPopup] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [selectedBonusId, setSelectedBonusId] = useState<string | null>(null);
  const [selectedJobIdForDetails, setSelectedJobIdForDetails] = useState<
    string | null
  >(null);
  const [selectedApplication, setSelectedApplication] =
    useState<CandidateApplication | null>(null);

  const searchNeedle = debouncedSearch.trim().toLowerCase();

  // Filter applications by tab and search (job title / company)
  const filteredApplications = applications.filter((app) => {
    if (activeTab === "active") {
      if (COMPLETED_STATUSES.has(app.status)) {
        return false;
      }
    } else if (activeTab === "completed") {
      if (!COMPLETED_STATUSES.has(app.status)) {
        return false;
      }
    }
    if (searchNeedle) {
      const inTitle = app.jobTitle.toLowerCase().includes(searchNeedle);
      const inCompany = app.companyName.toLowerCase().includes(searchNeedle);
      if (!inTitle && !inCompany) return false;
    }
    return true;
  });

  // Calculate stats
  const stats = {
    total: applications.length,
    active: applications.filter((a) => !COMPLETED_STATUSES.has(a.status))
      .length,
    interviews: applications.filter((a) => a.status === "interview_scheduled")
      .length,
  };

  const handleBookInterview = (app: CandidateApplication) => {
    setSelectedApplication(app);
    setShowInterviewBooking(true);
  };

  const handleViewOffer = (app: CandidateApplication) => {
    setSelectedApplication(app);
    setShowOfferDialog(true);
  };

  const handleViewDetails = (app: CandidateApplication) => {
    if (app.jobId) {
      setSelectedJobIdForDetails(app.jobId);
      setShowJobDetailsPopup(true);
    }
  };

  const handleViewBonus = (app: CandidateApplication) => {
    if (app.bonus?.id) {
      setSelectedBonusId(app.bonus.id);
      setShowBonusModal(true);
    }
  };

  const handleInterviewBooked = () => {
    if (selectedApplication) {
      toast({
        title: "Interview booked",
        description: "You'll receive a confirmation email shortly",
      });
    }
    setShowInterviewBooking(false);
    setSelectedApplication(null);
    refetch();
  };

  const handleAcceptOffer = () => {
    if (selectedApplication) {
      const today = new Date().toISOString().split("T")[0];
      setLocalOverrides((prev) => {
        const next = new Map(prev);
        next.set(selectedApplication.id, {
          status: "offer_accepted" as const,
          offerAcceptedAt: today,
          timeline: [
            ...selectedApplication.timeline,
            {
              status: "offer_accepted",
              date: today,
              note: "Congratulations! You accepted the offer",
            },
          ],
        });
        return next;
      });
      toast({
        title: "Offer accepted!",
        description: "Congratulations on your new role!",
      });
      refetch();
    }
    setShowOfferDialog(false);
    setSelectedApplication(null);
  };

  const handleDeclineOffer = (reason?: string) => {
    if (selectedApplication) {
      const today = new Date().toISOString().split("T")[0];
      setLocalOverrides((prev) => {
        const next = new Map(prev);
        next.set(selectedApplication.id, {
          status: "rejected" as const,
          rejectionReason: reason || "Offer declined by candidate",
          timeline: [
            ...selectedApplication.timeline,
            {
              status: "rejected",
              date: today,
              note: "Offer declined",
            },
          ],
        });
        return next;
      });
      toast({
        title: "Offer declined",
        description: "The company has been notified",
      });
      refetch();
    }
    setShowOfferDialog(false);
    setSelectedApplication(null);
  };

  return (
    <main className="px-2 sm:px-4 md:px-6 py-4 space-y-6">
      <SEO title="My Applications | Prospectly" />

      <PageHeader
        title="My Applications — track your applications & interviews."
        description="Follow every application from submission to offer, all in one place."
      />

      {/* Content */}
      <div>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="w-full flex flex-col"
        >
          <PipelineTabs
            tabs={[
              {
                value: "all",
                label: "All",
                icon: Inbox,
                badge: applications.length,
                color: "blue",
              },
              {
                value: "active",
                label: "Active",
                icon: Clock,
                badge: stats.active,
                color: "purple",
              },
              {
                value: "completed",
                label: "Completed",
                icon: CheckCircle,
                badge: applications.length - stats.active,
                color: "emerald",
              },
            ]}
            activeTab={activeTab}
            onTabChange={(v) => setActiveTab(v as typeof activeTab)}
            isRefreshing={isRefreshing || loading}
            onRefresh={handleRefresh}
            showSearch
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Search by job or company…"
            containerMinWidth="min-w-[550px]"
            tabsListMinWidth="min-w-[500px]"
            tabsListMaxWidth="max-w-lg"
          />
        </Tabs>

        {/* Application List */}
        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-destructive/10 text-brand-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-6">
              We couldn't load your applications. Please try again.
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </Card>
        ) : applications.length === 0 ? (
          <Card className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
              <Briefcase className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">No applications yet</h3>
            {canAccessRecruiting ? (
              <>
                <p className="text-muted-foreground mb-6">
                  Browse the job marketplace to find opportunities that match
                  your skills.
                </p>
                <Button
                  className="bg-brand-gradient text-brand-foreground font-semibold shadow-brand-cta transition-all hover:shadow-brand-cta-lg hover:-translate-y-0.5"
                  onClick={() => navigate("/recruiting/job-marketplace")}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Browse Jobs
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                Applications you submit will appear here, so you can track each
                one from submission to offer.
              </p>
            )}
          </Card>
        ) : filteredApplications.length === 0 ? (
          <Card className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Briefcase className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">No matching applications</h3>
            <p className="text-muted-foreground mb-6">
              Try a different search or tab filter.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredApplications.map((app) => (
              <ApplicationStatusCard
                key={app.id}
                application={app}
                onBookInterview={() => handleBookInterview(app)}
                onViewOffer={() => handleViewOffer(app)}
                onViewDetails={
                  app.jobId ? () => handleViewDetails(app) : undefined
                }
                onViewBonus={
                  app.bonus?.id ? () => handleViewBonus(app) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Interview Booking Dialog */}
      <CandidateInterviewBookingDialog
        open={showInterviewBooking}
        onOpenChange={setShowInterviewBooking}
        application={selectedApplication}
        onBooked={handleInterviewBooked}
      />

      {/* Offer Dialog */}
      <CandidateOfferDialog
        open={showOfferDialog}
        onOpenChange={setShowOfferDialog}
        application={selectedApplication}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
      />

      {/* Bonus Details Modal (reused from the Transactions view) */}
      <CandidateBonusModal
        open={showBonusModal}
        onOpenChange={(open) => {
          setShowBonusModal(open);
          if (!open) setSelectedBonusId(null);
        }}
        bonusId={selectedBonusId}
      />

      {/* Job Details Drawer */}
      <JobDetailsDrawer
        jobId={selectedJobIdForDetails}
        open={showJobDetailsPopup}
        onOpenChange={(open) => {
          setShowJobDetailsPopup(open);
          if (!open) setSelectedJobIdForDetails(null);
        }}
        includeClosed={true}
      />
    </main>
  );
}
