import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import SEO from "@/components/SEO";
import { useQueryClient } from "@tanstack/react-query";
import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRequesterEligibility } from "@/hooks/useRequesterEligibility";
import { useCalendarConnectModal } from "@/hooks/useCalendarConnectModal";
import {
  useProspectSearch,
  getProspectSearchQueryKey,
} from "@/hooks/useProspectSearch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ContactProfileModal } from "@/components/prospect-hub/ContactProfileModal";
import { SearchMethods } from "@/components/prospect-hub/SearchMethods";
import { SearchMethodsTypesense } from "@/components/prospect-hub/SearchMethodsTypesense";
import { ProspectCard } from "@/components/prospect-hub/ProspectCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Calendar,
  Target,
  ArrowUp,
  Search,
  Pencil,
} from "lucide-react";
import { AnyType } from "@/types/common";
import { cn } from "@/lib/utils";

const useTypesense = import.meta.env.VITE_SEARCH_ENGINE === "typesense";

const PROSPECT_SEARCH_PARAM_KEYS = [
  "name",
  "title",
  "company",
  "website",
  "location",
  "linkedin",
  "email",
] as const;

type ProspectSearchFields = {
  name: string;
  title: string;
  company: string;
  website: string;
  location: string;
  linkedin: string;
  email: string;
};

function readProspectSearchFieldsFromUrl(
  urlSearchParams: URLSearchParams
): ProspectSearchFields {
  const read = (key: (typeof PROSPECT_SEARCH_PARAM_KEYS)[number]) =>
    urlSearchParams.get(key)?.trim() ?? "";

  return {
    name: read("name"),
    title: read("title"),
    company: read("company"),
    website: read("website"),
    location: read("location"),
    linkedin: read("linkedin"),
    email: read("email"),
  };
}

function hasProspectSearchFields(fields: ProspectSearchFields) {
  return Object.values(fields).some(Boolean);
}

function buildProspectSearchUrlParams(fields: ProspectSearchFields) {
  const params = new URLSearchParams();
  for (const key of PROSPECT_SEARCH_PARAM_KEYS) {
    const value = fields[key];
    if (value) params.set(key, value);
  }
  return params;
}

function toAppliedSearchParams(fields: ProspectSearchFields) {
  return {
    name: fields.name || undefined,
    title: fields.title || undefined,
    company: fields.company || undefined,
    website: fields.website || undefined,
    location: fields.location || undefined,
    linkedinUrl: fields.linkedin || undefined,
    email: fields.email || undefined,
  };
}

function patchContactBounty({
  contact,
  contactId,
  amount,
}: {
  contact: AnyType;
  contactId: string;
  amount: number;
}): AnyType {
  return String(contact.id) === contactId
    ? { ...contact, bountyAmount: amount, bounty_amount: amount }
    : contact;
}

function mergeEnrichedDetailsIntoContact({
  contact,
  originalId,
  enrichedId,
  details,
}: {
  contact: AnyType;
  originalId: string;
  enrichedId: string;
  details: AnyType;
}): AnyType {
  if (String(contact.id) !== originalId && String(contact.id) !== enrichedId) {
    return contact;
  }

  const bountyAmount =
    details.bountyAmount != null
      ? Number(details.bountyAmount)
      : contact.bountyAmount;

  return {
    ...contact,
    id: enrichedId,
    firstName: details.firstName ?? contact.firstName,
    lastName: details.lastName ?? contact.lastName,
    title: details.title ?? contact.title,
    company: details.company ?? contact.company,
    city: details.city ?? contact.city,
    state: details.state ?? contact.state,
    country: details.country ?? contact.country,
    linkedin: details.linkedin ?? contact.linkedin,
    website: details.website ?? contact.website,
    industry: details.industry ?? contact.industry,
    companyDescription:
      details.companyDescription ?? contact.companyDescription,
    companyDomain: details.companyDomain ?? contact.companyDomain,
    companyIndustry: details.companyIndustry ?? contact.companyIndustry,
    companyLinkedinUrl:
      details.companyLinkedinUrl ?? contact.companyLinkedinUrl,
    companyType: details.companyType ?? contact.companyType,
    employees: details.employees ?? contact.employees,
    linkedinConnections:
      details.linkedinConnections ?? contact.linkedinConnections,
    profilePhotoUrl: details.profilePhotoUrl ?? contact.profilePhotoUrl,
    bountyAmount,
    enrichmentStatus: "completed",
    source: "contacts",
    hasEmail: details.hasEmail ?? contact.hasEmail,
    potentialConnectorCount:
      details.connectorCount ?? contact.potentialConnectorCount,
  };
}

