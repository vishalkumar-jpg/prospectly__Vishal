import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Building2,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  MessageSquare,
  Shield,
} from "lucide-react";
import {
  encryptEmail,
  type PotentialConnectorsSummary,
} from "./introductionHelpers";
import { normalizeLinkedInUrl, normalizeWebsiteUrl } from "./inboxUtils";
import { ConnectorPoolCard } from "./ConnectorPoolCard";
import { AccountDeletedInfo } from "./AccountDeletedInfo";

interface ArchiveCardConnectorProps {
  connectorId?: string;
  connectorName: string | null;
  connectorPhotoUrl?: string | null;
  connectorTitle?: string | null;
  connectorIndustry?: string | null;
  connectorCompany?: string | null;
  connectorLocation?: string | null;
  connectorTrustScore?: number;
  connectorEmail?: string | null;
  connectorLinkedinUrl?: string | null;
  connectorWebsiteUrl?: string | null;
  showConnectorPool: boolean;
  potentialConnectors?: PotentialConnectorsSummary | null;
  onViewReviews: (connector: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => void;
}

const PILL_CLASS =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border bg-card text-foreground transition-colors hover:border-brand-sky/40 hover:bg-brand-sky/10 hover:text-brand-sky max-w-full";

export function ArchiveCardConnector({
  connectorId,
  connectorName,
  connectorPhotoUrl,
  connectorTitle,
  connectorIndustry,
  connectorCompany,
  connectorLocation,
  connectorTrustScore,
  connectorEmail,
  connectorLinkedinUrl,
  connectorWebsiteUrl,
  showConnectorPool,
  potentialConnectors,
  onViewReviews,
}: ArchiveCardConnectorProps) {
  if (showConnectorPool) {
    return (
      <ConnectorPoolCard
        variant="archived"
        potentialConnectors={potentialConnectors}
      />
    );
  }

  const isDeleted = connectorName === "User's Account deleted";
  const displayName = connectorName || "Connector";

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Accent header */}
      <div className="flex min-h-[2.875rem] items-center justify-between gap-2 border-b border-brand-sky/20 bg-brand-sky/10 px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-brand-sky">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-sky" />
          Connector
        </span>
        {connectorTrustScore != null && !isDeleted && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[12.5px] font-bold text-foreground">
            <Shield className="h-3.5 w-3.5 text-brand-sky" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Trust
            </span>
            {connectorTrustScore}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-3.5">
        {isDeleted ? (
          <div className="flex flex-1 items-center">
            <AccountDeletedInfo variant="blue" className="w-full" />
          </div>
        ) : (
          <>
            {/* Identity */}
            <div className="flex items-center gap-3">
              <PremiumAvatar
                name={displayName}
                size="sm"
                showPurpleRing={false}
                fallbackBgColor="bg-brand-gradient"
                fallbackTextColor="text-brand-foreground"
                imageUrl={connectorPhotoUrl}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="break-words text-[14px] font-extrabold leading-tight text-foreground">
                  {displayName}
                </span>
                {connectorTitle && (
                  <span
                    className="truncate text-[11.5px] font-medium text-muted-foreground"
                    title={connectorTitle}
                  >
                    {connectorTitle}
                  </span>
                )}
              </div>
            </div>

            {/* Facts */}
            <div className="flex flex-col gap-2">
              {connectorIndustry && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-brand-sky" />
                  <span className="truncate">{connectorIndustry}</span>
                </div>
              )}
              {connectorCompany && (
                <div className="flex items-center gap-2 text-[11.5px] font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-brand-sky" />
                  <span className="truncate">{connectorCompany}</span>
                </div>
              )}
              {connectorLocation && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-brand-sky" />
                  <span className="truncate">{connectorLocation}</span>
                </div>
              )}
            </div>

            {/* Footer pill links */}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-2.5">
              {connectorEmail && connectorEmail.trim() !== "" && (
                <a
                  href={`mailto:${connectorEmail}`}
                  onClick={(e) => e.stopPropagation()}
                  className={PILL_CLASS}
                  title={encryptEmail(connectorEmail)}
                >
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[150px]">
                    {encryptEmail(connectorEmail)}
                  </span>
                </a>
              )}

              {connectorLinkedinUrl && (
                <a
                  href={normalizeLinkedInUrl(connectorLinkedinUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={PILL_CLASS}
                >
                  <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                  LinkedIn
                </a>
              )}

              {connectorWebsiteUrl && connectorWebsiteUrl.trim() !== "" && (
                <a
                  href={normalizeWebsiteUrl(connectorWebsiteUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={PILL_CLASS}
                >
                  <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                  Company Website
                </a>
              )}

              {connectorId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewReviews({
                      id: connectorId,
                      name: connectorName ?? undefined,
                      trustScore: connectorTrustScore,
                    });
                  }}
                  className={cn(PILL_CLASS, "h-auto")}
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
