import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Briefcase,
  Users,
  MapPin,
  Shield,
  Mail,
  Linkedin,
  Globe,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { encryptEmail } from "./introductionHelpers";
import { normalizeLinkedInUrl, normalizeWebsiteUrl } from "./inboxUtils";
import { AccountDeletedInfo } from "./AccountDeletedInfo";
import { ConnectorPoolCard } from "./ConnectorPoolCard";
import {
  UserOrganizationsSection,
  type UserOrganizationBadge,
} from "@/components/shared/UserOrganizationsSection";

export type IntroPersonRole = "connector" | "requester" | "prospect";

export interface IntroPerson {
  id?: string;
  name?: string;
  trustScore?: number;
  photoUrl?: string | null;
  title?: string | null;
  industry?: string | null;
  company?: string | null;
  location?: string | null;
  employees?: string | null;
  linkedinConnections?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  companyLinkedinUrl?: string | null;
  organizations?: UserOrganizationBadge[];
}

interface RoleTheme {
  label: string;
  headerBg: string;
  headerBorder: string;
  accentText: string;
  dot: string;
  factIcon: string;
  pill: string;
  avatarBg: string;
  orgVariant: "blue" | "purple";
  deletedVariant: "blue" | "purple";
}

const PILL_BASE =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border bg-card text-foreground transition-colors max-w-full";

const SKY_THEME: Omit<RoleTheme, "label"> = {
  headerBg: "bg-brand-sky/10",
  headerBorder: "border-brand-sky/20",
  accentText: "text-brand-sky",
  dot: "bg-brand-sky",
  factIcon: "text-brand-sky",
  pill: "hover:border-brand-sky/40 hover:bg-brand-sky/10 hover:text-brand-sky",
  avatarBg: "bg-brand-gradient",
  orgVariant: "blue",
  deletedVariant: "blue",
};

const ROLE_THEME: Record<IntroPersonRole, RoleTheme> = {
  connector: { label: "Connector", ...SKY_THEME },
  requester: { label: "Requester", ...SKY_THEME },
  prospect: {
    label: "Prospect",
    headerBg: "bg-brand-amethyst/[0.06]",
    headerBorder: "border-brand-amethyst/20",
    accentText: "text-brand-amethyst",
    dot: "bg-brand-amethyst",
    factIcon: "text-brand-amethyst",
    pill: "hover:border-brand-amethyst/40 hover:bg-brand-amethyst/10 hover:text-brand-amethyst",
    avatarBg: "bg-brand-success",
    orgVariant: "purple",
    deletedVariant: "purple",
  },
};

