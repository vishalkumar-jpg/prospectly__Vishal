import { InviteTextEditor } from "@/components/InviteTextEditor";
import { useState, useEffect, useRef, useMemo } from "react";
import { ContactUploadEducationOverlay } from "@/components/ContactUploadEducationOverlay";

import { EditContactDialog } from "@/components/EditContactDialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader } from "@/components/ui/loader";
import {
  useSecureContacts,
  type ContactsListSortBy,
  type MaskedContact,
} from "@/hooks/useSecureContacts";
import SEO from "@/components/SEO";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { RouteSearchInput } from "@/components/ui/route-search-input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getSourceLogo } from "@/components/contacts/source-logos";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { ResponsivePagination } from "@/components/ui/responsive-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  ChevronUp,
  ChevronDown,
  Search,
  UserX,
  Shield,
  Plus,
  Trash2,
  Upload,
  Users,
  Zap,
  MailPlus,
  Trophy,
  DollarSign,
  Linkedin,
  Mail,
  Building2,
  Globe,
  Pencil,
  X,
  // CheckSquare,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { PAYOUT_COUNTRIES } from "@/lib/stripe-connect";
import { Link } from "react-router-dom";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { toUTC } from "@/lib/dayjs";
import api from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { InvitedUsersTable } from "@/components/contacts/InvitedUsersTable";
import { useInvitedUsers } from "@/hooks/useInvitedUsers";
import { useRouteTab } from "@/hooks/useRouteTab";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { MY_CONTACTS_TABS, TAB_ROUTE_BASES } from "@/lib/tab-routes";

interface InviteResultItem {
  email: string;
  inviteLink?: string;
  error?: string;
}

interface UserOrganization {
  id?: string;
  organisationId?: string;
  name: string;
}

interface LeaderPermission {
  id: string;
  userId: string;
  organisationId: string;
  allowedPlanIds?: string[];
  maxInvitesPerMonth: number | null;
  invitesUsedThisMonth: number;
  organisation?: {
    name: string;
  };
}

interface GenerateInvitesParams {
  contactIds: string[];
  planId: string;
  organisationId?: string;
  inviteText?: string;
  customHtml?: string;
  country: string;
}

const mockOptedOutContacts = [
  {
    name: "Riley Chen",
    company: "Initech",
    email: "riley.chen@initech.io",
    optedOutDate: "2024-01-15",
    reason: "Unsubscribed from email campaign",
  },
  {
    name: "Alex Morgan",
    company: "SpamCorp",
    email: "alex@spamcorp.com",
    optedOutDate: "2024-01-12",
    reason: "Requested no further contact",
  },
];

const mockDoNotContactDomains = [
  {
    domain: "spamcorp.com",
    dateAdded: "2024-01-10",
    addedBy: "System",
    reason: "High bounce rate",
    type: "general",
  },
  {
    domain: "blockedcompany.com",
    dateAdded: "2024-01-08",
    addedBy: "Admin",
    reason: "Legal request",
    type: "general",
  },
];

function normalizeSource(source: string): string {
  const sourceMap: Record<string, string> = {
    google_import: "Google",
    csv_import: "CSV",
    linkedin_import: "LinkedIn",
    microsoft_import: "Microsoft",
    microsoft: "Microsoft",
    apple_import: "Apple",
    icloud_import: "Apple",
    manual: "Manual",
    api: "API",
  };
  return sourceMap[source.toLowerCase()] || source;
}

function getSourceBadgeClassName(source: string): string {
  const key = source.toLowerCase();
  if (
    key.includes("google") ||
    key.includes("linkedin") ||
    key.includes("microsoft") ||
    key.includes("apple") ||
    key.includes("icloud")
  ) {
    return "bg-muted/60 text-foreground";
  }
  if (key.includes("recruit")) {
    return "bg-brand-warning/10 text-brand-warning";
  }
  if (key.includes("csv")) return "bg-brand-success/10 text-brand-success";
  if (key.includes("api")) return "bg-brand-success/10 text-brand-success";
  return "bg-muted text-muted-foreground";
}

function getEnrichmentStatusClassName(status?: string): string {
  if (!status) {
    return "bg-slate-500/15 text-slate-700 hover:bg-slate-700 hover:text-slate-50 dark:text-slate-400 border-slate-500/30";
  }
  switch (status.toLowerCase()) {
    case "completed":
    case "success":
      return "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-50 dark:text-emerald-400 border-emerald-500/30";
    case "pending":
    case "processing":
    case "queued":
      return "bg-amber-500/15 text-amber-700 hover:bg-amber-700 hover:text-amber-50 dark:text-amber-400 border-amber-500/30";
    case "in_progress":
      return "bg-blue-500/15 text-blue-700 hover:bg-blue-700 hover:text-blue-50 dark:text-blue-400 border-blue-500/30";
    case "failed":
    case "error":
      return "bg-red-500/15 text-red-700 hover:bg-red-700 hover:text-red-50 dark:text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/15 text-slate-700 hover:bg-slate-700 hover:text-slate-50 dark:text-slate-400 border-slate-500/30";
  }
}

function getBountyStatusClassName(status?: string): string {
  if (!status) {
    return "bg-slate-500/15 text-slate-700 hover:bg-slate-700 hover:text-slate-50 dark:text-slate-400 border-slate-500/30";
  }
  switch (status.toLowerCase()) {
    case "awarded":
    case "paid":
    case "completed":
      return "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-50 dark:text-emerald-400 border-emerald-500/30";
    case "pending":
    case "processing":
      return "bg-amber-500/15 text-amber-700 hover:bg-amber-700 hover:text-amber-50 dark:text-amber-400 border-amber-500/30";
    case "in_progress":
      return "bg-blue-500/15 text-blue-700 hover:bg-blue-700 hover:text-blue-50 dark:text-blue-400 border-blue-500/30";
    case "failed":
    case "rejected":
      return "bg-red-500/15 text-red-700 hover:bg-red-700 hover:text-red-50 dark:text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/15 text-slate-700 hover:bg-slate-700 hover:text-slate-50 dark:text-slate-400 border-slate-500/30";
  }
}

