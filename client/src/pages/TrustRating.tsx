import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Award, Users, AlertTriangle, Loader2 } from "lucide-react";
import { TrustScoreRuleCard } from "@/components/trust/TrustScoreRuleCard";
import { TrustScoreOverview } from "@/components/trust/TrustScoreOverview";
import { PeerFeedbackCard } from "@/components/trust/PeerFeedbackCard";
import { FeedbackStatsCard } from "@/components/trust/FeedbackStatsCard";
import { useToast } from "@/hooks/use-toast";
import { TrustScoreHistoryModal } from "@/components/trust/TrustScoreHistoryModal";
import { PageHeaderSection } from "@/components/ui/page-header";
import { PageStatCard } from "@/components/ui/page-stat-card";

export default function TrustRating() {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [feedbackLimit, setFeedbackLimit] = useState(5);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    analytics.trackFeatureViewed({
      feature: "trust_hub",
      route: "/trust-score",
      entryPoint: "direct",
    });
  }, []);

  // Fetch trust score
  const {
    data: trustScoreData,
    isLoading: trustScoreLoading,
    error: trustScoreError,
  } = useQuery({
    queryKey: ["/api/trust-score/me"],
    queryFn: () => api.trustScore.getMyScore(),
    enabled: !!user,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Fetch trust score rules
  const {
    data: rulesData,
    isLoading: rulesLoading,
    error: rulesError,
  } = useQuery({
    queryKey: ["/api/trust-score/me/rules"],
    queryFn: () => api.trustScore.getMyRules(),
    enabled: !!user,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Fetch feedback
  const {
    data: feedbackData,
    isLoading: feedbackLoading,
    isFetching: feedbackFetching,
    error: feedbackError,
  } = useQuery({
    queryKey: ["/api/feedback/me", feedbackLimit],
    queryFn: () => api.feedback.getMyFeedback(feedbackLimit, 0),
    enabled: !!user,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Handle scroll to hash
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        // Delay slightly to ensure content is rendered
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }, [location.hash, feedbackLoading]); // Also re-run when feedback finishes loading

  // Handle errors with useEffect to prevent infinite loop
  useEffect(() => {
    if (trustScoreError || rulesError || feedbackError) {
      toast({
        title: "Error loading data",
        description: "Failed to load trust score data. Please try again.",
        variant: "destructive",
      });
    }
  }, [trustScoreError, rulesError, feedbackError, toast]);

  const trustScore = trustScoreData?.trustScore || 0;
  const earnedRules = [...(rulesData?.earned || [])].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
  );
  const pendingRules = [...(rulesData?.pending || [])].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
  );
  const deductionRules = [...(rulesData?.deductions || [])].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
  );
  const feedbacks = feedbackData?.feedbacks || [];
  const feedbackStats = feedbackData?.stats || {
    averageRating: 0,
    totalCount: 0,
    ratingDistribution: {},
  };

  // Display-only derivations from already-fetched data (no business logic).
  const totalRules =
    earnedRules.length + pendingRules.length + deductionRules.length;
  const avg = feedbackStats.averageRating;

  const heroStats: {
    title: string;
    value: string | number;
    numericValue?: number;
    icon: typeof Award;
  }[] = [
    {
      title: "Achievements",
      value: `${earnedRules.length} / ${totalRules}`,
      icon: Award,
    },
    {
      title: "Peer Reviews",
      value: feedbackStats.totalCount,
      numericValue: feedbackStats.totalCount,
      icon: Users,
    },
    {
      title: "Average Rating",
      value: `${avg.toFixed(1)} / 5`,
      icon: Star,
    },
  ];

  return (
    <>
      <TrustScoreHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
      <SEO
        title="Trust Score | Prospectly"
        description="View your trust score, earned achievements, and peer feedback"
      />

      <div className="min-w-0 w-full max-w-full">
        <div className="min-w-0 space-y-6 px-2 py-4 sm:px-4 md:px-6">
          <PageHeaderSection
            title="Trust Score — your reputation, earned."
            description="Track what others say about you. Higher scores unlock faster payouts, priority matching, and exclusive opportunities."
            statsClassName="lg:w-[440px]"
            stats={
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {trustScoreLoading || rulesLoading || feedbackLoading
                  ? [1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-[116px] rounded-2xl" />
                    ))
                  : heroStats.map((stat) => (
                      <PageStatCard
                        key={stat.title}
                        label={stat.title}
                        icon={stat.icon}
                        value={stat.value}
                      />
                    ))}
              </div>
            }
          />

          <div className="space-y-6">
            {/* Side-by-Side Layout: Hero Section + Achievement Center */}
            <div className="grid grid-cols-1 2xl:grid-cols-12 gap-4 sm:gap-6">
              {/* Hero Trust Score Section - Left Side */}
              <TrustScoreOverview
                trustScore={trustScore}
                trustScoreLoading={trustScoreLoading}
                lastUpdated={trustScoreData?.lastUpdated}
                earnedRulesCount={earnedRules.length}
                feedbackTotalCount={feedbackStats.totalCount}
                onHistoryClick={() => setIsHistoryModalOpen(true)}
                className="2xl:col-span-4"
                stackedRing
              />

              {/* Achievement Center - Right Side (Bigger) */}
              <div className="2xl:col-span-8">
                <Card className="h-full rounded-2xl border border-border bg-card shadow-brand-card">
                  <CardHeader className="p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-warning/10 text-brand-warning">
                        <Award className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg font-extrabold tracking-tight">
                          Achievement Center
                        </CardTitle>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Complete actions to earn achievements and boost your
                          trust score
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                    {rulesLoading ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <Skeleton
                            key={i}
                            className="h-[88px] w-full rounded-xl"
                          />
                        ))}
                      </div>
                    ) : earnedRules.length === 0 &&
                      pendingRules.length === 0 &&
                      deductionRules.length === 0 ? (
                      <div className="py-16 text-center">
                        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                          <Award className="h-8 w-8" />
                        </div>
                        <h3 className="mb-2 text-base font-extrabold tracking-tight text-foreground">
                          No achievements yet
                        </h3>
                        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                          Start building your reputation by completing
                          introductions and other platform activities to unlock
                          achievements and improve your trust score.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* All Achievements */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                          {earnedRules.map((rule) => (
                            <TrustScoreRuleCard
                              key={rule.ruleId}
                              rule={rule}
                              isEarned={true}
                            />
                          ))}
                          {pendingRules.map((rule) => (
                            <TrustScoreRuleCard
                              key={rule.ruleId}
                              rule={rule}
                              isEarned={false}
                            />
                          ))}
                        </div>

                        {/* Deduction Rules - For User Awareness */}
                        {deductionRules.length > 0 && (
                          <div>
                            <div className="mb-4 flex items-start gap-3 rounded-xl border border-brand-warning/20 bg-brand-warning/10 p-4">
                              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-warning" />
                              <div className="min-w-0">
                                <h3 className="mb-0.5 text-sm font-extrabold tracking-tight text-foreground">
                                  Point Deductions
                                </h3>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                  Be aware of these rules that can result in
                                  point deductions if not followed.
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                              {deductionRules.map((rule) => (
                                <TrustScoreRuleCard
                                  key={rule.ruleId}
                                  rule={rule}
                                  isEarned={false}
                                  isDeduction={true}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Feedback Section */}
            <div className="grid grid-cols-1 2xl:grid-cols-12 gap-4 sm:gap-6">
              {/* Feedback Stats */}
              <div className="2xl:col-span-4 h-full">
                <Card className="flex h-auto flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-brand-card md:h-[550px]">
                  <CardHeader className="shrink-0 p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-warning/10 text-brand-warning">
                        <Star className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg font-extrabold tracking-tight">
                          Feedback Analytics
                        </CardTitle>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Insights from your peer reviews
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto px-5 pb-6 pt-0 sm:px-6">
                    {feedbackLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-32 w-full rounded-xl" />
                        <Skeleton className="h-48 w-full rounded-xl" />
                      </div>
                    ) : (
                      <FeedbackStatsCard stats={feedbackStats} />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Feedback List */}
              <div className="2xl:col-span-8 h-full" id="recent-feedback">
                <Card className="flex h-auto flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-brand-card md:h-[550px]">
                  <CardHeader className="shrink-0 border-b border-border p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-sky/10 text-brand-sky">
                          <Users className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-lg font-extrabold tracking-tight">
                          Recent Peer Feedback
                        </CardTitle>
                      </div>
                      {feedbackStats.totalCount > 0 && (
                        <span className="rounded-full bg-brand-sky/10 px-3 py-1 text-xs font-bold text-brand-sky">
                          {feedbacks.length} of {feedbackStats.totalCount}{" "}
                          reviews
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="recent-peer-feedback-scroll flex-1 overflow-y-auto p-0">
                    {feedbackLoading ? (
                      <div className="space-y-4 p-5 sm:p-6">
                        {[1, 2, 3].map((i) => (
                          <Skeleton
                            key={i}
                            className="h-36 w-full rounded-2xl"
                          />
                        ))}
                      </div>
                    ) : feedbacks.length === 0 ? (
                      <div className="px-6 py-20 text-center">
                        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                          <Star className="h-8 w-8" />
                        </div>
                        <h3 className="mb-2 text-base font-extrabold tracking-tight text-foreground">
                          No feedback received yet
                        </h3>
                        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                          Complete introductions to start receiving valuable
                          feedback from peers and build your professional
                          reputation on the platform.
                        </p>
                      </div>
                    ) : (
                      <div className="p-5 sm:p-6">
                        <div className="space-y-4">
                          {feedbacks.map((feedback) => (
                            <PeerFeedbackCard
                              key={feedback.id}
                              feedback={feedback}
                            />
                          ))}
                          {feedbackFetching && !feedbackLoading && (
                            <div className="space-y-4">
                              {[1, 2].map((i) => (
                                <Skeleton
                                  key={`fetching-${i}`}
                                  className="h-24 w-full rounded-xl"
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {feedbackStats.totalCount > feedbacks.length && (
                          <div className="flex justify-center pb-4 pt-8">
                            <Button
                              variant="outline"
                              onClick={() =>
                                setFeedbackLimit((prev) => prev + 5)
                              }
                              disabled={feedbackFetching}
                              className="flex items-center gap-2 rounded-xl px-8 py-2.5 text-sm font-semibold transition-all duration-300 hover:border-brand-amethyst/40 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                            >
                              {feedbackFetching && !feedbackLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                "Load More Reviews"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
