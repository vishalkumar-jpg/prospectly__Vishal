import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, Globe, Linkedin, User, Briefcase } from "lucide-react";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { UserOrganizationsSection } from "@/components/shared/UserOrganizationsSection";
import { AccountDeletedInfo } from "./AccountDeletedInfo";

interface Organization {
  id: string;
  name: string;
  isVerified?: boolean;
}

interface RequesterDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  requester: {
    id?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    company?: string;
    jobTitle?: string;
    industry?: string;
    bio?: string;
    websiteUrl?: string;
    linkedinUrl?: string;
    linkedin_id?: string;
    current_trust_score?: number;
    profilePhotoUrl?: string | null;
    organizations?: Organization[];
    location?: string | null;
    products?: string | null;
    uniqueSellingProposition?: string | null;
    targetMarket?: string | null;
    companySize?: string | null;
    revenueRange?: string | null;
    keyCredentials?: string | null;
  } | null;
  photoUrl?: string | null;
}

const ensureUrlHasScheme = (url: string, defaultDomain?: string): string => {
  if (!url) return "";
  let normalized = url.trim();

  // Remove existing protocol
  normalized = normalized.replace(/^(https?:\/\/)/i, "");

  if (defaultDomain === "linkedin.com") {
    // If it's just the handle, prepend the full path
    if (!normalized.includes("linkedin.com")) {
      // Remove leading /in/ if user provided it but without domain
      normalized = normalized.replace(/^(\/in\/|in\/)/i, "");
      return `https://linkedin.com/in/${normalized}`;
    }
    return `https://${normalized}`;
  }

  // For other websites
  return `https://${normalized}`;
};

export function RequesterDetailsPopup({
  isOpen,
  onClose,
  requester,
  photoUrl,
}: RequesterDetailsPopupProps) {
  if (!requester) return null;

  const fullName =
    requester.full_name ||
    `${requester.first_name || ""} ${requester.last_name || ""}`.trim() ||
    "Unknown";

  const linkedinUrl = requester.linkedinUrl || requester.linkedin_id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" mobileFullscreen>
        <DialogHeader>
          <DialogTitle className="sr-only">Requester Profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center pt-2">
          {/* Avatar and Name */}
          <PremiumAvatar
            name={fullName}
            size="lg"
            qualityScore={(requester.current_trust_score ?? 80) / 10}
            imageUrl={photoUrl || requester.profilePhotoUrl}
          />
          <h3 className="mt-4 text-xl font-bold text-foreground">{fullName}</h3>
          {fullName === "User's Account deleted" && (
            <div className="mt-4 w-full px-4">
              <AccountDeletedInfo variant="blue" />
            </div>
          )}

          {/* Job Title & Company */}
          {(requester.jobTitle || requester.company) && (
            <p className="mt-1 text-sm text-muted-foreground text-center">
              {requester.jobTitle && (
                <span className="font-medium">{requester.jobTitle}</span>
              )}
              {requester.jobTitle && requester.company && " at "}
              {requester.company && <span>{requester.company}</span>}
            </p>
          )}

          {/* Trust Score and Links Row */}
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            {/* Trust Score Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 hover:bg-green-700 hover:text-green-100 dark:text-green-300 dark:hover:bg-green-300 dark:hover:text-green-900 text-sm font-semibold">
              <Star className="h-4 w-4" />
              Trust Score: {requester.current_trust_score || 0}
            </div>
            {/* LinkedIn */}
            {linkedinUrl && (
              <a
                href={ensureUrlHasScheme(linkedinUrl, "linkedin.com")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A66C2] text-white text-[11px] font-semibold hover:bg-[#084d91] transition-colors shadow-sm"
                data-testid="link-requester-linkedin-popup"
              >
                <Linkedin className="h-3.5 w-3.5" />
                <span>LinkedIn</span>
              </a>
            )}
            {/* Website */}
            {requester.websiteUrl && (
              <a
                href={ensureUrlHasScheme(requester.websiteUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                data-testid="link-requester-website-popup"
              >
                <Globe className="h-4 w-4" />
                <span>Website</span>
              </a>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="mt-6 space-y-4">
          {/* Industry */}
          {requester.industry && (
            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Industry
                </div>
                <p className="text-sm text-foreground">{requester.industry}</p>
              </div>
            </div>
          )}

          {/* Location */}
          {requester.location && (
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Location
                </div>
                <p className="text-sm text-foreground">{requester.location}</p>
              </div>
            </div>
          )}

          {/* Bio */}
          {requester.bio && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Professional Bio
                </div>
                <div className="max-h-40 overflow-y-auto pr-2">
                  <p className="text-sm text-foreground leading-relaxed">
                    {requester.bio}
                  </p>
                </div>
              </div>
            </div>
          )}

          <UserOrganizationsSection
            organizations={requester.organizations?.map((o) => ({
              id: o.id,
              name: o.name,
              isVerified: !!o.isVerified,
            }))}
            className="flex-1 min-w-0"
          />

          {/* Business Profile Details */}
          {(requester.products ||
            requester.uniqueSellingProposition ||
            requester.targetMarket ||
            requester.companySize ||
            requester.revenueRange ||
            requester.keyCredentials) && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <h4 className="text-sm font-bold text-foreground">
                Business Profile
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {requester.products && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Products
                    </div>
                    <p className="text-sm text-foreground">
                      {requester.products}
                    </p>
                  </div>
                )}
                {requester.uniqueSellingProposition && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Unique Selling Proposition
                    </div>
                    <p className="text-sm text-foreground">
                      {requester.uniqueSellingProposition}
                    </p>
                  </div>
                )}
                {requester.targetMarket && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Target Market
                    </div>
                    <p className="text-sm text-foreground">
                      {requester.targetMarket}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {requester.companySize && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Company Size
                      </div>
                      <p className="text-sm text-foreground">
                        {requester.companySize}
                      </p>
                    </div>
                  )}
                  {requester.revenueRange && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Revenue Range
                      </div>
                      <p className="text-sm text-foreground">
                        {requester.revenueRange}
                      </p>
                    </div>
                  )}
                </div>
                {requester.keyCredentials && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Key Credentials
                    </div>
                    <p className="text-sm text-foreground">
                      {requester.keyCredentials}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