function formatContactStatus(status?: string) {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getContactsSortIcon({
  field,
  sortState,
}: {
  field: ContactsListSortBy;
  sortState: {
    sortBy: ContactsListSortBy;
    sortDir: "asc" | "desc" | "default";
  };
}) {
  const { sortBy, sortDir } = sortState;
  const neutralChevrons = () => (
    <span
      className="inline-flex flex-col items-center justify-center leading-none text-muted-foreground opacity-50"
      aria-hidden
    >
      <ChevronUp className="h-3 w-3 shrink-0" />
      <ChevronDown className="h-3 w-3 shrink-0 -mt-1" />
    </span>
  );

  if (sortDir === "default") {
    if (field === "updatedAt") {
      return <ChevronDown className="h-4 w-4 text-primary" />;
    }
    return neutralChevrons();
  }
  if (sortBy !== field) {
    return neutralChevrons();
  }
  return sortDir === "asc" ? (
    <ChevronUp className="h-4 w-4 text-primary" />
  ) : (
    <ChevronDown className="h-4 w-4 text-primary" />
  );
}

function validateInviteConfirmation({
  selectedContactsCount,
  selectedPlanId,
  isFreePlan,
  selectedOrgId,
  selectedCountry,
}: {
  selectedContactsCount: number;
  selectedPlanId: string;
  isFreePlan: boolean;
  selectedOrgId: string;
  selectedCountry: string;
}): { title: string; description: string } | null {
  if (selectedContactsCount === 0) return null;
  if (!selectedPlanId) {
    return {
      title: "Plan Required",
      description: "Please select an invitation plan.",
    };
  }
  if (!isFreePlan && (!selectedOrgId || selectedOrgId === "none")) {
    return {
      title: "Organization Required",
      description: "Please select an organization for paid invitation plans.",
    };
  }
  if (!selectedCountry) {
    return {
      title: "Country Required",
      description: "Please select a country for the invited users.",
    };
  }
  return null;
}

function buildGenerateInvitesPayload({
  selectedContacts,
  selectedPlanId,
  selectedOrgId,
  inviteText,
  selectedCountry,
}: {
  selectedContacts: { id: string }[];
  selectedPlanId: string;
  selectedOrgId: string;
  inviteText: string;
  selectedCountry: string;
}): GenerateInvitesParams {
  const payload: GenerateInvitesParams = {
    contactIds: selectedContacts.map((c) => String(c.id)),
    planId: selectedPlanId,
    country: selectedCountry,
  };
  if (selectedOrgId && selectedOrgId !== "none") {
    payload.organisationId = selectedOrgId;
  }
  const trimmedText = inviteText.trim();
  if (trimmedText) {
    payload.inviteText = trimmedText;
  }
  return payload;
}

type InvitePlanLike = {
  id: string;
  isFree?: boolean;
  type?: string;
  tier?: string;
  name?: string;
};

function isSubscriptionPlanFree(plan: InvitePlanLike): boolean {
  if (typeof plan.isFree === "boolean") return plan.isFree;
  if (plan.type === "free") return true;
  if (plan.tier === "free") return true;
  return plan.name?.toLowerCase().includes("free") ?? true;
}

function filterOrgsForInvitePlan({
  userOrgs,
  leaderPerms,
  selectedPlanId,
  isFreePlan,
}: {
  userOrgs: UserOrganization[];
  leaderPerms: LeaderPermission[];
  selectedPlanId: string;
  isFreePlan: boolean;
}) {
  if (isFreePlan) {
    return userOrgs.map((org) => ({
      id: org.id || org.organisationId,
      name: org.name,
    }));
  }
  return userOrgs
    .filter((org) => {
      const orgId = org.id || org.organisationId;
      return leaderPerms.some(
        (p) =>
          p.organisationId === orgId &&
          p.allowedPlanIds?.includes(selectedPlanId)
      );
    })
    .map((org) => ({
      id: org.id || org.organisationId,
      name: org.name,
    }));
}

function getDesiredOrgIdForInvite({
  isFreePlan,
  filteredOrgs,
}: {
  isFreePlan: boolean;
  filteredOrgs: { id: string }[];
}): string {
  if (isFreePlan) return "none";
  if (filteredOrgs.length > 0) return filteredOrgs[0].id;
  return "";
}

function isOrgValidForInvite({
  isFreePlan,
  selectedOrgId,
  filteredOrgs,
}: {
  isFreePlan: boolean;
  selectedOrgId: string;
  filteredOrgs: { id: string }[];
}): boolean {
  if (isFreePlan && selectedOrgId === "none") return true;
  return filteredOrgs.some((item) => item.id === selectedOrgId);
}

function filterInvitePlanItems({
  plans,
  leaderPerms,
}: {
  plans: InvitePlanLike[];
  leaderPerms: LeaderPermission[];
}) {
  return plans
    .filter((plan) => {
      if (isSubscriptionPlanFree(plan)) return true;
      return leaderPerms.some((perm) => perm.allowedPlanIds?.includes(plan.id));
    })
    .map((plan) => ({ id: plan.id, name: plan.name ?? "" }));
}

function getRemainingInvitesDisplay({
  isFreePlan,
  leaderPerms,
  selectedOrgId,
}: {
  isFreePlan: boolean;
  leaderPerms: LeaderPermission[];
  selectedOrgId: string;
}): string | number | null {
  if (isFreePlan) return "Unlimited";
  const selectedPerm = leaderPerms.find(
    (lp) => lp.organisationId === selectedOrgId
  );
  if (selectedOrgId === "none" || !selectedPerm) return null;
  if (selectedPerm.maxInvitesPerMonth === null) return "Unlimited";
  return Math.max(
    0,
    selectedPerm.maxInvitesPerMonth - selectedPerm.invitesUsedThisMonth
  );
}

function useContactsInviteDialog(isInviteDialogOpen: boolean) {
  const [inviteText, setInviteText] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("none");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const hasSetInitialPlan = useRef(false);

  useEffect(() => {
    if (!isInviteDialogOpen) setSelectedCountry("");
  }, [isInviteDialogOpen]);

  const { data: plansData } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.subscriptions.getPlans(),
    enabled: isInviteDialogOpen,
  });
  const plans = useMemo(() => plansData?.plans || [], [plansData?.plans]);

  const { data: userOrgs = [], isLoading: isOrgsLoading } = useQuery({
    queryKey: ["/api/profiles/me/organizations"],
    queryFn: () => api.profiles.getOrganizations(),
    enabled: isInviteDialogOpen,
  });

  const { data: leaderPerms, isLoading: leaderPermsLoading } = useQuery({
    queryKey: ["leader-permissions"],
    queryFn: () => api.invites.getLeaderPermissions(),
    enabled: isInviteDialogOpen,
  });

  const permissions = useMemo(
    () => (Array.isArray(leaderPerms) ? leaderPerms : []) as LeaderPermission[],
    [leaderPerms]
  );

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId),
    [plans, selectedPlanId]
  );

  const isFreePlan = useMemo(
    () =>
      selectedPlan
        ? isSubscriptionPlanFree(selectedPlan as InvitePlanLike)
        : true,
    [selectedPlan]
  );

  const filteredOrgs = useMemo(
    () =>
      filterOrgsForInvitePlan({
        userOrgs,
        leaderPerms: permissions,
        selectedPlanId,
        isFreePlan,
      }),
    [userOrgs, permissions, selectedPlanId, isFreePlan]
  );

  const orgItems = useMemo(() => {
    const allItems = [...filteredOrgs];
    if (isFreePlan) {
      allItems.unshift({ id: "none", name: "None (No Organization)" });
    }
    if (!orgSearch.trim()) return allItems;
    return allItems.filter((org) =>
      org.name.toLowerCase().includes(orgSearch.toLowerCase())
    );
  }, [filteredOrgs, orgSearch, isFreePlan]);

  const planItems = useMemo(
    () =>
      filterInvitePlanItems({
        plans: plans as InvitePlanLike[],
        leaderPerms: permissions,
      }),
    [plans, permissions]
  );

  const remainingInvitesDisplay = useMemo(
    () =>
      getRemainingInvitesDisplay({
        isFreePlan,
        leaderPerms: permissions,
        selectedOrgId,
      }),
    [isFreePlan, permissions, selectedOrgId]
  );

  useEffect(() => {
    if (!selectedPlanId || isOrgsLoading || leaderPermsLoading) return;
    setOrgSearch("");
    const isValid = isOrgValidForInvite({
      isFreePlan,
      selectedOrgId,
      filteredOrgs,
    });
    if (isValid) return;
    const desiredId = getDesiredOrgIdForInvite({ isFreePlan, filteredOrgs });
    if (selectedOrgId !== desiredId) setSelectedOrgId(desiredId);
  }, [
    selectedPlanId,
    isFreePlan,
    filteredOrgs,
    isOrgsLoading,
    leaderPermsLoading,
    selectedOrgId,
  ]);

  useEffect(() => {
    if (plans.length === 0 || leaderPermsLoading || hasSetInitialPlan.current) {
      return;
    }
    const freePlan = plans.find((p) => p.name.toLowerCase().includes("free"));
    if (freePlan) {
      setSelectedPlanId(freePlan.id);
      setSelectedOrgId("none");
    } else if (plans.length > 0) {
      setSelectedPlanId(plans[0].id);
    }
    hasSetInitialPlan.current = true;
  }, [plans, leaderPermsLoading]);

  return {
    inviteText,
    setInviteText,
    selectedPlanId,
    setSelectedPlanId,
    selectedOrgId,
    setSelectedOrgId,
    selectedCountry,
    setSelectedCountry,
    orgSearch,
    setOrgSearch,
    isFreePlan,
    orgItems,
    planItems,
    remainingInvitesDisplay,
    leaderPerms: permissions,
    leaderPermsLoading,
    isOrgsLoading,
  };
}

