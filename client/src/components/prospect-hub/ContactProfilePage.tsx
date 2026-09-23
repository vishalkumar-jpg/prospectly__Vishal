import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Sparkles, DatabaseZap } from "lucide-react";
import { ContactProfileHero } from "./ContactProfileHero";
import {
  ProfessionalHeadline,
  EmploymentHistory,
  OrganizationSpotlight,
  StatsBadges,
} from "./ContactProfileSections";

export interface ContactDetailsData {
  id: number;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  location: string | null;
  linkedin: string | null;
  profilePhotoUrl: string | null;
  companyDomain: string | null;
  companyIndustry: string | null;
  companyDescription: string | null;
  companyLinkedinUrl: string | null;
  companyType: string | null;
  employees: string | null;
  website: string | null;
  industry: string | null;
  linkedinConnections: string | null;
  bountyAmount: string | null;
  enrichmentStatus: string;
  headline: string | null;
  seniority: string | null;
  departments: string[] | null;
  functions: string[] | null;
  employmentHistory:
    | {
        current: boolean;
        organizationName: string;
        title: string;
        startDate: string | null;
        endDate: string | null;
      }[]
    | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  facebookUrl: string | null;
  companyFoundedYear: number | null;
  companyRevenue: string | null;
  companyMarketCap: string | null;
  companyPhone: string | null;
  companyCity: string | null;
  companyState: string | null;
  companyCountry: string | null;
  companyLogoUrl: string | null;
  companyFacebookUrl: string | null;
  companyTwitterUrl: string | null;
  companyPrimaryDomain: string | null;
  emailStatus: string | null;
  connectorCount: number;
  hasEmail: boolean;
  enrichmentSource: "apollo" | "zoom_info" | "clay" | null;
}

interface ContactProfilePageProps {
  contactDetails: ContactDetailsData | null;
  isLoading: boolean;
  bountyAmount: string | number;
  isBountyCalculating: boolean;
  isCheckingOwnership?: boolean;
  onRequestIntroduction?: () => void;
}

const ENRICHMENT_STEPS = [
  { icon: Search, label: "Searching global databases" },
  { icon: Sparkles, label: "Enriching contact profile" },
  { icon: DatabaseZap, label: "Analyzing professional data" },
] as const;

