import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building2,
  Linkedin,
  Globe,
  MapPin,
  Shield,
  CheckCircle,
  ArrowRight,
  Loader2,
  Wallet,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidPhotoUrl } from "@/utils/security";
import type { PublicDealData } from "./types";
import { getInitials } from "./utils";

/**
 * Allowlists http/https URLs before they are used as href/src.
 * Prevents script-scheme URLs (e.g. javascript:) from API-provided strings.
 */
function safeHref(url: string | null | undefined): string | null {
  return isValidPhotoUrl(url) ? (url as string).trim() : null;
}

interface PublicDealDetailProps {
  deal: PublicDealData;
}

export function PublicDealDetail({ deal }: PublicDealDetailProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const company = deal.prospect.company?.trim();
  const { headline, location, organization } = deal.prospect;
  const prospectPhoto = safeHref(deal.prospect.photoUrl);
  const prospectLinkedin = safeHref(deal.prospect.linkedinUrl);
  const orgLogo = safeHref(organization?.logoUrl);
  const orgWebsite = safeHref(organization?.website);
  const orgLinkedin = safeHref(organization?.linkedinUrl);
  const hasOrg =
    !!organization &&
    !!(
      organization.name ||
      orgLogo ||
      organization.industry ||
      organization.description ||
      orgWebsite ||
      orgLinkedin
    );

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
      {/* Prospect */}
      <div className="mb-3.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-amethyst" />
        The Prospect
      </div>
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 flex-shrink-0 ring-2 ring-brand-amethyst/15">
          <AvatarImage src={prospectPhoto || undefined} />
          <AvatarFallback className="bg-brand-gradient text-base font-bold text-white">
            {getInitials(deal.prospect.name ?? "")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-extrabold tracking-tight">
            {deal.prospect.name}
          </h2>
          {deal.prospect.title && (
            <p className="text-sm font-medium text-foreground/80">
              {deal.prospect.title}
            </p>
          )}
          {headline && (
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
              {headline}
            </p>
          )}
          {company && (
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{company}</span>
            </div>
          )}
          {location && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}
          {prospectLinkedin && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              <a
                href={prospectLinkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-brand-sky/15 bg-brand-sky/10 px-3.5 py-1.5 text-xs font-bold text-brand-sky transition-colors hover:bg-brand-sky hover:text-white"
              >
                <Linkedin className="h-3.5 w-3.5" />
                LinkedIn
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Company */}
      {hasOrg && organization && (
        <div className="mt-6 border-t border-border pt-6">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-sky" />
            About the Company
          </div>
          <div className="flex items-start gap-3.5">
            <Avatar className="h-12 w-12 flex-shrink-0 rounded-xl ring-1 ring-border">
              <AvatarImage
                src={orgLogo || undefined}
                className="object-contain"
              />
              <AvatarFallback className="rounded-xl bg-brand-sky/10 text-brand-sky">
                <Building2 className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {organization.name && (
                <p className="font-extrabold tracking-tight">
                  {organization.name}
                </p>
              )}
              {organization.industry && (
                <p className="text-xs text-muted-foreground">
                  {organization.industry}
                </p>
              )}
              {organization.description && (
                <>
                  <p
                    className={cn(
                      "mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-muted-foreground",
                      !descExpanded && "line-clamp-3"
                    )}
                  >
                    {organization.description}
                  </p>
                  {organization.description.length > 160 && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-1 text-[11px] font-extrabold text-brand-amethyst underline-offset-2 hover:text-brand-rose hover:underline"
                    >
                      {descExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                </>
              )}
              {(orgWebsite || orgLinkedin) && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {orgWebsite && (
                    <a
                      href={orgWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-foreground hover:text-background"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                  {orgLinkedin && (
                    <a
                      href={orgLinkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-brand-sky/15 bg-brand-sky/10 px-3.5 py-1.5 text-xs font-bold text-brand-sky transition-colors hover:bg-brand-sky hover:text-white"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                      Company
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meeting agenda */}
      <div className="mt-6 border-t border-border pt-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-rose/10 text-brand-rose">
            <CalendarClock className="h-[18px] w-[18px]" />
          </div>
          <h3 className="text-lg font-extrabold tracking-tight">
            {deal.prospect.name?.trim()
              ? `Why we want to meet ${deal.prospect.name.trim()}`
              : "Meeting Agenda"}
          </h3>
        </div>
        <p className="mb-1.5 font-semibold">{deal.meetingAgenda.title}</p>
        <p className="max-w-[680px] whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
          {deal.meetingAgenda.description}
        </p>
      </div>
    </section>
  );
}

interface PublicDealEarningsProps {
  deal: PublicDealData;
  claiming: boolean;
  onClaim: () => void;
}

export function PublicDealEarnings({
  deal,
  claiming,
  onClaim,
}: PublicDealEarningsProps) {
  return (
    <div className="overflow-hidden rounded-2xl border-[1.5px] border-brand-amethyst/25 bg-gradient-to-b from-card to-brand-amethyst/10 shadow-brand-card">
      <div className="border-b border-dashed border-brand-amethyst/15 px-5 pb-3.5 pt-4 text-center">
        <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-brand-amethyst/15 bg-card px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-brand-amethyst">
          <Sparkles className="h-3 w-3" />
          Referral Reward
        </div>
        <div className="text-brand-gradient text-[42px] font-extrabold leading-none tracking-tight">
          ${deal.claimerShare.toLocaleString()}
          <span className="align-top text-2xl">*</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Paid when the meeting is completed
        </div>
      </div>

      <div className="flex flex-col gap-2.5 bg-card px-5 pb-5 pt-4">
        <Button
          size="lg"
          onClick={onClaim}
          disabled={claiming}
          className="w-full gap-2 bg-brand-gradient text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
        >
          {claiming ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              Claim This Intro
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
        <div className="flex items-center justify-center gap-4 text-[11.5px] font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-brand-success" />
            Secure
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5 text-brand-success" />
            Free
          </span>
          <span className="inline-flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5 text-brand-success" />
            Verified payout
          </span>
        </div>
      </div>
    </div>
  );
}
