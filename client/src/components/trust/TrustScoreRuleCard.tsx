import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Shield,
  Award,
  Users,
  Target,
  Star,
  Mail,
  Building,
  MessageSquare,
  UserCheck,
  Clock,
  Sparkles,
  XCircle,
  BarChart,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toUTC } from "@/lib/dayjs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AnyType } from "@/types/common";
import { cn } from "@/lib/utils";
import {
  GoogleLogo,
  MicrosoftLogo,
  AppleLogo,
  LinkedInLogo,
} from "@/components/contacts/source-logos";

interface TrustScoreRuleCardProps {
  rule: {
    ruleId: string;
    slug: string;
    name: string;
    description: string | null;
    points: number;
    priority?: number;
    actionType?: string;
    earnedAt?: string;
    evidence?: AnyType;
    actionUrl?: string;
    actionLabel?: string;
    configParams?: Record<string, unknown>;
    progressInfo?: {
      currentPercentage: number;
      requiredPercentage: number;
      totalResponses: number;
      qualifyingResponses: number;
      status: "earned" | "close" | "needs_improvement";
      message: string;
      currentAverage?: number;
      currentCount?: number;
    };
    history?: Array<{
      triggeredAt: string;
      actionType: string;
      pointsChange: number;
      evidence: Record<string, unknown> | null;
    }>;
  };
  isEarned: boolean;
  isDeduction?: boolean;
}

// Rule Image Component with fallback
function RuleImage({
  icon: Icon,
  slug,
  size = "h-5 w-5",
}: {
  icon: LucideIcon;
  slug: string;
  size?: string;
}) {
  const [imageError, setImageError] = useState(false);

  // Try to construct badge image path from slug
  // Convert slug to match badge naming convention (e.g., "verify-email" -> "verified-email")
  const badgeImagePath = `/badges/${slug}.png`;

  // Always show the image first, fallback to icon if it fails
  return (
    <div className="relative">
      <img
        src={badgeImagePath}
        alt={slug}
        className={`${size} object-contain transition-opacity duration-200`}
        onError={() => setImageError(true)}
        style={{ display: imageError ? "none" : "block" }}
      />
      {imageError && <Icon className={size} />}
    </div>
  );
}