function ShimmerSkeleton({
  className,
  delay = "0s",
}: {
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-slate-100 ${className ?? ""}`}
      style={{ animationDelay: delay }}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{ animationDelay: delay }}
      >
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % ENRICHMENT_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = ENRICHMENT_STEPS[stepIndex].icon;

  return (
    <div className="bg-app">
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes fade-step {
          0%, 100% { opacity: 0; transform: translateY(4px); }
          15%, 85% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-50/80 via-purple-50/80 to-violet-50/80 border-b border-violet-100/50">
        <div className="relative flex items-center justify-center h-5 w-5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400/30" />
          <CurrentIcon className="relative h-3.5 w-3.5 text-violet-500" />
        </div>
        <span
          key={stepIndex}
          className="text-xs font-medium text-violet-600 tracking-wide"
          style={{ animation: "fade-step 3s ease-in-out" }}
        >
          {ENRICHMENT_STEPS[stepIndex].label}...
        </span>
      </div>

      {/* Hero Skeleton */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-3">
        <div className="flex items-center gap-3">
          <ShimmerSkeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <ShimmerSkeleton className="h-5 w-40" delay="0.1s" />
            <ShimmerSkeleton className="h-4 w-56" delay="0.2s" />
            <ShimmerSkeleton className="h-3 w-32" delay="0.3s" />
            <ShimmerSkeleton className="h-3 w-24" delay="0.35s" />
          </div>
          <div className="flex-shrink-0 flex flex-col gap-2 items-end">
            <div className="bg-violet-100/60 rounded-lg px-4 py-2 border border-violet-200/50 min-w-[130px] text-center">
              <ShimmerSkeleton className="h-7 w-16 mx-auto" delay="0.15s" />
              <ShimmerSkeleton
                className="h-2.5 w-14 mx-auto mt-1.5"
                delay="0.25s"
              />
            </div>
            <ShimmerSkeleton
              className="h-8 w-[130px] rounded-md"
              delay="0.3s"
            />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-[1fr_360px] gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Professional Headline Card */}
            <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-3">
              <ShimmerSkeleton className="h-4 w-36" delay="0.1s" />
              <ShimmerSkeleton className="h-4 w-full" delay="0.2s" />
              <ShimmerSkeleton className="h-3 w-48" delay="0.3s" />
              <ShimmerSkeleton className="h-3 w-64" delay="0.4s" />
              <ShimmerSkeleton className="h-3 w-40" delay="0.5s" />
            </div>
            {/* Employment History Card */}
            <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-4">
              <ShimmerSkeleton className="h-4 w-40" delay="0.15s" />
              <div className="flex items-start gap-3">
                <ShimmerSkeleton
                  className="h-3 w-3 rounded-full mt-1 flex-shrink-0"
                  delay="0.25s"
                />
                <div className="space-y-1.5 flex-1">
                  <ShimmerSkeleton className="h-4 w-36" delay="0.3s" />
                  <ShimmerSkeleton className="h-3 w-28" delay="0.35s" />
                  <ShimmerSkeleton className="h-3 w-40" delay="0.4s" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShimmerSkeleton
                  className="h-3 w-3 rounded-full mt-1 flex-shrink-0"
                  delay="0.45s"
                />
                <div className="space-y-1.5 flex-1">
                  <ShimmerSkeleton className="h-4 w-32" delay="0.5s" />
                  <ShimmerSkeleton className="h-3 w-24" delay="0.55s" />
                  <ShimmerSkeleton className="h-3 w-36" delay="0.6s" />
                </div>
              </div>
            </div>
            {/* Skills & Tags */}
            <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-3">
              <ShimmerSkeleton className="h-4 w-24" delay="0.2s" />
              <div className="flex gap-2">
                <ShimmerSkeleton
                  className="h-6 w-16 rounded-full"
                  delay="0.3s"
                />
                <ShimmerSkeleton
                  className="h-6 w-24 rounded-full"
                  delay="0.4s"
                />
                <ShimmerSkeleton
                  className="h-6 w-20 rounded-full"
                  delay="0.5s"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Organization Spotlight */}
          <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-4">
            <ShimmerSkeleton className="h-4 w-40" delay="0.1s" />
            <ShimmerSkeleton className="h-5 w-48" delay="0.2s" />
            <div className="space-y-2">
              <ShimmerSkeleton className="h-3 w-full" delay="0.25s" />
              <ShimmerSkeleton className="h-3 w-full" delay="0.3s" />
              <ShimmerSkeleton className="h-3 w-full" delay="0.35s" />
              <ShimmerSkeleton className="h-3 w-3/4" delay="0.4s" />
            </div>
            <div className="space-y-2.5 pt-2">
              <ShimmerSkeleton className="h-3.5 w-52" delay="0.35s" />
              <ShimmerSkeleton className="h-3.5 w-32" delay="0.4s" />
              <ShimmerSkeleton className="h-3.5 w-20" delay="0.45s" />
              <ShimmerSkeleton className="h-3.5 w-28" delay="0.5s" />
            </div>
            <div className="flex gap-3 pt-2">
              <ShimmerSkeleton className="h-3.5 w-16" delay="0.45s" />
              <ShimmerSkeleton className="h-3.5 w-16" delay="0.5s" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContactProfilePage({
  contactDetails,
  isLoading,
  bountyAmount,
  isBountyCalculating,
  isCheckingOwnership,
  onRequestIntroduction,
}: ContactProfilePageProps) {
  if (isLoading || !contactDetails) return <LoadingSkeleton />;

  const c = contactDetails;
  const fullName =
    [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";
  const location =
    c.location || [c.city, c.state, c.country].filter(Boolean).join(", ");
  const websiteUrl =
    c.website || (c.companyDomain ? `https://${c.companyDomain}` : null);

  const hasHeadline = !!(
    c.headline ||
    c.seniority ||
    c.departments?.length ||
    c.functions?.length
  );
  const hasEmployment = !!c.employmentHistory?.length;
  const hasBadges = !!(
    c.seniority ||
    c.departments?.[0] ||
    c.functions?.[0] ||
    c.linkedinConnections
  );
  const hasLeftContent = hasHeadline || hasEmployment || hasBadges;

  const orgSpotlight = (
    <OrganizationSpotlight
      company={c.company}
      companyDescription={c.companyDescription}
      companyIndustry={c.companyIndustry}
      industry={c.industry}
      employees={c.employees}
      companyRevenue={c.companyRevenue}
      companyFoundedYear={c.companyFoundedYear}
      companyMarketCap={c.companyMarketCap}
      websiteUrl={websiteUrl}
      companyLinkedinUrl={c.companyLinkedinUrl}
      companyCity={c.companyCity}
      companyState={c.companyState}
      companyCountry={c.companyCountry}
      companyLogoUrl={c.companyLogoUrl}
      companyFacebookUrl={c.companyFacebookUrl}
      companyTwitterUrl={c.companyTwitterUrl}
      companyPrimaryDomain={c.companyPrimaryDomain}
    />
  );

  return (
    <div className="bg-app">
      <ContactProfileHero
        fullName={fullName}
        headline={c.headline}
        title={c.title}
        company={c.company}
        location={location}
        profilePhotoUrl={c.profilePhotoUrl}
        bountyAmount={bountyAmount}
        isBountyCalculating={isBountyCalculating}
        linkedin={c.linkedin}
        githubUrl={c.githubUrl}
        twitterUrl={c.twitterUrl}
        facebookUrl={c.facebookUrl}
        emailStatus={c.emailStatus}
        hasEmail={c.hasEmail}
        isCheckingOwnership={isCheckingOwnership}
        onRequestIntroduction={onRequestIntroduction}
      />

      <div className="p-6 space-y-4">
        {hasLeftContent ? (
          <div className="grid grid-cols-[1fr_360px] gap-4">
            {/* Left column */}
            <div className="space-y-4">
              <ProfessionalHeadline
                headline={c.headline}
                seniority={c.seniority}
                departments={c.departments}
                functions={c.functions}
              />
              <EmploymentHistory history={c.employmentHistory} />
              <StatsBadges
                seniority={c.seniority}
                departments={c.departments}
                functions={c.functions}
                linkedinConnections={c.linkedinConnections}
              />
            </div>
            {/* Right sidebar */}
            <div className="space-y-4">{orgSpotlight}</div>
          </div>
        ) : (
          /* No left content — full-width organization spotlight */
          <div className="space-y-4">{orgSpotlight}</div>
        )}
      </div>
    </div>
  );
}
