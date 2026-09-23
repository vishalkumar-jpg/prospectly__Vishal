import {
  Building2,
  MapPin,
  Shield,
  Mail,
  Linkedin,
  Globe,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { AccountDeletedInfo } from "./AccountDeletedInfo";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { Badge } from "@/components/ui/badge";
import { encryptEmail } from "./introductionHelpers";
import { UserOrganizationsSection } from "@/components/shared/UserOrganizationsSection";

interface RequesterCardProps {
  introduction: {
    requesterName: string;
    requesterTrustScore?: number;
    requesterPhotoUrl?: string | null;
    requesterTitle?: string | null;
    requesterIndustry?: string | null;
    requesterCompany?: string | null;
    requesterLocation?: string | null;
    requesterEmail?: string | null;
    requesterLinkedinUrl?: string | null;
    requesterWebsiteUrl?: string | null;
    requesterId?: string;
    requesterOrganizations?: Array<{
      id: string;
      name: string;
      isVerified: boolean;
    }>;
  };
  handleViewReviews: (requester: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => void;
}

export function RequesterCard({
  introduction,
  handleViewReviews,
}: RequesterCardProps) {
  return (
    <div className="w-full h-full relative p-5 bg-gradient-to-br from-blue-50/60 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/10 border border-blue-200/50 dark:border-blue-800/40 rounded-xl shadow-sm flex flex-col justify-between">
      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/70 mb-4">
        REQUESTER
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-4 flex-1">
        {introduction.requesterName !== "User's Account deleted" &&
        introduction.requesterName !== "Unknown" ? (
          <>
            <div className="flex justify-between items-start gap-4">
              <div className="flex gap-5 min-w-0 flex-1">
                {/* Avatar */}
                <PremiumAvatar
                  name={introduction.requesterName}
                  size="md"
                  qualityScore={
                    introduction.requesterTrustScore != null
                      ? introduction.requesterTrustScore / 10
                      : 8
                  }
                  imageUrl={introduction.requesterPhotoUrl}
                  className="h-12 w-12 flex-shrink-0"
                />

                {/* Details Column */}
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  {/* Row 1: Name + Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-foreground leading-tight break-words min-w-0">
                      {introduction.requesterName}
                    </span>
                    {introduction.requesterTitle && (
                      <Badge
                        variant="secondary"
                        className="px-2 py-0.5 h-auto min-h-[20px] text-[10px] font-medium bg-blue-100 text-blue-700 hover:!bg-blue-700 hover:!text-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:!bg-blue-400 dark:hover:!text-blue-900 border-none max-w-full break-words"
                        title={introduction.requesterTitle}
                      >
                        <span className="line-clamp-2">
                          {introduction.requesterTitle}
                        </span>
                      </Badge>
                    )}
                    {introduction.requesterIndustry && (
                      <Badge
                        variant="secondary"
                        className="px-2 py-0.5 h-auto min-h-[20px] text-[10px] font-medium bg-blue-100 text-blue-700 hover:!bg-blue-700 hover:!text-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:!bg-blue-400 dark:hover:!text-blue-900 border-none max-w-full break-words"
                        title={introduction.requesterIndustry}
                      >
                        <span className="line-clamp-2">
                          {introduction.requesterIndustry}
                        </span>
                      </Badge>
                    )}
                  </div>

                  {/* Row 2: Company */}
                  {introduction.requesterCompany && (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-400">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {introduction.requesterCompany}
                      </span>
                    </div>
                  )}

                  {/* Row 3: Location */}
                  {introduction.requesterLocation && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                      <span className="truncate">
                        {introduction.requesterLocation}
                      </span>
                    </div>
                  )}

                  <UserOrganizationsSection
                    organizations={introduction.requesterOrganizations}
                  />
                </div>
              </div>

              {/* Trust Score (Right) */}
              {introduction.requesterTrustScore != null && (
                <div className="flex flex-col items-center flex-shrink-0 ml-4 gap-0.5">
                  <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold text-sm">
                    <Shield className="h-4 w-4" />
                    <span>{introduction.requesterTrustScore}</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                    Trust Score
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Row: Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
              {/* Email */}
              {introduction.requesterEmail &&
                typeof introduction.requesterEmail === "string" &&
                introduction.requesterEmail.trim() !== "" && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-100/50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-700 hover:bg-blue-700 hover:text-blue-100 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-blue-900 transition-colors text-[12px] font-medium max-w-full">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span
                      className="truncate max-w-[150px]"
                      title={encryptEmail(introduction.requesterEmail)}
                    >
                      {encryptEmail(introduction.requesterEmail)}
                    </span>
                  </div>
                )}

              {/* LinkedIn */}
              {introduction.requesterLinkedinUrl && (
                <a
                  href={
                    introduction.requesterLinkedinUrl.startsWith("http")
                      ? introduction.requesterLinkedinUrl
                      : `https://linkedin.com/in/${introduction.requesterLinkedinUrl}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-100/50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-700 hover:bg-blue-700 hover:text-blue-100 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-blue-900 transition-colors text-[12px] font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                  LinkedIn
                </a>
              )}

              {/* Website */}
              {introduction.requesterWebsiteUrl &&
                introduction.requesterWebsiteUrl.trim() !== "" && (
                  <a
                    href={
                      introduction.requesterWebsiteUrl.startsWith("http")
                        ? introduction.requesterWebsiteUrl
                        : `https://${introduction.requesterWebsiteUrl}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-100/50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-700 hover:bg-blue-700 hover:text-blue-100 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-blue-900 transition-colors text-[12px] font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                    Company Website
                  </a>
                )}

              {/* Reviews Button */}
              {introduction.requesterId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewReviews({
                      id: introduction.requesterId,
                      name: introduction.requesterName,
                      trustScore: introduction.requesterTrustScore,
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100/50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-700 hover:bg-blue-700 hover:text-blue-100 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-blue-900 transition-colors text-[12px] font-medium ml-auto border border-blue-200 dark:border-blue-800"
                >
                  <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                  Reviews
                </button>
              )}
            </div>
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