function patchContactEnrichment({
  contact,
  originalId,
  enrichedId,
  details,
}: {
  contact: AnyType;
  originalId: string;
  enrichedId: string;
  details: AnyType;
}): AnyType {
  return mergeEnrichedDetailsIntoContact({
    contact,
    originalId,
    enrichedId,
    details,
  });
}

function updateProspectPagesBounty({
  oldData,
  contactId,
  amount,
}: {
  oldData: AnyType;
  contactId: string;
  amount: number;
}): AnyType {
  if (!oldData?.pages) return oldData;
  return {
    ...oldData,
    pages: oldData.pages.map((page: AnyType) => ({
      ...page,
      contacts: page.contacts.map((contact: AnyType) =>
        patchContactBounty({ contact, contactId, amount })
      ),
    })),
  };
}

function updateProspectPagesEnrichment({
  oldData,
  originalId,
  enrichedId,
  details,
}: {
  oldData: AnyType;
  originalId: string;
  enrichedId: string;
  details: AnyType;
}): AnyType {
  if (!oldData?.pages) return oldData;
  return {
    ...oldData,
    pages: oldData.pages.map((page: AnyType) => ({
      ...page,
      contacts: page.contacts.map((contact: AnyType) =>
        patchContactEnrichment({ contact, originalId, enrichedId, details })
      ),
    })),
  };
}

function ProspectCardSkeleton() {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
    </Card>
  );
}