function showInviteResultToasts({
  results,
  toast,
}: {
  results: InviteResultItem[];
  toast: typeof import("@/hooks/use-toast").toast;
}) {
  const successful = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;

  if (failed > 0) {
    toast({
      variant: failed === results.length ? "destructive" : "default",
      title:
        failed === results.length
          ? "Invitation Failed"
          : "Invitations Partially Sent",
      description: `Sent ${successful} invitations successfully. ${failed} contacts failed (e.g., decryption errors).`,
    });
    return;
  }

  toast({
    title: "Invitations Sent Successfully",
    description: `Sent invitations to ${successful} contacts. They will receive an email shortly.`,
  });
}

function ContactsHero({ currentView }: { currentView: string }) {
  const isInvited = currentView === "invited";
  return (
    <PageHeader
      title={
        isInvited
          ? "Invited Users — track your invites at a glance."
          : "My Contacts — your professional network at a glance."
      }
      description={
        isInvited
          ? "Track your networking invites and their onboarding status."
          : "Manage your professional contact network and discover introduction opportunities."
      }
    />
  );
}

async function runContactsPageRefresh({
  currentView,
  refetchReferralProgress,
  refetch,
  setIsRefreshing,
}: {
  currentView: string;
  refetchReferralProgress: (opts?: {
    throwOnError?: boolean;
  }) => Promise<unknown>;
  refetch: (
    page: number,
    limit: number,
    search?: string,
    opts?: { throwOnError?: boolean }
  ) => Promise<unknown>;
  setIsRefreshing: (v: boolean) => void;
}) {
  setIsRefreshing(true);
  try {
    if (currentView === "invited") {
      await refetchReferralProgress({ throwOnError: true });
    } else {
      await refetch(1, 10, undefined, { throwOnError: true });
    }
    toast({
      title: "Refreshed",
      description: "Data has been updated.",
    });
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Refresh failed",
      description: error instanceof Error ? error.message : "Refresh failed",
    });
  } finally {
    setTimeout(() => setIsRefreshing(false), 500);
  }
}

function applyContactsSelectAllToggle({
  sortedContacts,
  selectedContacts,
}: {
  sortedContacts: MaskedContact[];
  selectedContacts: { id: string; email: string; name: string }[];
}): { id: string; email: string; name: string }[] {
  const activeContacts = sortedContacts.filter(
    (c) => !c.optedOut && (c.email || c.email_masked)
  );
  const allSelectedOnPage =
    activeContacts.length > 0 &&
    activeContacts.every((c) => selectedContacts.some((s) => s.id === c.id));

  if (allSelectedOnPage) {
    return selectedContacts.filter(
      (s) => !activeContacts.some((ac) => ac.id === s.id)
    );
  }

  const newSelection = [...selectedContacts];
  activeContacts.forEach((c) => {
    if (!newSelection.some((s) => s.id === c.id)) {
      newSelection.push({
        id: c.id,
        email: c.email || c.email_masked,
        name: c.name,
      });
    }
  });
  return newSelection;
}

