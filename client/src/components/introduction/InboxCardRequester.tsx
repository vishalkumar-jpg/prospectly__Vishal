import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Briefcase,
  MapPin,
  Shield,
  Phone,
  Linkedin,
  Globe,
  MessageSquare,
  User,
} from "lucide-react";
import { AccountDeletedInfo } from "./AccountDeletedInfo";
import {
  InboxRequest,
  normalizeLinkedInUrl,
  normalizeWebsiteUrl,
} from "./inboxUtils";
import { AnyType } from "@/types/common";
import { UserOrganizationsSection } from "@/components/shared/UserOrganizationsSection";
import { cn } from "@/lib/utils";

interface InboxCardRequesterProps {
  request: InboxRequest;
  requesterName: string;
  setSelectedRequesterDetails: (details: AnyType) => void;
  setIsRequesterPopupOpen: (open: boolean) => void;
  handleViewReviews: (details: AnyType) => void;
}

const PILL_CLASS =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border bg-card text-foreground transition-colors hover:border-brand-sky/40 hover:bg-brand-sky/10 hover:text-brand-sky max-w-full";

export function InboxCardRequester({
  request,
  requesterName,
  setSelectedRequesterDetails,
  setIsRequesterPopupOpen,
  handleViewReviews,
}: InboxCardRequesterProps) {
  const requester = request.requester;
  const isDeleted =
    requesterName === "User's Account deleted" || requesterName === "Unknown";

  const jobTitle = requester?.jobTitle || requester?.title;
  const linkedInValue =
    requester?.linkedIn || requester?.linkedinUrl || requester?.linkedin_id;
  const trustScore = requester?.current_trust_score;

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Accent header */}
      <div className="flex min-h-[2.875rem] items-center justify-between gap-2 border-b border-brand-sky/20 bg-brand-sky/10 px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-brand-sky">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-sky" />
          Requester
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[12.5px] font-bold text-foreground">
          <Shield className="h-3.5 w-3.5 text-brand-sky" />
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Trust
          </span>
          {trustScore != null ? trustScore : "—"}
        </span>
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
                name={requesterName}
                size="sm"
                showPurpleRing={false}
                fallbackBgColor="bg-brand-gradient"
                fallbackTextColor="text-brand-foreground"
                imageUrl={request.requesterPhotoUrl}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="break-words text-[14px] font-extrabold leading-tight text-foreground">
                  {requesterName}
                </span>
                {jobTitle && (
                  <span
                    className="truncate text-[11.5px] font-medium text-muted-foreground"
                    title={jobTitle}
                  >
                    {jobTitle}
                  </span>
                )}
              </div>
            </div>

            {/* Facts */}
            <div className="flex flex-col gap-2">
              {requester?.industry && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-brand-sky" />
                  <span className="truncate">{requester.industry}</span>
                </div>
              )}
              {requester?.company && (
                <div className="flex items-center gap-2 text-[11.5px] font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-brand-sky" />
                  <span className="truncate">{requester.company}</span>
                </div>
              )}
              {requester?.location && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-brand-sky" />
                  <span className="truncate">{requester.location}</span>
                </div>
              )}
              {requester?.phone && requester.phone.trim() !== "" && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0 text-brand-sky" />
                  <span className="truncate">{requester.phone}</span>
                </div>
              )}
            </div>

            {/* Organizations */}
            {requester?.organizations && requester.organizations.length > 0 && (
              <UserOrganizationsSection
                organizations={requester.organizations}
                hideHeader
              />
            )}

            {/* Footer pill links */}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-2.5">
              {linkedInValue && (
                <a
                  href={normalizeLinkedInUrl(linkedInValue)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={PILL_CLASS}
                >
                  <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                  LinkedIn
                </a>
              )}

              {requester?.websiteUrl && (
                <a
                  href={normalizeWebsiteUrl(requester.websiteUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={PILL_CLASS}
                >
                  <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                  Company Website
                </a>
              )}

              {trustScore != null && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewReviews({
                      name: requesterName,
                      trustScore,
                      id: requester?.id,
                    });
                  }}
                  className={cn(PILL_CLASS, "h-auto")}
                >
                  <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                  Reviews
                </Button>
              )}

              {requester?.bio && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRequesterDetails({
                      requester,
                      photoUrl: request.requesterPhotoUrl || null,
                    });
                    setIsRequesterPopupOpen(true);
                  }}
                  className={cn(PILL_CLASS, "h-auto")}
                >
                  <User className="h-3.5 w-3.5 flex-shrink-0" />
                  View Profile
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
