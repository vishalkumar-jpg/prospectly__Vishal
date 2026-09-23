import {
  LucideIcon,
  Search,
  Activity,
  Trophy,
  Users,
  Shield,
  FilePlus,
  ClipboardList,
  Store,
  Wallet,
  LayoutDashboard,
} from "lucide-react";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";
import {
  CANDIDATE_SEARCH_PATH,
  RECRUITER_DASHBOARD_PATH,
} from "@/constants/recruitment-routes";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  iconClassName?: string;
};

export const ACTIVE_BLUE =
  "relative bg-brand-amethyst/10 hover:bg-brand-amethyst/10 text-brand-amethyst " +
  "[&_svg]:text-brand-amethyst " +
  "before:absolute before:left-0 before:inset-y-2 before:w-[3px] before:rounded-r before:content-[''] " +
  "before:bg-[linear-gradient(135deg,hsl(var(--brand-amethyst)),hsl(var(--brand-rose)))]";

export const prospectingItems: NavItem[] = [
  {
    title: "Find Prospects",
    url: "/prospecting/find-prospects",
    icon: Search,
  },
  {
    title: "My Prospects",
    url: TAB_ROUTE_BASES.myProspects,
    icon: Activity,
  },
  {
    title: "Incoming Requests",
    url: TAB_ROUTE_BASES.incomingRequests,
    icon: Activity,
  },
  {
    title: "Opportunities",
    url: TAB_ROUTE_BASES.opportunities,
    icon: Trophy,
  },
  {
    title: "Transactions",
    url: TAB_ROUTE_BASES.prospectingTransactions,
    icon: Wallet,
  },
];

export const recruitingRecruiterItems: NavItem[] = [
  {
    title: "Dashboard",
    url: RECRUITER_DASHBOARD_PATH,
    icon: LayoutDashboard,
  },
  {
    title: "Post a Job",
    url: "/recruiting/post-a-job",
    icon: ClipboardList,
  },
  {
    title: "My Job Posts",
    url: TAB_ROUTE_BASES.myJobPosts,
    icon: FilePlus,
  },
  {
    title: "Candidate Search",
    url: CANDIDATE_SEARCH_PATH,
    icon: Search,
  },
  {
    title: "Transactions",
    url: TAB_ROUTE_BASES.recruitingTransactions,
    icon: Wallet,
  },
];

export const recruitingConnectorItems: NavItem[] = [
  {
    title: "Refer Candidates",
    url: TAB_ROUTE_BASES.referCandidates,
    icon: Activity,
  },
  {
    title: "Job Marketplace",
    url: "/recruiting/job-marketplace",
    icon: Store,
  },
  {
    title: "Transactions",
    url: TAB_ROUTE_BASES.recruitingTransactions,
    icon: Wallet,
  },
  {
    title: "My Applications",
    url: TAB_ROUTE_BASES.myApplications,
    icon: FilePlus,
  },
  {
    title: "My Contacts",
    url: TAB_ROUTE_BASES.myContacts,
    icon: Users,
  },
];

/** @deprecated Use recruitingRecruiterItems or recruitingConnectorItems based on job access. */
export const recruitingEmployerItems: NavItem[] = [
  {
    title: "Dashboard",
    url: RECRUITER_DASHBOARD_PATH,
    icon: LayoutDashboard,
  },
  {
    title: "Post a Job",
    url: "/recruiting/post-a-job",
    icon: ClipboardList,
  },
  {
    title: "My Job Posts",
    url: TAB_ROUTE_BASES.myJobPosts,
    icon: FilePlus,
  },
  {
    title: "Candidate Search",
    url: CANDIDATE_SEARCH_PATH,
    icon: Search,
  },
  {
    title: "Refer Candidates",
    url: TAB_ROUTE_BASES.referCandidates,
    icon: Activity,
  },
  {
    title: "Job Marketplace",
    url: "/recruiting/job-marketplace",
    icon: Store,
  },
  {
    title: "Transactions",
    url: TAB_ROUTE_BASES.recruitingTransactions,
    icon: Wallet,
  },
];

export const recruitingJobSeekerItems: NavItem[] = [
  {
    title: "My Applications",
    url: TAB_ROUTE_BASES.myApplications,
    icon: FilePlus,
  },
];

export const generalItems: NavItem[] = [
  {
    title: "My Contacts",
    url: TAB_ROUTE_BASES.myContacts,
    icon: Users,
  },
  {
    title: "Trust Score",
    url: "/trust-score",
    icon: Shield,
  },
];