type ContactsConfirmInviteDialogPanelProps = {
  isSending: boolean;
  selectedContacts: { id: string; email: string; name: string }[];
  isFreePlan: boolean;
  leaderPerms: LeaderPermission[];
  remainingInvitesDisplay: string | number | null;
  selectedPlanId: string;
  setSelectedPlanId: (value: string) => void;
  planItems: { id: string | number; name: string }[];
  selectedOrgId: string;
  setSelectedOrgId: (value: string) => void;
  selectedCountry: string;
  setSelectedCountry: (value: string) => void;
  orgItems: { id: string | number; name: string }[];
  isOrgsLoading: boolean;
  orgSearch: string;
  setOrgSearch: (value: string) => void;
  isInviteDialogOpen: boolean;
  inviteText: string;
  setInviteText: (text: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onToggleContact: (id: string, email: string, name: string) => void;
  onClearContacts: () => void;
};

function ContactsConfirmInviteDialogPanel({
  isSending,
  selectedContacts,
  isFreePlan,
  leaderPerms,
  remainingInvitesDisplay,
  selectedPlanId,
  setSelectedPlanId,
  planItems,
  selectedOrgId,
  setSelectedOrgId,
  selectedCountry,
  setSelectedCountry,
  orgItems,
  isOrgsLoading,
  orgSearch,
  setOrgSearch,
  isInviteDialogOpen,
  inviteText,
  setInviteText,
  onClose,
  onConfirm,
  onToggleContact,
  onClearContacts,
}: ContactsConfirmInviteDialogPanelProps) {
  const showPlanOrgSection =
    isFreePlan || (Array.isArray(leaderPerms) && leaderPerms.length > 0);

  return (
    <DialogContent
      className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      mobileFullscreen
      hideCloseButton
    >
      <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
        />
        <DialogClose
          disabled={isSending}
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/15"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        <div className="relative flex items-center gap-3.5 pr-10">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
            <MailPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
              Confirm Invitations
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-1 text-[13px] leading-relaxed text-white/90">
                You're about to send invitations to{" "}
                <strong className="font-semibold text-white">
                  {selectedContacts.length} contacts
                </strong>
                . They'll receive an email invitation to join Prospectly.
              </div>
            </DialogDescription>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {showPlanOrgSection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 bg-muted/20 border rounded-lg">
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="plan-select-modal"
                  className="font-semibold text-foreground flex items-center gap-2 text-sm"
                >
                  <div className="p-1 bg-muted rounded-md">
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  Invitation Plan
                </Label>
                {remainingInvitesDisplay !== null && (
                  <p className="text-[11px] text-muted-foreground pl-1">
                    <span className="font-medium text-foreground">
                      {remainingInvitesDisplay}
                    </span>{" "}
                    paid invites remaining
                  </p>
                )}
              </div>
              <SearchableSelect
                value={selectedPlanId}
                onValueChange={setSelectedPlanId}
                items={planItems}
                loading={false}
                placeholder="Select a plan"
                showSearch={false}
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="org-select-modal"
                  className="font-semibold text-foreground flex items-center gap-2 text-sm"
                >
                  <div className="p-1 bg-muted rounded-md">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  Select Organization
                </Label>
                <p className="text-[11px] text-muted-foreground pl-1">
                  Invite users to your organization
                </p>
              </div>
              <SearchableSelect
                value={selectedOrgId}
                onValueChange={setSelectedOrgId}
                items={orgItems}
                loading={isOrgsLoading}
                placeholder="Select organization"
                searchPlaceholder="Search organizations..."
                searchValue={orgSearch}
                onSearchChange={setOrgSearch}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="country-select-modal"
              className="font-semibold text-foreground flex items-center gap-2 text-sm"
            >
              <div className="p-1 bg-muted rounded-md">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              Country <span className="text-destructive">*</span>
            </Label>
            <p className="text-[11px] text-muted-foreground pl-1">
              Payout country applied when invitees join Prospectly
            </p>
          </div>
          <Select
            value={selectedCountry || undefined}
            onValueChange={setSelectedCountry}
          >
            <SelectTrigger id="country-select-modal">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {PAYOUT_COUNTRIES.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="font-semibold text-foreground text-sm">
            Email Template
          </Label>
          <InviteTextEditor
            key={
              isInviteDialogOpen ? "invite-editor-open" : "invite-editor-closed"
            }
            slug="invite_email"
            variables={{
              senderName: "Me",
              inviteLink: "https://prospectly.com/join/...",
              inviteText: inviteText,
            }}
            onInviteTextChange={setInviteText}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-amethyst" />
              Selected Contacts{" "}
              <span className="text-muted-foreground font-normal">
                ({selectedContacts.length})
              </span>
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearContacts}
              className="h-7 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              Clear All
            </Button>
          </div>
          <div className="max-h-[150px] overflow-y-auto bg-muted/20 rounded-xl border p-2 flex flex-wrap gap-2">
            {selectedContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-2 p-1.5 pl-2.5 rounded-full bg-card border shadow-sm group hover:border-brand-amethyst/30 transition-colors w-fit"
              >
                <div className="flex flex-col min-w-0 max-w-[150px]">
                  <span className="font-medium text-xs truncate leading-tight">
                    {contact.name || "Unknown"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate leading-tight hidden group-hover:block">
                    {contact.email}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    onToggleContact(contact.id, contact.email, contact.name)
                  }
                  className="h-5 w-5 rounded-full text-muted-foreground opacity-60 hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSending}
          className="flex-1 sm:flex-none"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!selectedPlanId || !selectedCountry || isSending}
          className="flex-1 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 sm:flex-none"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>Send {selectedContacts.length} Invitations</>
          )}
        </Button>
      </div>
    </DialogContent>
  );
}

