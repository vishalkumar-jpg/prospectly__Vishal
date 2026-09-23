import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import {
  Building2,
  Briefcase,
  Users,
  MapPin,
  Linkedin,
  Globe,
} from "lucide-react";
import {
  InboxRequest,
  normalizeLinkedInUrl,
  normalizeWebsiteUrl,
} from "./inboxUtils";
import { UserOrganizationsSection } from "@/components/shared/UserOrganizationsSection";
import { AccountDeletedInfo } from "./AccountDeletedInfo";

interface InboxCardProspectProps {
  request: InboxRequest;
  contactFullName: string;
}

const PILL_CLASS =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border bg-card text-foreground transition-colors hover:border-brand-amethyst/40 hover:bg-brand-amethyst/10 hover:text-brand-amethyst max-w-full";

export function InboxCardProspect({
  request,
  contactFullName,
}: InboxCardProspectProps) {
  const contact = request.contact;
  const isDeleted =
    contactFullName === "User's Account deleted" ||
    contactFullName === "Unknown";

  const jobTitle = contact?.jobTitle || contact?.title;
  const linkedInValue =
    contact?.linkedin || contact?.linkedIn || contact?.linkedinUrl;

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Accent header */}
      <div className="flex min-h-[2.875rem] items-center justify-between gap-2 border-b border-brand-amethyst/20 bg-brand-amethyst/[0.06] px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-brand-amethyst">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-amethyst" />
          Prospect
        </span>
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
                name={contactFullName}
                size="sm"
                showPurpleRing={false}
                fallbackBgColor="bg-brand-success"
                fallbackTextColor="text-brand-foreground"
                imageUrl={request.contactPhotoUrl}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="break-words text-[14px] font-extrabold leading-tight text-foreground">
                  {contactFullName}
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
              {contact?.industry && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-brand-amethyst" />
                  <span className="truncate">{contact.industry}</span>
                </div>
              )}
              {contact?.company && (
                <div className="flex items-center gap-2 text-[11.5px] font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-brand-amethyst" />
                  <span className="truncate">{contact.company}</span>
                </div>
              )}
              {contact?.employees && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Users className="h-3.5 w-3.5 flex-shrink-0 text-brand-amethyst" />
                  <span className="truncate">
                    {contact.employees} employees
                  </span>
                </div>
              )}
              {contact?.location && (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-brand-amethyst" />
                  <span className="truncate">{contact.location}</span>
                </div>
              )}
            </div>

            {/* Organizations */}
            {contact?.organizations && contact.organizations.length > 0 && (
              <UserOrganizationsSection
                organizations={contact.organizations}
                variant="purple"
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

              {contact?.websiteUrl && (
                <a
                  href={normalizeWebsiteUrl(contact.websiteUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={PILL_CLASS}
                >
                  <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                  Company Website
                </a>
              )}

              {contact?.companyLinkedinUrl && (
                <a
                  href={normalizeWebsiteUrl(contact.companyLinkedinUrl)}
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