// Format history timeline for response rate rules
function formatHistoryTimeline(
  slug: string,
  history: Array<{
    triggeredAt: string;
    actionType: string;
    pointsChange: number;
    evidence: Record<string, unknown> | null;
  }>
): React.ReactNode {
  if (!history || history.length === 0) return null;

  // Determine rule-specific messaging
  const getRuleMessage = (
    slug: string,
    isAdd: boolean,
    evidence: Record<string, unknown> | null
  ) => {
    if (slug === "response_within_48h") {
      const rate = evidence?.averageResponseRate as number;
      if (rate !== null && rate !== undefined && !Number.isNaN(rate)) {
        return isAdd
          ? `You achieved ${rate.toFixed(1)}% 48-hour response rate`
          : `Your rate dropped to ${rate.toFixed(1)}% (below 85% threshold)`;
      }
    } else if (slug === "high_success_rate") {
      const rate = evidence?.successRate as number;
      if (rate !== null && rate !== undefined && !Number.isNaN(rate)) {
        return isAdd
          ? `You achieved ${rate.toFixed(1)}% success rate`
          : `Your success rate dropped to ${rate.toFixed(1)}% (below 85% threshold)`;
      }
    }
    return null;
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold">History</h4>
      </div>

      <div className="space-y-3">
        {history.map((entry, index) => {
          const date = toUTC(entry.triggeredAt);
          const formattedDate = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const formattedTime = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          const isAdd = entry.actionType === "ADD";
          const message = getRuleMessage(slug, isAdd, entry.evidence);

          return (
            <div key={index} className="flex gap-3 text-xs">
              <div className="flex-shrink-0 mt-0.5">
                {isAdd ? (
                  <CheckCircle className="h-4 w-4 text-brand-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-brand-destructive" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">
                  {formattedDate} at {formattedTime}
                </div>
                <div
                  className={
                    isAdd ? "text-brand-success" : "text-brand-destructive"
                  }
                >
                  {isAdd ? "Earned" : "Lost"} {isAdd ? "+" : ""}
                  {entry.pointsChange} point
                </div>
                {message && (
                  <div className="text-muted-foreground mt-1">{message}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Format progress info for response rate rules, peer reviews, and success rate
function formatProgressInfo(
  slug: string,
  progressInfo: {
    currentPercentage: number;
    requiredPercentage: number;
    totalResponses: number;
    qualifyingResponses: number;
    status: "earned" | "close" | "needs_improvement";
    message: string;
    currentAverage?: number;
    currentCount?: number;
  },
  history?: Array<{
    triggeredAt: string;
    actionType: string;
    pointsChange: number;
    evidence: Record<string, unknown> | null;
  }>
): React.ReactNode {
  const isPeerReviews = slug === "positive_peer_reviews";
  const isSuccessRate = slug === "high_success_rate";

  // For peer reviews, convert percentage back to rating (0-5 scale)
  // currentPercentage = averageRating * 20, so averageRating = currentPercentage / 20
  const currentAverageRating = isPeerReviews
    ? (progressInfo.currentPercentage / 20).toFixed(1)
    : null;
  const requiredAverageRating = isPeerReviews
    ? (progressInfo.requiredPercentage / 20).toFixed(1)
    : null;

  return (
    <div className="space-y-3">
      {/* Current Status Section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BarChart className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Current Status</h4>
        </div>

        {/* User-friendly message */}
        <p className="text-sm">{progressInfo.message}</p>

        {/* Progress bar */}
        <div className="space-y-2 mt-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            {isPeerReviews ? (
              <>
                <span>Current: {currentAverageRating} stars</span>
                <span>Required: {requiredAverageRating} stars</span>
              </>
            ) : (
              <>
                <span>
                  Current: {progressInfo.currentPercentage.toFixed(1)}%
                </span>
                <span>Required: {progressInfo.requiredPercentage}%</span>
              </>
            )}
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                progressInfo.status === "earned"
                  ? "bg-brand-success"
                  : progressInfo.status === "close"
                    ? "bg-brand-warning"
                    : "bg-muted-foreground/40"
              }`}
              style={{
                width: `${Math.min(progressInfo.currentPercentage, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Response count details */}
        <div className="text-xs text-muted-foreground mt-2">
          {isPeerReviews ? (
            <>
              <strong>{progressInfo.totalResponses}</strong> review
              {progressInfo.totalResponses !== 1 ? "s" : ""} with{" "}
              <strong>{currentAverageRating}</strong> average rating
            </>
          ) : isSuccessRate ? (
            <>
              <strong>{progressInfo.qualifyingResponses}</strong> successful out
              of <strong>{progressInfo.totalResponses}</strong> introduction
              {progressInfo.totalResponses !== 1 ? "s" : ""} (
              <strong>{progressInfo.currentPercentage.toFixed(1)}%</strong>{" "}
              success rate)
            </>
          ) : (
            <>
              <strong>{progressInfo.qualifyingResponses}</strong> of{" "}
              <strong>{progressInfo.totalResponses}</strong> responses within 48
              hours
            </>
          )}
        </div>
      </div>

      {/* History Timeline Section */}
      {history && history.length > 0 && formatHistoryTimeline(slug, history)}
    </div>
  );
}

// Format evidence into human-readable text based on rule slug
const CONTACT_IMPORT_EVIDENCE_MESSAGES: Array<{
  slug: string;
  source: string;
  action: string;
}> = [
  { slug: "google_contact_import", source: "Google", action: "imported" },
  { slug: "microsoft_contact_import", source: "Microsoft", action: "imported" },
  { slug: "apple_contact_import", source: "Apple", action: "imported" },
  { slug: "csv_manual_upload", source: "CSV file", action: "uploaded" },
  { slug: "linkedin_zip_import", source: "LinkedIn", action: "imported" },
];

function formatContactImportEvidence({
  slugLower,
  evidence,
}: {
  slugLower: string;
  evidence: Record<string, unknown>;
}): React.ReactNode | null {
  const match = CONTACT_IMPORT_EVIDENCE_MESSAGES.find((entry) =>
    slugLower.includes(entry.slug)
  );
  if (!match) {
    return null;
  }
  const count = evidence?.contactCount as number;
  return (
    <>
      You {match.action} <strong>{count || 0} contacts</strong> from{" "}
      {match.source}.
    </>
  );
}

function formatEvidence(
  slug: string,
  evidence: Record<string, unknown>
): React.ReactNode {
  const slugLower = slug.toLowerCase();

  const contactImportEvidence = formatContactImportEvidence({
    slugLower,
    evidence,
  });
  if (contactImportEvidence) {
    return contactImportEvidence;
  }

  // Verification rules
  if (slugLower === "phone_verified") {
    return <>Your phone number has been verified successfully.</>;
  }

  if (slugLower === "linkedin_oauth_connected") {
    return <>Your LinkedIn account is connected and verified.</>;
  }

  // Performance rules
  if (slugLower === "positive_peer_reviews") {
    const count = evidence?.reviewCount as number;
    const avgRating = evidence?.averageRating as number;
    if (avgRating) {
      return (
        <>
          You received <strong>{count || 0} positive reviews</strong> with an
          average rating of <strong>{avgRating.toFixed(1)} stars</strong>.
        </>
      );
    }
    return (
      <>
        You received <strong>{count || 0} positive reviews</strong> from your
        peers.
      </>
    );
  }

  if (slugLower === "high_success_rate") {
    const rate = evidence?.successRate as number;
    const total = evidence?.totalIntroductions as number;
    if (total) {
      return (
        <>
          You achieved a <strong>{rate || 0}% success rate</strong> across{" "}
          <strong>{total} introductions</strong>.
        </>
      );
    }
    return (
      <>
        You achieved a <strong>{rate || 0}% success rate</strong> on your
        introductions.
      </>
    );
  }

  if (slugLower === "response_within_48h") {
    return <>You responded to an introduction request within 48 hours.</>;
  }

  // Dispute rules
  if (slugLower === "dispute_declined") {
    return <>A dispute was resolved in your favor.</>;
  }

  // Generic fallback - format keys nicely
  const entries = Object.entries(evidence);
  if (entries.length === 0) {
    return <>Achievement unlocked!</>;
  }

  return (
    <ul className="list-disc list-inside space-y-1">
      {entries.map(([key, value]) => (
        <li key={key}>
          <span className="capitalize">
            {key.replace(/([A-Z])/g, " $1").trim()}
          </span>
          : <strong>{String(value)}</strong>
        </li>
      ))}
    </ul>
  );
}

// Brand-token icon wells (tinted square behind the rule icon), mirroring the
// design reference. `iconWell` is a `bg-* text-*` pair used on a rounded well.
const ICON_WELLS = {
  sky: "bg-brand-sky/10 text-brand-sky",
  emerald: "bg-brand-success/10 text-brand-success",
  amethyst: "bg-brand-amethyst/10 text-brand-amethyst",
  gold: "bg-brand-warning/10 text-brand-warning",
  slate: "bg-muted text-foreground",
} as const;

// Provider import rules render the real brand logo (reused from the My Contacts
// source column) on a neutral well so the brand colors read true.
const BRAND_LOGOS: Record<
  string,
  { logo: (props: { className?: string }) => JSX.Element; iconWell: string }
> = {
  google_contact_import: { logo: GoogleLogo, iconWell: ICON_WELLS.slate },
  microsoft_contact_import: { logo: MicrosoftLogo, iconWell: ICON_WELLS.slate },
  apple_contact_import: { logo: AppleLogo, iconWell: ICON_WELLS.slate },
  linkedin_zip_import: { logo: LinkedInLogo, iconWell: ICON_WELLS.slate },
};

// Map rule slugs to an icon + brand-tinted icon well
function getRuleIconAndColor(slug: string): {
  icon: LucideIcon;
  iconWell: string;
} {
  const slugLower = slug.toLowerCase();

  if (slugLower.includes("email") || slugLower.includes("verify-email")) {
    return { icon: Mail, iconWell: ICON_WELLS.sky };
  } else if (
    slugLower.includes("phone") ||
    slugLower.includes("verify-phone")
  ) {
    return { icon: Shield, iconWell: ICON_WELLS.sky };
  } else if (slugLower.includes("linkedin")) {
    return { icon: Building, iconWell: ICON_WELLS.amethyst };
  } else if (slugLower.includes("response")) {
    return { icon: Clock, iconWell: ICON_WELLS.emerald };
  } else if (slugLower.includes("contact") || slugLower.includes("import")) {
    return { icon: Users, iconWell: ICON_WELLS.sky };
  } else if (
    slugLower.includes("success") ||
    slugLower.includes("responder") ||
    slugLower.includes("quality")
  ) {
    return { icon: Star, iconWell: ICON_WELLS.gold };
  } else if (slugLower.includes("review") || slugLower.includes("feedback")) {
    return { icon: MessageSquare, iconWell: ICON_WELLS.emerald };
  } else if (
    slugLower.includes("community") ||
    slugLower.includes("contributor")
  ) {
    return { icon: Users, iconWell: ICON_WELLS.amethyst };
  } else if (
    slugLower.includes("association") ||
    slugLower.includes("professional")
  ) {
    return { icon: Building, iconWell: ICON_WELLS.amethyst };
  } else if (slugLower.includes("member") || slugLower.includes("veteran")) {
    return { icon: UserCheck, iconWell: ICON_WELLS.amethyst };
  } else if (slugLower.includes("dispute")) {
    return { icon: Shield, iconWell: ICON_WELLS.amethyst };
  } else if (slugLower.includes("award") || slugLower.includes("badge")) {
    return { icon: Award, iconWell: ICON_WELLS.gold };
  }

  return { icon: Target, iconWell: ICON_WELLS.amethyst };
}

type TrustScoreRule = TrustScoreRuleCardProps["rule"];

function getProgressRequirementMessage(
  slug: string,
  progressInfo: NonNullable<TrustScoreRule["progressInfo"]>
): string {
  if (slug === "response_within_48h") {
    return `Respond to at least ${progressInfo.requiredPercentage}% of introduction requests within 48 hours to earn points.`;
  }
  if (slug === "high_success_rate") {
    return `Achieve a success rate of at least ${progressInfo.requiredPercentage}% on introductions to earn points.`;
  }
  if (slug === "positive_peer_reviews") {
    const requiredCount =
      (progressInfo as { requiredCount?: number }).requiredCount || 2;
    return `Maintain an average peer review rating of at least ${progressInfo.requiredPercentage} stars from ${requiredCount} reviews to earn points.`;
  }
  return progressInfo.message;
}

function RuleCardIconWell({
  rule,
  isSubtract,
  icon,
  iconWell,
}: {
  rule: TrustScoreRule;
  isSubtract: boolean;
  icon: LucideIcon;
  iconWell: string;
}) {
  const brand = BRAND_LOGOS[rule.slug.toLowerCase()];
  const wellClass = isSubtract
    ? "bg-brand-destructive/10 text-brand-destructive"
    : (brand?.iconWell ?? iconWell);
  const BrandLogo = brand?.logo;
  return (
    <div
      className={cn(
        "grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg",
        wellClass
      )}
    >
      {BrandLogo ? (
        <BrandLogo className="h-6 w-6 shrink-0" />
      ) : (
        <RuleImage icon={icon} slug={rule.slug} size="h-[18px] w-[18px]" />
      )}
    </div>
  );
}

function RulePointsBadge({ rule }: { rule: TrustScoreRule }) {
  const isSubtract = rule.actionType === "SUBTRACT";
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Sparkles
        className={cn(
          "h-3 w-3 flex-shrink-0",
          isSubtract ? "text-brand-destructive" : "text-brand-warning"
        )}
      />
      <span
        className={cn(
          "text-xs font-semibold whitespace-nowrap",
          isSubtract ? "text-brand-destructive" : "text-brand-warning"
        )}
      >
        {isSubtract ? "-" : "+"}
        {rule.points.toFixed(1)} pts
      </span>
    </div>
  );
}

function RuleRequirementHints({
  rule,
  isEarned,
  minContacts,
}: {
  rule: TrustScoreRule;
  isEarned: boolean;
  minContacts: number | null;
}) {
  const showProgress = !isEarned && rule.progressInfo;
  const showMinContacts = !isEarned && minContacts;
  const showDescription = rule.description && !showProgress && !showMinContacts;

  return (
    <>
      {showProgress && rule.progressInfo && (
        <div className="mt-2">
          <div className="text-xs text-muted-foreground">
            {getProgressRequirementMessage(rule.slug, rule.progressInfo)}
          </div>
        </div>
      )}
      {showMinContacts && (
        <div className="mt-2">
          <div className="text-xs text-muted-foreground">
            Import {minContacts} contact{minContacts !== 1 ? "s" : ""} to earn
            points
          </div>
        </div>
      )}
      {showDescription && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {rule.description}
        </p>
      )}
    </>
  );
}

function RuleStatusBadge({
  rule,
  isEarned,
  isDeduction,
  isActionable,
}: {
  rule: TrustScoreRule;
  isEarned: boolean;
  isDeduction?: boolean;
  isActionable: boolean;
}) {
  if (isDeduction || rule.actionType === "SUBTRACT") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-destructive/10 px-2.5 py-1 text-[11px] font-bold text-brand-destructive">
        <XCircle className="h-3 w-3" />
        Penalty
      </span>
    );
  }
  if (isEarned) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-success/10 px-2.5 py-1 text-[11px] font-bold text-brand-success">
        <CheckCircle className="h-3 w-3" />
        Earned
      </span>
    );
  }
  if (isActionable && rule.actionUrl) {
    return (
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-brand-rose">
        Earn
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (!isActionable) {
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
  return null;
}

function RuleCardMainRow({
  rule,
  isEarned,
  isDeduction,
  isSubtract,
  icon,
  iconWell,
  minContacts,
}: {
  rule: TrustScoreRule;
  isEarned: boolean;
  isDeduction?: boolean;
  isSubtract: boolean;
  icon: LucideIcon;
  iconWell: string;
  minContacts: number | null;
}) {
  const isActionable = !!(rule.actionUrl && rule.actionLabel);
  return (
    <div className="flex items-start gap-3 w-full">
      <RuleCardIconWell
        rule={rule}
        isSubtract={isSubtract}
        icon={icon}
        iconWell={iconWell}
      />
      <div className="flex-1 min-w-0 space-y-1">
        <span className="text-sm font-medium block leading-tight">
          {rule.name}
        </span>
        <RulePointsBadge rule={rule} />
        <RuleRequirementHints
          rule={rule}
          isEarned={isEarned}
          minContacts={minContacts}
        />
      </div>
      <div className="flex-shrink-0 ml-auto">
        <RuleStatusBadge
          rule={rule}
          isEarned={isEarned}
          isDeduction={isDeduction}
          isActionable={isActionable}
        />
      </div>
    </div>
  );
}

function getRuleCardContainerClass({
  isDeduction,
  isEarned,
}: {
  isDeduction?: boolean;
  isEarned: boolean;
}) {
  if (isDeduction) {
    return "border-brand-destructive/20 bg-brand-destructive/10";
  }
  if (isEarned) {
    return "border-brand-success/20 bg-brand-success/10 hover:-translate-y-0.5 hover:shadow-brand-card";
  }
  return "border-border bg-secondary";
}

function RuleCollapsibleDetails({
  rule,
  isOpen,
  onOpenChange,
  isEarned,
}: {
  rule: TrustScoreRule;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEarned: boolean;
}) {
  const hasCollapsible =
    (isEarned && rule.evidence) ||
    rule.progressInfo ||
    (rule.history && rule.history.length > 0);
  if (!hasCollapsible) return null;

  const detailContent = rule.progressInfo
    ? formatProgressInfo(rule.slug, rule.progressInfo, rule.history)
    : rule.history && rule.history.length > 0
      ? formatHistoryTimeline(rule.slug, rule.history)
      : formatEvidence(rule.slug, rule.evidence as Record<string, unknown>);

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="mt-2">
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {isOpen ? (
          <>
            <ChevronUp className="h-4 w-4" />
            Hide details
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            Show details
          </>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
          {detailContent}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TrustScoreRuleCardContent({
  rule,
  isEarned,
  isDeduction = false,
}: TrustScoreRuleCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { icon, iconWell } = getRuleIconAndColor(rule.slug);
  const isSubtract = rule.actionType === "SUBTRACT" || isDeduction;
  const isActionable = !!(rule.actionUrl && rule.actionLabel);
  const minContacts = rule.configParams?.min_contacts
    ? Number(rule.configParams.min_contacts)
    : null;

  const mainRow = (
    <RuleCardMainRow
      rule={rule}
      isEarned={isEarned}
      isDeduction={isDeduction}
      isSubtract={isSubtract}
      icon={icon}
      iconWell={iconWell}
      minContacts={minContacts}
    />
  );

  const isClickableAction =
    rule.actionUrl && !isEarned && isActionable && !rule.history;

  if (isClickableAction) {
    return (
      <div
        onClick={() => navigate(rule.actionUrl!)}
        className="group min-h-[95px] cursor-pointer rounded-xl border border-border bg-secondary p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-amethyst/40 hover:bg-brand-amethyst/5 hover:shadow-brand-card"
      >
        {mainRow}
      </div>
    );
  }

  const containerClass = cn(
    "p-4 min-h-[95px] rounded-xl border transition-all duration-300",
    getRuleCardContainerClass({ isDeduction, isEarned })
  );

  return (
    <div className={containerClass}>
      {mainRow}
      <RuleCollapsibleDetails
        rule={rule}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        isEarned={isEarned}
      />
    </div>
  );
}

export function TrustScoreRuleCard(props: TrustScoreRuleCardProps) {
  return <TrustScoreRuleCardContent {...props} />;
}