export default function Contacts() {
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useRouteTab<
    (typeof MY_CONTACTS_TABS)[number]
  >({
    basePath: TAB_ROUTE_BASES.myContacts,
    allowedTabs: MY_CONTACTS_TABS,
    defaultTab: "all",
  });
  const { search: routeSearch, setSearch: setRouteSearch } = useRouteSearch();
  const {
    contacts,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    pagination,
    setPage,
    setLimit,
    refetch,
    sortState,
    cycleContactsSort,
  } = useSecureContacts();
  const [newDomain, setNewDomain] = useState("");
  const [newDomainReason, setNewDomainReason] = useState("");
  const [isDomainDialogOpen, setIsDomainDialogOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<
    { id: string; email: string; name: string }[]
  >([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const [isEducationOverlayOpen, setIsEducationOverlayOpen] = useState(false);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<MaskedContact | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const {
    inviteText,
    setInviteText,
    selectedPlanId,
    setSelectedPlanId,
    selectedOrgId,
    setSelectedOrgId,
    selectedCountry,
    setSelectedCountry,
    orgSearch,
    setOrgSearch,
    isFreePlan,
    orgItems,
    planItems,
    remainingInvitesDisplay,
    leaderPerms,
    isOrgsLoading,
  } = useContactsInviteDialog(isInviteDialogOpen);

  const {
    referralProgress,
    refetchReferralProgress,
    isLoading: invitedUsersLoading,
    isError: invitedUsersError,
    error: invitedUsersQueryError,
    resendInviteMutation,
    invitedSearchTerm,
    setInvitedSearchTerm,
    invitedPage,
    setInvitedPage,
    invitedLimit,
    setInvitedLimit,
    paginatedInvitedUsers,
    totalInvitedUsers,
    totalInvitedPages,
    startIndexInvited,
    endIndexInvited,
  } = useInvitedUsers({ inviteTabActive: currentView === "invited" });

  useEffect(() => {
    if (currentView === "invited") {
      setInvitedSearchTerm(routeSearch);
    } else {
      setSearchTerm(routeSearch);
    }
  }, [routeSearch, currentView, setSearchTerm, setInvitedSearchTerm]);

  const handleContactsSearchChange = (value: string) => {
    setRouteSearch(value);
  };

  // Automatically close the invite dialog if all contacts are removed
  useEffect(() => {
    if (selectedContacts.length === 0 && isInviteDialogOpen) {
      setIsInviteDialogOpen(false);
    }
  }, [selectedContacts, isInviteDialogOpen]);

  const handleRefresh = () =>
    runContactsPageRefresh({
      currentView,
      refetchReferralProgress,
      refetch,
      setIsRefreshing,
    });

  const handleRemoveOptOut = () => {
    toast({
      title: "Opt-out Removed",
      description: "Contact has been removed from the opt-out list.",
    });
  };

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid domain.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Domain Added",
      description: `${newDomain} has been added to the do not contact list.`,
    });

    setNewDomain("");
    setNewDomainReason("");
    setIsDomainDialogOpen(false);
  };

  const handleRemoveDomain = (domain: string) => {
    toast({
      title: "Domain Removed",
      description: `${domain} has been removed from the do not contact list.`,
    });
  };

  const handleConfirmInvites = async () => {
    const validationError = validateInviteConfirmation({
      selectedContactsCount: selectedContacts.length,
      selectedPlanId,
      isFreePlan,
      selectedOrgId,
      selectedCountry,
    });
    if (validationError) {
      toast({ variant: "destructive", ...validationError });
      return;
    }
    if (selectedContacts.length === 0) return;

    setIsSending(true);
    try {
      const payload = buildGenerateInvitesPayload({
        selectedContacts,
        selectedPlanId,
        selectedOrgId,
        inviteText,
        selectedCountry,
      });
      const response = await api.invites.generate(payload);
      const results: InviteResultItem[] = response || [];

      if (!response || results.length === 0) {
        toast({
          variant: "destructive",
          title: "Invitation Failed",
          description:
            "No invitations were sent. No results were returned from the server.",
        });
        return;
      }

      showInviteResultToasts({ results, toast });
      queryClient.invalidateQueries({ queryKey: ["leader-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["referrals", "progress"] });
      setSelectedContacts([]);
      setIsInviteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Invitation Failed",
        description:
          error instanceof Error ? error.message : "Unable to send invitations",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Helper function to check if contact has a specific source
  // const hasSource = (
  //   contactSource: string | string[],
  //   targetSource: string
  // ): boolean => {
  //   if (Array.isArray(contactSource)) {
  //     return contactSource.some(
  //       (s) =>
  //         s.toLowerCase().includes(targetSource.toLowerCase()) ||
  //         targetSource.toLowerCase().includes(s.toLowerCase())
  //     );
  //   }
  //   return (
  //     typeof contactSource === "string" &&
  //     (contactSource.toLowerCase().includes(targetSource.toLowerCase()) ||
  //       targetSource.toLowerCase().includes(contactSource.toLowerCase()))
  //   );
  // };

  // COMMENTED OUT: Quick select functionality
  // const handleSelectBySource = (source: string) => {
  //   const sourceContacts = sortedContacts.filter(
  //     (c) =>
  //       !c.optedOut &&
  //       (c.email || c.email_masked) &&
  //       hasSource(c.source, source)
  //   );
  //   const newSelection = [...selectedContacts];
  //   sourceContacts.forEach((c) => {
  //     if (!newSelection.some((s) => s.id === c.id)) {
  //       newSelection.push({
  //         id: c.id,
  //         email: c.email || c.email_masked,
  //         name: c.name,
  //       });
  //     }
  //   });
  //   setSelectedContacts(newSelection);
  // };

  const handleEducationComplete = () => {
    toast({
      title: "Now You Know How It Works!",
      description:
        "Your contacts help create valuable introductions while staying completely private.",
    });
  };

  const handleEditContact = (contact: MaskedContact) => {
    setEditingContact(contact);
    setIsEditContactDialogOpen(true);
  };

  const handleEditContactSuccess = () => {
    refetch();
  };

  const sortedContacts = contacts;

  const handleSelectAll = () => {
    setSelectedContacts((prev) =>
      applyContactsSelectAllToggle({
        sortedContacts,
        selectedContacts: prev,
      })
    );
  };

  const toggleContactSelection = (id: string, email: string, name: string) => {
    setSelectedContacts((prev) => {
      const exists = prev.some((c) => c.id === id);
      if (exists) return prev.filter((c) => c.id !== id);
      return [...prev, { id, email, name }];
    });
  };

  // Use backend pagination info
  const {
    page: currentPage,
    limit: itemsPerPage,
    totalContacts,
    totalPages,
  } = pagination;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalContacts);

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    setLimit(Number(value));
  };

  const getSortIcon = (field: ContactsListSortBy) =>
    getContactsSortIcon({ field, sortState });

  return (
    <>
      <SEO
        title="Contacts | Prospectly"
        description="View imported contacts from LinkedIn, Google, Android and Apple. Discover professional introduction opportunities."
      />

      <main className="px-2 sm:px-4 md:px-6 py-4 space-y-6">
        <ContactsHero currentView={currentView} />

        <Tabs
          value={currentView === "invited" ? "invited" : "all"}
          className="w-full"
          onValueChange={setCurrentView}
        >
          <div
            className={cn(
              "overflow-hidden rounded-2xl border border-border bg-card shadow-brand-card"
            )}
          >
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-3 py-3 sm:px-4"
              )}
            >
              <div
                className={cn(
                  "-mx-0.5 min-w-0 flex-1 overflow-x-auto px-0.5 md:flex-none",
                  "[scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
                )}
              >
                <TabsList
                  className={cn(
                    "inline-flex h-10 w-full min-w-[300px] max-w-md gap-1 rounded-xl border border-border bg-muted p-1",
                    "max-md:!max-w-none md:h-auto md:w-auto"
                  )}
                >
                  <TabsTrigger
                    value="all"
                    className={cn(
                      "group inline-flex min-w-[110px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground md:min-w-0",
                      "data-[state=active]:bg-card data-[state=active]:text-brand-amethyst data-[state=active]:shadow-sm"
                    )}
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">All Contacts</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "ml-1 rounded-full border-0 bg-card px-2 py-0.5 text-[11px] font-bold text-muted-foreground",
                        "group-data-[state=active]:bg-brand-amethyst/10 group-data-[state=active]:text-brand-amethyst"
                      )}
                    >
                      {totalContacts}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="invited"
                    className={cn(
                      "group inline-flex min-w-[110px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground md:min-w-0",
                      "data-[state=active]:bg-card data-[state=active]:text-brand-amethyst data-[state=active]:shadow-sm"
                    )}
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">Invited Users</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "ml-1 rounded-full border-0 bg-card px-2 py-0.5 text-[11px] font-bold text-muted-foreground",
                        "group-data-[state=active]:bg-brand-amethyst/10 group-data-[state=active]:text-brand-amethyst"
                      )}
                    >
                      {referralProgress?.invitedUsers?.length || 0}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-10 shrink-0 gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-sm transition-all",
                        "hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst",
                        "disabled:pointer-events-none disabled:opacity-50"
                      )}
                      onClick={handleRefresh}
                      disabled={isRefreshing || loading}
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          isRefreshing && "animate-spin"
                        )}
                      />
                      <span className="hidden sm:ml-1.5 sm:inline">
                        Refresh
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh contact counts and status</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <TabsContent
              value="all"
              className="mt-0 p-0 border-0 shadow-none bg-transparent"
            >
              {/* All Contacts sub-navigation and controls */}
              <div className="p-4 sm:px-6 border-b border-border bg-muted/30">
                <div className="overflow-x-auto lg:overflow-visible -mx-1 px-1">
                  <div className="flex items-center gap-3 min-w-max lg:min-w-0 lg:justify-between">
                    {/* Search Bar - Moved from below to the left side */}
                    <RouteSearchInput
                      value={routeSearch}
                      onChange={handleContactsSearchChange}
                      placeholder="Search contacts by name, company, or email..."
                      className="min-w-[220px] sm:min-w-[320px] lg:max-w-2xl flex-1"
                      inputClassName="h-10 bg-card border-border"
                      aria-label="Search contacts"
                    />

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      <Link to="/getting-started?step=1">
                        <Button
                          variant="outline"
                          className="gap-2 h-10 rounded-xl"
                        >
                          <Upload className="h-4 w-4" />
                          Import Contacts
                        </Button>
                      </Link>

                      <Dialog
                        open={isInviteDialogOpen}
                        onOpenChange={(open) => {
                          if (!open && isSending) return;
                          setIsInviteDialogOpen(open);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            disabled={selectedContacts.length === 0}
                            className="h-10 rounded-xl bg-brand-gradient text-brand-foreground font-semibold shadow-brand-cta hover:shadow-brand-cta-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:hover:translate-y-0"
                          >
                            {selectedContacts.length > 0 ? (
                              <>
                                <Users className="h-4 w-4 mr-2" />
                                Review & Send Invites ({selectedContacts.length}
                                )
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Review & Send Invites
                              </>
                            )}
                          </Button>
                        </DialogTrigger>
                        <ContactsConfirmInviteDialogPanel
                          isSending={isSending}
                          selectedContacts={selectedContacts}
                          isFreePlan={isFreePlan}
                          leaderPerms={leaderPerms}
                          remainingInvitesDisplay={remainingInvitesDisplay}
                          selectedPlanId={selectedPlanId}
                          setSelectedPlanId={setSelectedPlanId}
                          planItems={planItems}
                          selectedOrgId={selectedOrgId}
                          setSelectedOrgId={setSelectedOrgId}
                          selectedCountry={selectedCountry}
                          setSelectedCountry={setSelectedCountry}
                          orgItems={orgItems}
                          isOrgsLoading={isOrgsLoading}
                          orgSearch={orgSearch}
                          setOrgSearch={setOrgSearch}
                          isInviteDialogOpen={isInviteDialogOpen}
                          inviteText={inviteText}
                          setInviteText={setInviteText}
                          onClose={() => setIsInviteDialogOpen(false)}
                          onConfirm={handleConfirmInvites}
                          onToggleContact={toggleContactSelection}
                          onClearContacts={() => setSelectedContacts([])}
                        />
                      </Dialog>

                      {/* Quick Select Dropdown - Moved from left to right side - COMMENTED OUT */}
                      {/* {currentView === "all" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-10 px-3 gap-2 font-medium"
                          >
                            <CheckSquare className="h-4 w-4 text-muted-foreground" />
                            Quick Select
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleSelectBySource("LinkedIn")}
                          >
                            LinkedIn (
                            {
                              sortedContacts.filter(
                                (c) =>
                                  !c.optedOut && hasSource(c.source, "LinkedIn")
                              ).length
                            }
                            )
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSelectBySource("Google")}
                          >
                            Google (
                            {
                              sortedContacts.filter(
                                (c) =>
                                  !c.optedOut && hasSource(c.source, "Google")
                              ).length
                            }
                            )
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSelectBySource("Microsoft")}
                          >
                            Microsoft (
                            {
                              sortedContacts.filter(
                                (c) =>
                                  !c.optedOut &&
                                  hasSource(c.source, "Microsoft")
                              ).length
                            }
                            )
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSelectBySource("Apple")}
                          >
                            Apple (
                            {
                              sortedContacts.filter(
                                (c) =>
                                  !c.optedOut && hasSource(c.source, "Apple")
                              ).length
                            }
                            )
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSelectBySource("Android")}
                          >
                            Android (
                            {
                              sortedContacts.filter(
                                (c) =>
                                  !c.optedOut && hasSource(c.source, "Android")
                              ).length
                            }
                            )
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setSelectedContacts([])}
                          >
                            Clear Selection
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )} */}
                    </div>
                  </div>
                </div>
              </div>

              {/* All Contacts View Content */}
              {currentView === "all" && (
                <div className="space-y-0">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 m-4">
                      <div className="text-destructive">
                        <strong>Security Error:</strong> {error}
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border hover:bg-transparent [&_button]:text-[11px] [&_button]:uppercase [&_button]:tracking-wider [&_button]:font-bold [&_button]:text-muted-foreground [&_button:hover]:text-foreground">
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={
                                sortedContacts.filter(
                                  (c) =>
                                    !c.optedOut && (c.email || c.email_masked)
                                ).length > 0 &&
                                sortedContacts
                                  .filter(
                                    (c) =>
                                      !c.optedOut && (c.email || c.email_masked)
                                  )
                                  .every((c) =>
                                    selectedContacts.some((s) => s.id === c.id)
                                  )
                              }
                              onCheckedChange={handleSelectAll}
                              aria-label="Select all"
                              className="border-brand-amethyst/40 data-[state=checked]:bg-brand-gradient data-[state=checked]:border-transparent data-[state=checked]:text-brand-foreground"
                            />
                          </TableHead>
                          <TableHead className="w-[280px]">
                            <button
                              type="button"
                              onClick={() => cycleContactsSort("contact")}
                              className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
                            >
                              Contact
                              {getSortIcon("contact")}
                            </button>
                          </TableHead>
                          <TableHead className="w-[240px]">
                            <button
                              type="button"
                              onClick={() => cycleContactsSort("email")}
                              className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
                            >
                              Email
                              {getSortIcon("email")}
                            </button>
                          </TableHead>
                          <TableHead className="w-[200px]">
                            <button
                              type="button"
                              onClick={() => cycleContactsSort("company")}
                              className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
                            >
                              Company
                              {getSortIcon("company")}
                            </button>
                          </TableHead>
                          <TableHead className="w-[80px]">
                            <button
                              type="button"
                              onClick={() => cycleContactsSort("linkedin")}
                              className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
                            >
                              LinkedIn
                              {getSortIcon("linkedin")}
                            </button>
                          </TableHead>
                          <TableHead className="w-[140px]">
                            <button
                              type="button"
                              onClick={() => cycleContactsSort("bountyAmount")}
                              className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
                            >
                              Estimated Value
                              {getSortIcon("bountyAmount")}
                            </button>
                          </TableHead>
                          <TableHead className="w-[140px]">
                            <button
                              type="button"
                              onClick={() => cycleContactsSort("source")}
                              className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
                            >
                              Source
                              {getSortIcon("source")}
                            </button>
                          </TableHead>
                          <TableHead className="w-[160px]">
                            <button
                              type="button"
                              onClick={() => cycleContactsSort("updatedAt")}
                              className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
                            >
                              Last Updated
                              {getSortIcon("updatedAt")}
                            </button>
                          </TableHead>
                          <TableHead className="text-right w-[100px] text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell
                              colSpan={9}
                              className="text-center py-16"
                            >
                              <Loader
                                message="Loading secure contacts..."
                                className="py-0"
                              />
                            </TableCell>
                          </TableRow>
                        ) : sortedContacts.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell
                              colSpan={9}
                              className="text-center py-16"
                            >
                              <div className="flex flex-col items-center gap-3">
                                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                                  <Users className="h-8 w-8" />
                                </div>
                                <p className="text-base font-extrabold tracking-tight text-foreground">
                                  {searchTerm
                                    ? "No contacts found"
                                    : "No contacts yet"}
                                </p>
                                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                                  {searchTerm
                                    ? "No contacts match your search. Try a different name, company, or email."
                                    : "Import contacts to start building your professional network and discover introduction opportunities."}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedContacts.map((c) => (
                            <TableRow
                              key={c.id}
                              className={`group transition-colors border-b border-border/50 cursor-pointer ${
                                selectedContacts.some((s) => s.id === c.id)
                                  ? "bg-brand-amethyst/5 hover:bg-brand-amethyst/10"
                                  : "hover:bg-brand-amethyst/5"
                              }`}
                              onClick={() => {
                                const hasEmail = c.email || c.email_masked;
                                if (!c.optedOut && hasEmail) {
                                  toggleContactSelection(
                                    c.id,
                                    c.email || c.email_masked,
                                    c.name
                                  );
                                }
                              }}
                            >
                              <TableCell
                                className="py-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={selectedContacts.some(
                                    (s) => s.id === c.id
                                  )}
                                  onCheckedChange={() => {
                                    const hasEmail = c.email || c.email_masked;
                                    if (!c.optedOut && hasEmail) {
                                      toggleContactSelection(
                                        c.id,
                                        hasEmail,
                                        c.name
                                      );
                                    }
                                  }}
                                  disabled={
                                    c.optedOut || !(c.email || c.email_masked)
                                  }
                                  aria-label={`Select ${c.name}`}
                                  className="border-brand-amethyst/40 data-[state=checked]:bg-brand-gradient data-[state=checked]:border-transparent data-[state=checked]:text-brand-foreground"
                                />
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-3 min-w-[200px]">
                                  <PremiumAvatar
                                    name={c.name || "Unknown"}
                                    size="sm"
                                    imageUrl={c.profilePhotoUrl || null}
                                  />
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-foreground whitespace-nowrap">
                                      {c.name || "Unknown"}
                                    </span>
                                    {c.jobTitle && (
                                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                        {c.jobTitle}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                {c.email_masked || c.email ? (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-sm text-foreground truncate max-w-[200px]">
                                      {c.email_masked || c.email}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                {c.company ? (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="text-sm font-medium text-foreground truncate">
                                      {c.company}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell
                                className="py-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {c.linkedinUrl ? (
                                  <a
                                    href={c.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`View ${c.name || "contact"}'s LinkedIn profile`}
                                  >
                                    <Linkedin className="h-4 w-4 text-brand-sky hover:text-brand-sky/80 transition-colors cursor-pointer" />
                                  </a>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={cn(
                                      "flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold",
                                      Number(c.bounty_amount) > 0
                                        ? "bg-brand-amethyst/10 text-brand-amethyst"
                                        : "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    <DollarSign className="h-3.5 w-3.5" />
                                    <span className="text-sm">
                                      {c.bounty_amount
                                        ? Number(c.bounty_amount).toFixed(2)
                                        : "0.00"}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.isArray(c.source) ? (
                                    c.source.length > 0 ? (
                                      c.source.map((source, idx) => {
                                        const normalizedSource =
                                          normalizeSource(source);
                                        return (
                                          <Badge
                                            key={idx}
                                            variant="outline"
                                            className={cn(
                                              "gap-1 text-xs border-0 rounded-full font-bold capitalize",
                                              getSourceBadgeClassName(
                                                normalizedSource
                                              )
                                            )}
                                          >
                                            {getSourceLogo(normalizedSource)}
                                            {normalizedSource}
                                          </Badge>
                                        );
                                      })
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-xs border-0 rounded-full font-bold capitalize bg-muted text-muted-foreground"
                                      >
                                        Manual
                                      </Badge>
                                    )
                                  ) : typeof c.source === "string" ? (
                                    (() => {
                                      const normalizedSource = normalizeSource(
                                        c.source
                                      );
                                      return (
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "gap-1 text-xs border-0 rounded-full font-bold capitalize",
                                            getSourceBadgeClassName(
                                              normalizedSource
                                            )
                                          )}
                                        >
                                          {getSourceLogo(normalizedSource)}
                                          {normalizedSource}
                                        </Badge>
                                      );
                                    })()
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-xs border-0 rounded-full font-bold capitalize bg-muted text-muted-foreground"
                                    >
                                      Manual
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                  {c.updatedAt
                                    ? formatLocalizedShortDateTime(c.updatedAt)
                                    : "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right py-4">
                                {c.optedOut ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRemoveOptOut()}
                                    className="text-xs"
                                  >
                                    Remove Opt-out
                                  </Button>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg border border-border bg-muted/50 text-muted-foreground hover:bg-brand-amethyst/10 hover:text-brand-amethyst hover:border-brand-amethyst/20 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditContact(c);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">
                                          Edit Contact
                                        </span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Edit Contact</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  {totalContacts > 0 && (
                    <ResponsivePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={totalContacts}
                      startIndex={startIndex}
                      endIndex={endIndex}
                      onItemsPerPageChange={handleItemsPerPageChange}
                      itemLabel="contacts"
                      itemsPerPageSelectId="items-per-page"
                      itemsPerPageTestId="select-items-per-page"
                      prevTestId="button-previous-page"
                      nextTestId="button-next-page"
                      pageTestIdPrefix="button-page"
                    />
                  )}
                </div>
              )}

              {/* Opted Out View */}
              {currentView === "opted-out" && (
                <Card className="shadow-md border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserX className="h-5 w-5" />
                      Opted Out Contacts
                    </CardTitle>
                    <CardDescription>
                      Contacts who have opted out of campaign outreach
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Contact</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Opted Out Date</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mockOptedOutContacts.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center py-8 text-muted-foreground"
                              >
                                No contacts have opted out.
                              </TableCell>
                            </TableRow>
                          ) : (
                            mockOptedOutContacts.map((contact) => (
                              <TableRow key={contact.email}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {contact.name}
                                    </span>
                                    <span className="text-muted-foreground text-sm">
                                      {contact.company}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>{contact.email}</TableCell>
                                <TableCell>
                                  {toUTC(
                                    contact.optedOutDate
                                  ).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {contact.reason}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRemoveOptOut()}
                                  >
                                    Remove Opt-out
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Do Not Contact View */}
              {currentView === "do-not-contact" && (
                <Card className="shadow-md border-border/50">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Do Not Contact Domains
                        </CardTitle>
                        <CardDescription>
                          Domains that should not be contacted in any campaigns
                        </CardDescription>
                      </div>
                      <Dialog
                        open={isDomainDialogOpen}
                        onOpenChange={setIsDomainDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Domain
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              Add Domain to Do Not Contact List
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="domain">Domain</Label>
                              <Input
                                id="domain"
                                placeholder="example.com"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="reason">Reason (Optional)</Label>
                              <Input
                                id="reason"
                                placeholder="Legal request, high bounce rate, etc."
                                value={newDomainReason}
                                onChange={(e) =>
                                  setNewDomainReason(e.target.value)
                                }
                              />
                            </div>
                            <div className="flex justify-end space-x-3">
                              <Button
                                variant="outline"
                                onClick={() => setIsDomainDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleAddDomain}>
                                Add Domain
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Domain</TableHead>
                            <TableHead>Date Added</TableHead>
                            <TableHead>Added By</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mockDoNotContactDomains.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center py-8 text-muted-foreground"
                              >
                                No domains in the do not contact list.
                              </TableCell>
                            </TableRow>
                          ) : (
                            mockDoNotContactDomains.map((domain) => (
                              <TableRow key={domain.domain}>
                                <TableCell className="font-medium">
                                  {domain.domain}
                                </TableCell>
                                <TableCell>
                                  {toUTC(domain.dateAdded).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{domain.addedBy}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {domain.reason}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleRemoveDomain(domain.domain)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent
              value="invited"
              className="mt-0 p-0 border-0 shadow-none bg-transparent"
            >
              <InvitedUsersTable
                invitedSearchTerm={routeSearch}
                onInvitedSearchTermChange={handleContactsSearchChange}
                isLoading={invitedUsersLoading}
                isError={invitedUsersError}
                error={invitedUsersQueryError}
                paginatedInvitedUsers={paginatedInvitedUsers}
                totalInvitedUsers={totalInvitedUsers}
                invitedPage={invitedPage}
                totalInvitedPages={totalInvitedPages}
                startIndexInvited={startIndexInvited}
                endIndexInvited={endIndexInvited}
                invitedLimit={invitedLimit}
                onInvitedPageChange={setInvitedPage}
                onInvitedLimitChange={setInvitedLimit}
                resendInviteMutation={resendInviteMutation}
              />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Education Overlay */}
      <ContactUploadEducationOverlay
        isOpen={isEducationOverlayOpen}
        onClose={() => setIsEducationOverlayOpen(false)}
        onComplete={handleEducationComplete}
      />

      {/* No Contacts Selected Dialog */}
      {/* <NoContactsSelectedDialog
        isOpen={isNoContactsDialogOpen}
        onOpenChange={setIsNoContactsDialogOpen}
        onSelectAll={handleSelectAllActive}
        onSelectBySource={handleSelectBySource}
        contactCounts={{
          total: sortedContacts.filter((c) => !c.optedOut).length,
          linkedin: sortedContacts.filter(
            (c) => !c.optedOut && hasSource(c.source, "LinkedIn")
          ).length,
          google: sortedContacts.filter(
            (c) => !c.optedOut && hasSource(c.source, "Google")
          ).length,
          apple: sortedContacts.filter(
            (c) => !c.optedOut && hasSource(c.source, "Apple")
          ).length,
          android: sortedContacts.filter(
            (c) => !c.optedOut && hasSource(c.source, "Android")
          ).length,
        }}
      /> */}

      {/* Edit Contact Dialog */}
      <EditContactDialog
        contact={editingContact}
        open={isEditContactDialogOpen}
        onOpenChange={setIsEditContactDialogOpen}
        onSuccess={handleEditContactSuccess}
      />
    </>
  );
}