export default function ProspectHub() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const {
    hasCalendarConnected: hasCalendar,
    hasPendingFeedback,
    pendingFeedbackCount,
    loading: isLoadingEligibility,
  } = useRequesterEligibility();
  const { openModal: openCalendarModal, modal: calendarConnectModal } =
    useCalendarConnectModal("/prospecting/find-prospects");

  // Search fields
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileTitle, setProfileTitle] = useState("");
  const [profileCompany, setProfileCompany] = useState("");
  const [profileWebsite, setProfileWebsite] = useState("");
  const [profileLocation, setProfileLocation] = useState("");

  // Search trigger state — null until user clicks Search
  const [searchParams, setSearchParams] = useState<{
    name?: string;
    title?: string;
    company?: string;
    website?: string;
    location?: string;
    linkedinUrl?: string;
    email?: string;
  } | null>(null);

  // Dialog state
  const [selectedContact, setSelectedContact] = useState<AnyType>(null);
  const [loadingContactId, setLoadingContactId] = useState<string | null>(null);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  const urlHydratedRef = useRef(false);

  // Search panel ref — drives the compact sticky summary bar visibility
  const searchPanelRef = useRef<HTMLDivElement>(null);

  // Scroll to top button
  const [showScrollTop, setShowScrollTop] = useState(false);
  // Compact sticky filter-summary bar (shown once the panel scrolls away)
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 800);
      const panel = searchPanelRef.current;
      setShowStickyBar(!!panel && panel.getBoundingClientRect().bottom < 120);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Search hook
  const {
    contacts: rawContacts,
    pageCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
  } = useProspectSearch({
    ...searchParams,
    limit: 50,
    enabled: !!searchParams,
    engine: useTypesense ? "typesense" : "global",
  });

  // Transform contacts from API format to display format
  const webResults = useMemo(
    () =>
      rawContacts.map((contact: AnyType) => ({
        id: contact.id,
        source: contact.source,
        name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
        first_name: contact.firstName,
        last_name: contact.lastName,
        title: contact.title,
        company: contact.company,
        email: null,
        linkedin: contact.linkedin,
        website: contact.website,
        industry: contact.industry,
        city: contact.city,
        state: contact.state,
        country: contact.country,
        location: [contact.city, contact.state, contact.country]
          .filter(Boolean)
          .join(", "),
        company_description: contact.companyDescription,
        company_type: contact.companyType,
        company_domain: contact.companyDomain,
        company_industry: contact.companyIndustry,
        company_linkedin_url: contact.companyLinkedinUrl,
        linkedin_connections: contact.linkedinConnections,
        employees:
          contact.employees || contact.companySize || contact.company_employees,
        bountyAmount: contact.bountyAmount || 0,
        bounty_amount: contact.bountyAmount || 0,
        connectorCount: contact.potentialConnectorCount || 0,
        profile_photo_url: contact.profilePhotoUrl,
        hasEmail: contact.hasEmail ?? false,
        enrichmentStatus: contact.enrichmentStatus || null,
      })),
    [rawContacts]
  );

  const hasSearched = !!searchParams;

  // Read-only chips for the compact sticky summary bar (from applied search)
  const appliedFilters = useMemo(() => {
    if (!searchParams) return [];
    const labelMap: Record<string, string> = {
      name: "Name",
      title: "Title",
      company: "Company",
      website: "Website",
      location: "Location",
      linkedinUrl: "LinkedIn",
      email: "Email",
    };
    return Object.entries(labelMap)
      .map(([key, label]) => ({
        label,
        value: (searchParams as Record<string, string | undefined>)[key],
      }))
      .filter((f) => !!f.value);
  }, [searchParams]);

  // Validation helpers
  const isValidLinkedinInput = useCallback((input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return false;
    if (
      trimmed.toLowerCase().includes("linkedin.com/in/") ||
      trimmed.toLowerCase().includes("linkedin.com/company/")
    )
      return true;
    const usernamePattern = /^[a-zA-Z0-9-]{2,}$/;
    return usernamePattern.test(trimmed);
  }, []);

  const hasName = profileName.trim().length >= 2;
  const hasEmail = profileEmail.trim().includes("@");
  const hasTitle = profileTitle.trim().length >= 2;
  const hasCompany = profileCompany.trim().length >= 2;
  const hasWebsite = profileWebsite.trim().includes(".");
  const hasLocation = profileLocation.trim().length >= 2;
  const isLinkedinSearchValid =
    linkedinUrl.trim() && isValidLinkedinInput(linkedinUrl);
  const filledFieldCount = [
    hasName,
    hasTitle,
    hasCompany,
    hasWebsite,
    hasLocation,
  ].filter(Boolean).length;
  const isProfileSearchValid = useTypesense
    ? filledFieldCount >= 1
    : hasName && (hasEmail || hasCompany || hasWebsite);

  // Unified validation: LinkedIn URL OR (Name + Email/Company/Website)
  const isSearchValid = () => {
    if (!useTypesense && isLinkedinSearchValid) return true;
    if (isProfileSearchValid) return true;
    return false;
  };

  const getSearchHint = () => {
    // If LinkedIn URL is valid, ready to search (database path only)
    if (!useTypesense && isLinkedinSearchValid) {
      return {
        message: "Ready to search with LinkedIn profile",
        type: "success" as const,
      };
    }

    // If LinkedIn URL is provided but invalid (database path only)
    if (
      !useTypesense &&
      linkedinUrl.trim() &&
      !isValidLinkedinInput(linkedinUrl)
    ) {
      return {
        message: "Please enter a valid LinkedIn URL or username",
        type: "warning" as const,
      };
    }

    // Typesense path — at least 1 field required
    if (useTypesense) {
      if (filledFieldCount >= 1) {
        return {
          message: "Ready to search with profile details",
          type: "success" as const,
        };
      }
      return null;
    }

    // Non-typesense profile search validation
    if (!hasName) {
      return {
        message:
          "Enter a LinkedIn URL, or provide name with email/company/website",
        type: "info" as const,
      };
    }

    if (hasName && !hasEmail && !hasCompany && !hasWebsite) {
      return {
        message: "Add email, company, or website along with the name to search",
        type: "warning" as const,
      };
    }

    if (isProfileSearchValid) {
      return {
        message: "Ready to search with profile details",
        type: "success" as const,
      };
    }

    return {
      message: "Enter search criteria above",
      type: "info" as const,
    };
  };

  const handleWebSearch = useCallback(() => {
    const linkedinValue = linkedinUrl.trim();
    const nameValue = profileName.trim();
    const emailValue = profileEmail.trim();
    const companyValue = profileCompany.trim();
    const websiteValue = profileWebsite.trim();
    const titleValue = profileTitle.trim();
    const locationValue = profileLocation.trim();

    const isLinkedinValid =
      !!linkedinValue && isValidLinkedinInput(linkedinValue);
    const hasNameValue = nameValue.length >= 2;
    const hasEmailValue = emailValue.includes("@");
    const hasCompanyValue = companyValue.length >= 2;
    const hasWebsiteValue = websiteValue.includes(".");
    const hasLocationValue = locationValue.length >= 2;
    const filledCount = [
      hasNameValue,
      titleValue.length >= 2,
      hasCompanyValue,
      hasWebsiteValue,
      hasLocationValue,
    ].filter(Boolean).length;
    const isProfileValid = useTypesense
      ? filledCount >= 1
      : hasNameValue && (hasEmailValue || hasCompanyValue || hasWebsiteValue);
    const canSearch = (!useTypesense && isLinkedinValid) || isProfileValid;

    if (!canSearch) {
      if (linkedinValue && !isValidLinkedinInput(linkedinValue)) {
        toast({
          title: "Invalid LinkedIn URL",
          description: "Please enter a valid LinkedIn profile URL or username.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Incomplete Search",
          description:
            "Please provide a LinkedIn URL, or name with email/company/website.",
          variant: "destructive",
        });
      }
      return;
    }

    analytics.trackProspectSearch({
      searchType: linkedinValue ? "linkedin" : "profile",
      hasLinkedinUrl: !!linkedinValue,
      hasName: !!nameValue,
      hasEmail: !!emailValue,
      hasCompany: !!companyValue,
      hasWebsite: !!websiteValue,
      hasLocation: !!locationValue,
    });

    const activeFields: ProspectSearchFields = {
      name: nameValue,
      title: titleValue,
      company: companyValue,
      website: websiteValue,
      location: locationValue,
      linkedin: linkedinValue,
      email: emailValue,
    };

    setSearchParams(toAppliedSearchParams(activeFields));
    setUrlSearchParams(buildProspectSearchUrlParams(activeFields), {
      replace: true,
    });
  }, [
    isValidLinkedinInput,
    linkedinUrl,
    profileCompany,
    profileEmail,
    profileLocation,
    profileName,
    profileTitle,
    profileWebsite,
    setUrlSearchParams,
    toast,
  ]);

  const handleClearSearch = useCallback(() => {
    setLinkedinUrl("");
    setProfileName("");
    setProfileEmail("");
    setProfileTitle("");
    setProfileCompany("");
    setProfileWebsite("");
    setProfileLocation("");
    setSearchParams(null);
    setUrlSearchParams(new URLSearchParams(), { replace: true });
  }, [setUrlSearchParams]);

  useEffect(() => {
    if (urlHydratedRef.current) return;
    urlHydratedRef.current = true;

    const fields = readProspectSearchFieldsFromUrl(
      new URLSearchParams(window.location.search)
    );
    if (!hasProspectSearchFields(fields)) return;

    setProfileName(fields.name);
    setProfileTitle(fields.title);
    setProfileCompany(fields.company);
    setProfileWebsite(fields.website);
    setProfileLocation(fields.location);
    setLinkedinUrl(fields.linkedin);
    setProfileEmail(fields.email);
    // Fields only — API runs when user clicks Search Prospects.
  }, []);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isLoading
        ) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const handleRequestToMeet = (prospect: AnyType) => {
    setLoadingContactId(prospect.id);
    setSelectedContact(prospect);
  };

  const handleDialogClose = () => {
    setSelectedContact(null);
    setLoadingContactId(null);
  };

  const prospectSearchQueryKey = useMemo(
    () =>
      getProspectSearchQueryKey({
        ...searchParams,
        limit: 50,
        engine: useTypesense ? "typesense" : "global",
      }),
    [searchParams]
  );

  const handleDialogReady = () => {
    setLoadingContactId(null);
  };

  const handleBountyCalculated = useCallback(
    (contactId: string, amount: number) => {
      queryClient.setQueryData(prospectSearchQueryKey, (oldData: AnyType) =>
        updateProspectPagesBounty({ oldData, contactId, amount })
      );
      setSelectedContact((prev: AnyType) =>
        prev && String(prev.id) === contactId
          ? { ...prev, bountyAmount: amount, bounty_amount: amount }
          : prev
      );
    },
    [prospectSearchQueryKey, queryClient]
  );

  const handleProspectEnriched = useCallback(
    (originalId: string, enrichedId: string, details: AnyType) => {
      queryClient.setQueryData(prospectSearchQueryKey, (oldData: AnyType) =>
        updateProspectPagesEnrichment({
          oldData,
          originalId,
          enrichedId,
          details,
        })
      );
    },
    [prospectSearchQueryKey, queryClient]
  );

  return (
    <div className="min-w-0 w-full">
      <SEO
        title="Find Prospects | Prospectly"
        description="Search and discover prospects to request introductions"
      />
      <div className="mx-4 sm:mx-6 lg:mx-7 py-6 space-y-5">
        {/* Page head */}
        <div className="mb-1">
          <h1 className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-brand-gradient">
            Find Prospects
          </h1>
          <p className="text-[14px] text-muted-foreground mt-[5px]">
            Search and discover prospects to request introductions
          </p>
        </div>

        {!isLoadingEligibility && !hasCalendar && (
          <Alert className="border-brand-warning/40 bg-brand-warning/10">
            <AlertCircle className="h-4 w-4 text-brand-warning" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">
                  Calendar Not Connected
                </p>
                <p className="text-sm text-muted-foreground">
                  Connect your calendar to send introduction requests.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => openCalendarModal()}
                className="w-full sm:w-auto"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Connect Now
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {hasPendingFeedback && (
          <Alert className="border-brand-destructive/50 bg-brand-destructive/10">
            <AlertCircle className="h-4 w-4 text-brand-destructive" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">
                  Pending Feedback Required
                </p>
                <p className="text-sm text-muted-foreground">
                  You have {pendingFeedbackCount} introduction
                  {pendingFeedbackCount > 1 ? "s" : ""} waiting for feedback.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  navigate("/prospecting/my-prospects/open-request")
                }
                className="w-full sm:w-auto bg-brand-destructive text-brand-foreground hover:bg-brand-destructive/90"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Complete Now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div ref={searchPanelRef}>
          {useTypesense ? (
            <SearchMethodsTypesense
              profileName={profileName}
              setProfileName={setProfileName}
              profileTitle={profileTitle}
              setProfileTitle={setProfileTitle}
              profileCompany={profileCompany}
              setProfileCompany={setProfileCompany}
              profileWebsite={profileWebsite}
              setProfileWebsite={setProfileWebsite}
              profileLocation={profileLocation}
              setProfileLocation={setProfileLocation}
              isSearching={isLoading}
              isSearchValid={isSearchValid()}
              searchHint={getSearchHint()}
              hasName={hasName}
              hasTitle={hasTitle}
              hasCompany={hasCompany}
              hasWebsite={hasWebsite}
              hasLocation={hasLocation}
              onSearch={handleWebSearch}
              onClear={handleClearSearch}
            />
          ) : (
            <SearchMethods
              linkedinUrl={linkedinUrl}
              setLinkedinUrl={setLinkedinUrl}
              profileName={profileName}
              setProfileName={setProfileName}
              profileEmail={profileEmail}
              setProfileEmail={setProfileEmail}
              profileCompany={profileCompany}
              setProfileCompany={setProfileCompany}
              profileWebsite={profileWebsite}
              setProfileWebsite={setProfileWebsite}
              isSearching={isLoading}
              isSearchValid={isSearchValid()}
              isValidLinkedinInput={isValidLinkedinInput}
              searchHint={getSearchHint()}
              hasName={hasName}
              hasEmail={hasEmail}
              hasCompany={hasCompany}
              hasWebsite={hasWebsite}
              onSearch={handleWebSearch}
              onClear={handleClearSearch}
            />
          )}
        </div>

        {/* Compact sticky summary bar — read-only applied filters */}
        {hasSearched && appliedFilters.length > 0 && (
          <div
            className={cn(
              "sticky top-2 z-[15] transition-all duration-300",
              showStickyBar
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden"
            )}
          >
            <div className="flex items-center gap-3 flex-wrap rounded-xl border border-border bg-card/90 backdrop-blur shadow-brand-card px-4 py-3">
              <div className="grid place-items-center h-8 w-8 rounded-lg bg-brand-amethyst/10 text-brand-amethyst shrink-0">
                <Search className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <span className="hidden sm:inline text-xs font-bold text-muted-foreground whitespace-nowrap">
                  Searching for
                </span>
                {appliedFilters.map((f) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-brand-amethyst/10 text-brand-amethyst"
                  >
                    <span className="text-[9.5px] font-extrabold uppercase tracking-wide opacity-65">
                      {f.label}
                    </span>
                    <span className="truncate max-w-[160px]">{f.value}</span>
                  </span>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="shrink-0 border-brand-amethyst/30 text-brand-amethyst hover:bg-brand-amethyst/10"
              >
                <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Edit search</span>
              </Button>
            </div>
          </div>
        )}

        {/* Initial loading — skeleton cards */}
        {isLoading && (
          <div
            className={cn(
              "grid gap-4",
              "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            )}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <ProspectCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state after search */}
        {!isLoading && webResults.length === 0 && hasSearched && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-amethyst/10 mb-4">
              <Target className="h-8 w-8 text-brand-amethyst" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No prospects found</h3>
            <p className="text-muted-foreground mb-2 max-w-md mx-auto">
              Try adjusting your search criteria.
            </p>
          </div>
        )}

        {/* Results grid — skeletons render inside the same grid to fill the row */}
        {!isLoading && webResults.length > 0 && (
          <>
            <div
              className={cn(
                "grid gap-6",
                "grid-cols-[repeat(auto-fill,_minmax(300px,1fr))]"
              )}
            >
              {webResults.map((prospect: AnyType) => (
                <ProspectCard
                  key={prospect.id}
                  prospect={prospect}
                  onRequestToMeet={handleRequestToMeet}
                  isLoading={loadingContactId === prospect.id}
                  isDisabled={
                    loadingContactId !== null &&
                    loadingContactId !== prospect.id
                  }
                />
              ))}
              {/* Loading next page — skeleton cards inside the same grid */}
              {isFetchingNextPage &&
                Array.from({ length: 3 }).map((_, i) => (
                  <ProspectCardSkeleton key={`loading-${i}`} />
                ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* End of results — only show after user has scrolled past first page */}
            {!hasNextPage && !isFetchingNextPage && pageCount > 1 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                You've reached the end of results
              </p>
            )}

            {/* Error during scroll — retry button */}
            {isError && (
              <div className="flex flex-col items-center gap-2 py-6">
                <p className="text-sm text-muted-foreground">
                  Something went wrong loading more results.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                >
                  Retry
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedContact && (
        <ContactProfileModal
          isOpen={!!selectedContact}
          onClose={handleDialogClose}
          contact={selectedContact}
          defaultBountyAmount={selectedContact.bounty_amount || 0}
          onDialogReady={handleDialogReady}
          onBountyCalculated={handleBountyCalculated}
          onProspectEnriched={handleProspectEnriched}
        />
      )}

      {calendarConnectModal}

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-30 h-10 w-10 rounded-full bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all duration-200 hover:scale-110 hover:shadow-brand-cta-lg flex items-center justify-center"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