interface IntroPersonCardProps {
  role: IntroPersonRole;
  person: IntroPerson;
  /** Connector-pool special case (RequestDetailsModal only) */
  stage?: string;
  potentialConnectors?: {
    totalCount: number;
    pendingCount: number;
    declinedCount: number;
    hasAccepted: boolean;
  } | null;
  handleViewReviews?: (person: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => void;
}

export function IntroPersonCard({
  role,
  person,
  stage,
  potentialConnectors,
  handleViewReviews,
}: IntroPersonCardProps) {
  const theme = ROLE_THEME[role];
  const name = person.name || theme.label;

  // Connector-pool special case mirrors ConnectorCard's branching.
  if (role === "connector") {
    const hasAccepted = !!potentialConnectors?.hasAccepted;
    const isAwaitingConnector = stage === "awaiting_connector" && !hasAccepted;
    const isArchivedWithoutConnector =
      stage === "archived" && !hasAccepted && !person.id;
    if (isAwaitingConnector || isArchivedWithoutConnector) {
      return (
        <ConnectorPoolCard
          variant={isArchivedWithoutConnector ? "archived" : "active"}
          potentialConnectors={potentialConnectors}
        />
      );
    }
  }

  const isDeleted = name === "User's Account deleted" || name === "Unknown";
  const isPerson = role === "connector" || role === "requester";
  const pillClass = cn(PILL_BASE, theme.pill);

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Accent header */}
      <div
        className={cn(
          "flex min-h-[2.875rem] items-center justify-between gap-2 border-b px-3.5 py-2.5",
          theme.headerBg,
          theme.headerBorder
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wider",
            theme.accentText
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", theme.dot)} />
          {theme.label}
        </span>

        {isPerson && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[12.5px] font-bold text-foreground">
            <Shield className={cn("h-3.5 w-3.5", theme.accentText)} />
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Trust
            </span>
            {person.trustScore != null ? person.trustScore : "—"}
          </span>
        )}

        {role === "prospect" && person.linkedinConnections && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[12.5px] font-bold text-foreground">
            <Users className={cn("h-3.5 w-3.5", theme.accentText)} />
            {person.linkedinConnections}+
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
              connections
            </span>
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        {isDeleted ? (
          <div className="flex flex-1 items-center">
            <AccountDeletedInfo
              variant={theme.deletedVariant}
              className="w-full"
            />
          </div>
        ) : (
          <>
            {/* Identity */}
            <div className="flex items-center gap-3">
              <PremiumAvatar
                name={name}
                size="sm"
                showPurpleRing={false}
                fallbackBgColor={theme.avatarBg}
                fallbackTextColor="text-brand-foreground"
                imageUrl={person.photoUrl}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="break-words text-[14px] font-extrabold leading-tight text-foreground">
                  {name}
                </span>
                {person.title && (
                  <span
                    className="truncate text-[11.5px] font-medium text-muted-foreground"
                    title={person.title}
                  >
                    {person.title}
                  </span>
                )}
              </div>
            </div>

            {/* Facts */}
            <div className="flex flex-col gap-2">
              {person.industry && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Briefcase
                    className={cn("h-3.5 w-3.5 flex-shrink-0", theme.factIcon)}
                  />
                  <span className="truncate">{person.industry}</span>
                </div>
              )}
              {person.company && (
                <div className="flex items-center gap-2 text-[11.5px] font-medium text-foreground">
                  <Building2
                    className={cn("h-3.5 w-3.5 flex-shrink-0", theme.factIcon)}
                  />
                  <span className="truncate">{person.company}</span>
                </div>
              )}
              {person.employees && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Users
                    className={cn("h-3.5 w-3.5 flex-shrink-0", theme.factIcon)}
                  />
                  <span className="truncate">{person.employees} employees</span>
                </div>
              )}
              {person.location && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <MapPin
                    className={cn("h-3.5 w-3.5 flex-shrink-0", theme.factIcon)}
                  />
                  <span className="truncate">{person.location}</span>
                </div>
              )}
            </div>

            {/* Organizations */}
            {person.organizations && person.organizations.length > 0 && (
              <UserOrganizationsSection
                organizations={person.organizations}
                variant={theme.orgVariant}
                hideHeader
              />
            )}

            {/* Footer pill links */}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-2.5">
              {person.email && person.email.trim() !== "" && (
                <EmailPill
                  email={person.email}
                  asLink={role === "connector"}
                  className={pillClass}
                />
              )}

              {person.linkedinUrl && (
                <a
                  href={normalizeLinkedInUrl(person.linkedinUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={pillClass}
                >
                  <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                  LinkedIn
                </a>
              )}

              {person.websiteUrl && person.websiteUrl.trim() !== "" && (
                <a
                  href={normalizeWebsiteUrl(person.websiteUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={pillClass}
                >
                  <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                  Company Website
                </a>
              )}

              {role === "prospect" &&
                person.companyLinkedinUrl &&
                person.companyLinkedinUrl.trim() !== "" && (
                  <a
                    href={normalizeLinkedInUrl(person.companyLinkedinUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={pillClass}
                  >
                    <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                    Company LinkedIn
                  </a>
                )}

              {isPerson && person.id && handleViewReviews && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewReviews({
                      id: person.id,
                      name,
                      trustScore: person.trustScore,
                    });
                  }}
                  className={cn(pillClass, "h-auto")}
                >
                  <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                  Reviews
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface EmailPillProps {
  email: string;
  asLink: boolean;
  className?: string;
}

function EmailPill({ email, asLink, className }: EmailPillProps) {
  const masked = encryptEmail(email);
  const content = (
    <>
      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate" title={masked}>
        {masked}
      </span>
    </>
  );
  if (asLink) {
    return (
      <a
        href={`mailto:${email}`}
        onClick={(e) => e.stopPropagation()}
        className={className}
      >
        {content}
      </a>
    );
  }
  return <span className={className}>{content}</span>;
}
