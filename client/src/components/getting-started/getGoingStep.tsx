import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Handshake,
  MailPlus,
  Network,
  PartyPopper,
  Plus,
  Search,
  Share2,
  UserRoundSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreferredWorkspace } from "@/lib/workspace-focus";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";

type ActionCard = {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: typeof Briefcase;
  tileClass: string;
};

const RECRUITING_ACTIONS: ActionCard[] = [
  {
    title: "Post your first job",
    description:
      "Describe a role and let connectors source qualified, vouched-for candidates.",
    href: "/recruiting/post-a-job",
    cta: "Post a job",
    icon: Briefcase,
    tileClass: "bg-brand-amethyst/15 text-brand-amethyst",
  },
  {
    title: "Refer a candidate & earn",
    description:
      "Earn at every stage — qualified → shortlisted → interviewed → full referral on hire.",
    href: "/recruiting/job-marketplace",
    cta: "Browse open roles",
    icon: Share2,
    tileClass: "bg-gs-rose/10 text-gs-rose",
  },
  {
    title: "Complete your profile",
    description:
      "Job seeker? Get discovered for roles that match your experience.",
    href: TAB_ROUTE_BASES.myApplications,
    cta: "Set up profile",
    icon: UserRoundSearch,
    tileClass: "bg-emerald-500/15 text-emerald-600",
  },
];

const PROSPECTING_ACTIONS: ActionCard[] = [
  {
    title: "Find prospects",
    description:
      "Upload targets and let the network open warm paths to decision-makers.",
    href: "/prospecting/find-prospects",
    cta: "Find prospects",
    icon: Search,
    tileClass: "bg-brand-sky/15 text-brand-sky",
  },
  {
    title: "Request a warm intro",
    description: "Ask for an introduction to a specific person or company.",
    href: "/prospecting/find-prospects",
    cta: "Request intro",
    icon: MailPlus,
    tileClass: "bg-gs-rose/10 text-gs-rose",
  },
  {
    title: "Make an introduction",
    description:
      "Introduce people in your network and earn a payout per successful intro.",
    href: TAB_ROUTE_BASES.opportunities,
    cta: "Start introducing",
    icon: Handshake,
    tileClass: "bg-brand-amethyst/15 text-brand-amethyst",
  },
];

function ActionGrid({ actions }: { actions: ActionCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
      {actions.map((action) => (
        <Link
          key={action.title}
          to={action.href}
          className={cn(
            "rounded-2xl border border-border bg-card p-4 transition-all sm:p-[18px]",
            "hover:-translate-y-0.5 hover:border-brand-amethyst/40 hover:shadow-lg"
          )}
        >
          <div
            className={cn(
              "mb-2.5 grid h-10 w-10 place-items-center rounded-xl",
              action.tileClass
            )}
          >
            <action.icon className="h-5 w-5" />
          </div>
          <h4 className="text-[15px] font-extrabold text-foreground">
            {action.title}
          </h4>
          <p className="mt-1 line-clamp-3 text-[12.5px] leading-snug text-muted-foreground">
            {action.description}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-bold text-gs-rose">
            {action.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}

function HeroBanner({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3.5 rounded-2xl border border-brand-amethyst/20 bg-gradient-to-r from-brand-amethyst/10 to-gs-rose/5 px-4 py-3.5 sm:px-5 sm:py-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[linear-gradient(120deg,hsl(var(--brand-amethyst)),hsl(var(--brand-rose)))] text-white">
        <PartyPopper className="h-5 w-5" />
      </span>
      <div>
        <p className="text-base font-bold text-foreground">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function FocusPanel({
  title,
  subtitle,
  icon: Icon,
  iconClass,
  actions,
  openHref,
  openLabel,
}: {
  title: string;
  subtitle: string;
  icon: typeof Briefcase;
  iconClass: string;
  actions: Array<{
    href: string;
    icon: typeof Briefcase;
    iconClass: string;
    label: string;
  }>;
  openHref: string;
  openLabel: string;
}) {
  return (
    <div className="rounded-[18px] border border-border bg-card p-[22px]">
      <div className="mb-2 flex items-center gap-3">
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-[11px]",
            iconClass
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-bold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {actions.map((action, i) => (
        <Link
          key={action.label}
          to={action.href}
          className={cn(
            "flex items-center gap-3 py-3 text-sm",
            i === 0 && "border-b border-border"
          )}
        >
          <span
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg",
              action.iconClass
            )}
          >
            <action.icon className="h-4 w-4" />
          </span>
          <span className="flex-1 font-semibold">{action.label}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      ))}
      <Link
        to={openHref}
        className="mt-3.5 flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-brand-amethyst hover:text-brand-amethyst"
      >
        {openLabel}
      </Link>
    </div>
  );
}

function BothSplit() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FocusPanel
        title="Recruiting"
        subtitle="Hire & refer talent"
        icon={Briefcase}
        iconClass="bg-brand-amethyst/15 text-brand-amethyst"
        actions={[
          {
            href: "/recruiting/post-a-job",
            icon: Plus,
            iconClass: "bg-brand-amethyst/15 text-brand-amethyst",
            label: "Post your first job",
          },
          {
            href: "/recruiting/job-marketplace",
            icon: Share2,
            iconClass: "bg-gs-rose/10 text-gs-rose",
            label: "Refer a candidate & earn",
          },
        ]}
        openHref="/recruiting/my-job-posts/active"
        openLabel="Open Recruiting"
      />
      <FocusPanel
        title="Prospecting"
        subtitle="Warm introductions"
        icon={Network}
        iconClass="bg-brand-sky/15 text-brand-sky"
        actions={[
          {
            href: "/prospecting/find-prospects",
            icon: Search,
            iconClass: "bg-brand-sky/15 text-brand-sky",
            label: "Find prospects",
          },
          {
            href: TAB_ROUTE_BASES.opportunities,
            icon: Handshake,
            iconClass: "bg-brand-amethyst/15 text-brand-amethyst",
            label: "Make an introduction",
          },
        ]}
        openHref="/prospecting/find-prospects"
        openLabel="Open Prospecting"
      />
    </div>
  );
}

interface GetGoingStepProps {
  preferredWorkspace: PreferredWorkspace;
}

export function GetGoingStep({ preferredWorkspace }: GetGoingStepProps) {
  if (preferredWorkspace === "recruiting") {
    return (
      <div>
        <HeroBanner title="You're set for Recruiting" />
        <ActionGrid actions={RECRUITING_ACTIONS} />
      </div>
    );
  }

  if (preferredWorkspace === "prospecting") {
    return (
      <div>
        <HeroBanner
          title="You're set for Prospecting"
          subtitle="Start turning your network into warm introductions."
        />
        <ActionGrid actions={PROSPECTING_ACTIONS} />
      </div>
    );
  }

  return (
    <div>
      <HeroBanner
        title="You're set for both"
        subtitle="Both live in one place — pick where to start. You can switch anytime."
      />
      <BothSplit />
    </div>
  );
}
