import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import {
  Briefcase,
  Building2,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Users,
} from "lucide-react";
import { encryptEmail } from "./introductionHelpers";
import { normalizeLinkedInUrl, normalizeWebsiteUrl } from "./inboxUtils";
import { AccountDeletedInfo } from "./AccountDeletedInfo";

interface ArchiveCardProspectProps {
  prospectName: string;
  prospectPhotoUrl?: string | null;
  prospectTitle?: string | null;
  prospectIndustry?: string | null;
  prospectCompany?: string | null;
  prospectEmployees?: string | null;
  prospectLocation?: string | null;
  prospectLinkedinConnections?: string | null;
  prospectEmail?: string | null;
  prospectLinkedinUrl?: string | null;
  prospectWebsiteUrl?: string | null;
  prospectCompanyLinkedinUrl?: string | null;
}

const PILL_CLASS =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border bg-card text-foreground transition-colors hover:border-brand-amethyst/40 hover:bg-brand-amethyst/10 hover:text-brand-amethyst max-w-full";

export function ArchiveCardProspect({
  prospectName,
  prospectPhotoUrl,
  prospectTitle,
  prospectIndustry,
  prospectCompany,
  prospectEmployees,
  prospectLocation,
  prospectLinkedinConnections,
  prospectEmail,
  prospectLinkedinUrl,
  prospectWebsiteUrl,
  prospectCompanyLinkedinUrl,
}: ArchiveCardProspectProps) {
  const isDeleted = prospectName === "User's Account deleted";

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Accent header */}
      <div className="flex min-h-[2.875rem] items-center justify-between gap-2 border-b border-brand-amethyst/20 bg-brand-amethyst/[0.06] px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-brand-amethyst">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-amethyst" />
          Prospect
        </span>
        {!isDeleted && prospectLinkedinConnections && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[12.5px] font-bold text-foreground">
            <Users className="h-3.5 w-3.5 text-brand-amethyst" />
            {prospectLinkedinConnections}+
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Connections
            </span>
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-3.5">
        {isDeleted ? (
          <div className="flex flex-1 items-center">
            <AccountDeletedInfo variant="purple" className="w-full" />
          </div>
        ) : (
          <>
            {/* Identity */}
            <div className="flex items-center gap-3">
              <PremiumAvatar
                name={prospectName}
                size="sm"
                showPurpleRing={false}
                fallbackBgColor="bg-brand-success"
                fallbackTextColor="text-brand-foreground"
                imageUrl={prospectPhotoUrl}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="break-words text-[14px] font-extrabold leading-tight text-foreground">
                  {prospectName}
                </span>
                {prospectTitle && (
                  <span
                    className="truncate text-[11.5px] font-medium text-muted-foreground"
                    title={prospectTitle}
                  >
                    {prospectTitle}
                  </span>
                )}
              </div>
            </div>

            {/* Facts */}
            <div className="flex flex-col gap-2">
              {prospectIndustry && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-brand-amethyst" />
                  <span className="truncate">{prospectIndustry}</span>
                </div>
              )}
              {prospectCompany && (
                <div className="flex items-center gap-2 text-[11.5px] font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-brand-amethyst" />
                  <span className="truncate">{prospectCompany}</span>
                </div>
              )}
              {prospectEmployees && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Users className="h-3.5 w-3.5 flex-shrink-0 text-brand-amethyst" />
                  <span className="truncate">
                    {prospectEmployees} employees
                  </span>
                </div>
              )}
              {prospectLocation && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-brand-amethyst" />
                  <span className="truncate">{prospectLocation}</span>
                </div>
              )}
            </div>

            {/* Footer pill links */}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-2.5">
              {prospectEmail && prospectEmail.trim() !== "" && (
                <a
                  href={`mailto:${prospectEmail}`}
                  onClick={(e) => e.stopPropagation()}
                  className={PILL_CLASS}
                  title={encryptEmail(prospectEmail)}
                >
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[150px]">
                    {encryptEmail(prospectEmail)}
                  </span>
                </a>
              )}

              {prospectLinkedinUrl && (
                <a
                  href={normalizeLinkedInUrl(prospectLinkedinUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={PILL_CLASS}
                >
                  <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                  LinkedIn
                </a>
              )}

              {prospectWebsiteUrl && prospectWebsiteUrl.trim() !== "" && (
                <a
                  href={normalizeWebsiteUrl(prospectWebsiteUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={PILL_CLASS}
                >
                  <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                  Company Website
                </a>
              )}

              {prospectCompanyLinkedinUrl &&
                prospectCompanyLinkedinUrl.trim() !== "" && (
                  <a
                    href={normalizeLinkedInUrl(prospectCompanyLinkedinUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={PILL_CLASS}
                  >
                    <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                    Company LinkedIn
                  </a>
                )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
