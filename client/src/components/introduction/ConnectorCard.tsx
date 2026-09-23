import {
  Building2,
  MapPin,
  Shield,
  Mail,
  Linkedin,
  Globe,
  MessageSquare,
} from "lucide-react";
import { AccountDeletedInfo } from "./AccountDeletedInfo";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { encryptEmail } from "./introductionHelpers";
import { cn } from "@/lib/utils";
import { ConnectorPoolCard } from "./ConnectorPoolCard";

interface ConnectorCardProps {
  connector: {
    id?: string;
    name?: string;
    trustScore?: number;
    photoUrl?: string | null;
    title?: string | null;
    industry?: string | null;
    company?: string | null;
    location?: string | null;
    email?: string | null;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
  };
  stage?: string;
  potentialConnectors?: {
    totalCount: number;
    pendingCount: number;
    declinedCount: number;
    hasAccepted: boolean;
  } | null;
  handleViewReviews: (connector: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => void;
}

export function ConnectorCard({
  connector,
  stage,
  potentialConnectors,
  handleViewReviews,
}: ConnectorCardProps) {
  const hasAccepted = !!potentialConnectors?.hasAccepted;
  const isAwaitingConnector = stage === "awaiting_connector" && !hasAccepted;
  const isArchivedWithoutConnector =
    stage === "archived" && !hasAccepted && !connector.id;

  if (isAwaitingConnector || isArchivedWithoutConnector) {
    return (
      <ConnectorPoolCard
        variant={isArchivedWithoutConnector ? "archived" : "active"}
        potentialConnectors={potentialConnectors}
      />
    );
  }

  const connectorName = connector.name || "Connector";

  return (
    <div className="w-full h-full relative p-5 bg-gradient-to-br from-blue-50/60 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/10 border border-blue-200/50 dark:border-blue-800/40 rounded-xl shadow-sm flex flex-col justify-between overflow-hidden">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#4f86f7] dark:text-blue-400 mb-5 flex justify-between items-center px-0.5">
        <span>CONNECTOR</span>
      </div>

      <div className="flex flex-col gap-5 flex-1">
          {connectorName !== "User's Account deleted" ? (
            <>
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-5 min-w-0 flex-1">
                  {/* Avatar */}
                  <PremiumAvatar
                    name={connectorName}
                    size="md"
                    qualityScore={
                      connector.trustScore != null
                        ? connector.trustScore / 10
                        : 8
                    }
                    imageUrl={connector.photoUrl}
                    className="h-12 w-12 flex-shrink-0"
                  />

                  {/* Details Column */}
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    {/* Row 1: Name + Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-black text-foreground leading-tight break-words min-w-0">
                        {connectorName}
                      </span>
                      {connector.title && (
                        <Badge
                          variant="secondary"
                          className="px-2 py-0.5 h-auto min-h-[20px] text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-none max-w-full break-words"
                          title={connector.title}
                        >
                          <span className="line-clamp-2">
                            {connector.title}
                          </span>
                        </Badge>
                      )}
                      {connector.industry && (
                        <Badge
                          variant="secondary"
                          className="px-2 py-0.5 h-auto min-h-[20px] text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-none max-w-full break-words"
                          title={connector.industry}
                        >
                          <span className="line-clamp-2">
                            {connector.industry}
                          </span>
                        </Badge>
                      )}
                    </div>

                    {/* Row 2: Company */}
                    {connector.company && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-400">
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{connector.company}</span>
                      </div>
                    )}

                    {/* Row 3: Location */}
                    {connector.location && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                        <span className="truncate">{connector.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trust Score (Right) */}
                {connector.trustScore != null && (
                  <div className="flex flex-col items-center flex-shrink-0 ml-4 gap-0.5">
                    <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold text-sm">
                      <Shield className="h-4 w-4" />
                      <span>{connector.trustScore}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                      Trust Score
                    </div>
                  </div>
                )}
              </div>

              <ConnectorActions
                connector={connector}
                handleViewReviews={handleViewReviews}
                connectorName={connectorName}
              />
            </>
          ) : (
            /* Account Deleted Info */
            <div className="flex-1 flex items-center">
              <AccountDeletedInfo variant="blue" className="w-full" />
            </div>
          )}
      </div>
    </div>
  );
}

interface ConnectorActionsProps {
  connector: {
    id?: string;
    email?: string | null;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    trustScore?: number;
  };
  handleViewReviews: (connector: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => void;
  connectorName: string;
}

function ConnectorActions({
  connector,
  handleViewReviews,
  connectorName,
}: ConnectorActionsProps) {
  const actionButtonClass =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-100/50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-blue-900 transition-colors text-[12px] font-medium h-auto border-none";

  return (
    <div className="flex flex-wrap items-center gap-2.5 mt-auto pt-4">
      {/* Email */}
      {connector.email &&
        typeof connector.email === "string" &&
        connector.email.trim() !== "" && (
          <Button variant="ghost" className={actionButtonClass} asChild>
            <a
              href={`mailto:${connector.email}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span
                className="truncate max-w-[150px]"
                title={encryptEmail(connector.email)}
              >
                {encryptEmail(connector.email)}
              </span>
            </a>
          </Button>
        )}

      {/* LinkedIn */}
      {connector.linkedinUrl && (
        <Button variant="ghost" className={actionButtonClass} asChild>
          <a
            href={
              connector.linkedinUrl.startsWith("http")
                ? connector.linkedinUrl
                : `https://linkedin.com/in/${connector.linkedinUrl}`
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
            LinkedIn
          </a>
        </Button>
      )}

      {/* Company Website */}
      {connector.websiteUrl &&
        typeof connector.websiteUrl === "string" &&
        connector.websiteUrl.trim() !== "" && (
          <Button variant="ghost" className={actionButtonClass} asChild>
            <a
              href={
                connector.websiteUrl.startsWith("http")
                  ? connector.websiteUrl
                  : `https://${connector.websiteUrl}`
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="h-3.5 w-3.5 flex-shrink-0" />
              Company Website
            </a>
          </Button>
        )}

      {/* Reviews Button */}
      {connector.id && (
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleViewReviews({
              id: connector.id,
              name: connectorName,
              trustScore: connector.trustScore,
            });
          }}
          className={cn(
            actionButtonClass,
            "ml-auto border border-blue-200 dark:border-blue-800"
          )}
        >
          <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
          Reviews
        </Button>
      )}
    </div>
  );
}
