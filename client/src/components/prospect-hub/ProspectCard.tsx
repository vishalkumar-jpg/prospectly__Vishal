import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import {
  Building2,
  MapPin,
  Users,
  Target,
  Linkedin,
  Globe,
  Briefcase,
  ExternalLink,
  IdCard,
  Landmark,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";
import { AnyType } from "@/types/common";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProspectCardProps {
  prospect: AnyType;
  onRequestToMeet: (prospect: AnyType) => void;
  variant?: "webResult" | "contact";
  isLoading?: boolean;
  isDisabled?: boolean;
}

export function ProspectCard({
  prospect,
  onRequestToMeet,
  variant = "webResult",
  isLoading = false,
  isDisabled = false,
}: ProspectCardProps) {
  const baseBounty = Number(
    prospect.bountyAmount || prospect.bounty_amount || 0
  );

  const data = useMemo(() => {
    const firstName = prospect.firstName || prospect.first_name || "";
    const lastName = prospect.lastName || prospect.last_name || "";

    const fullName =
      prospect.name || `${firstName} ${lastName}`.trim() || "Unknown";

    const title = prospect.title || null;

    const company = prospect.company || prospect.company_name || null;
    const companyType = prospect.companyType || prospect.company_type || null;

    const industry =
      prospect.industry ||
      prospect.companyIndustry ||
      prospect.company_industry ||
      null;

    const email = prospect.email || null;

    const linkedin = prospect.linkedin || prospect.linkedin_url || null;
    const website =
      prospect.website ||
      prospect.companyWebsite ||
      prospect.company_domain ||
      null;

    const city = prospect.city || null;
    const state = prospect.state || null;
    const country = prospect.country || null;

    const location =
      prospect.location ||
      [city, state, country].filter(Boolean).join(", ") ||
      null;

    const companyDescription =
      prospect.companyDescription || prospect.company_description || null;

    const companyLinkedinUrl =
      prospect.companyLinkedinUrl || prospect.company_linkedin_url || null;

    const profilePhotoUrl =
      prospect.profilePhotoUrl || prospect.profile_photo_url || null;

    const linkedinConnections =
      prospect.linkedinConnections || prospect.linkedin_connections || null;

    const employees =
      prospect.employees ||
      prospect.company_employees ||
      prospect.companyEmployees ||
      prospect.companySize ||
      prospect.company_size ||
      null;

    const bountyAmount = Number(
      prospect.bountyAmount || prospect.bounty_amount || 0
    );

    const connectorCount = Number(
      prospect.connectorCount || prospect.connector_count || 0
    );

    return {
      fullName,
      title,
      company,
      companyType,
      industry,
      email,

      linkedin,
      website,
      location,
      companyDescription,
      companyLinkedinUrl,
      profilePhotoUrl,
      linkedinConnections,
      employees,
      bountyAmount,
      connectorCount,
    };
  }, [prospect]);

  const links = useMemo(() => {
    const normalizeUrl = (url: string) =>
      url.startsWith("http") ? url : `https://${url}`;

    const websiteHref = data.website ? normalizeUrl(data.website) : null;

    return {
      personLinkedin: data.linkedin ? normalizeUrl(data.linkedin) : null,
      companyLinkedin: data.companyLinkedinUrl
        ? normalizeUrl(data.companyLinkedinUrl)
        : null,
      websiteHref,
      websiteLabel: websiteHref
        ? websiteHref
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .replace(/\/$/, "")
        : null,
    };
  }, [data.linkedin, data.companyLinkedinUrl, data.website]);

  const contactItems = useMemo(() => {
    const items = [];

    // Personal LinkedIn is rendered inline beside the name (see header),
    // so it is intentionally excluded from this bottom contact list.

    if (links.companyLinkedin) {
      items.push({
        id: "companyLinkedin",
        content: (
          <a
            href={links.companyLinkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-brand-sky/10 transition-colors group/item h-full border border-border hover:border-brand-sky/40 w-full"
          >
            <Linkedin className="h-3.5 w-3.5 text-brand-sky shrink-0" />
            <span className="text-[11.5px] text-foreground font-bold truncate">
              Company LinkedIn
            </span>
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground group-hover/item:text-brand-sky transition-colors" />
          </a>
        ),
      });
    }

    if (links.websiteHref) {
      items.push({
        id: "website",
        content: (
          <a
            href={links.websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-brand-sky/10 transition-colors group/item h-full border border-border hover:border-brand-sky/40 w-full"
          >
            <Globe className="h-3.5 w-3.5 text-brand-sky shrink-0" />
            <span className="text-[11.5px] text-foreground font-bold truncate">
              Company Website
            </span>
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground group-hover/item:text-brand-sky transition-colors" />
          </a>
        ),
      });
    }

    return items;
  }, [data.email, links]);

  // Determine if data is large (title > 30 chars, industry > 20 chars, companyType > 15 chars, or company > 30 chars)
  const isLargeData = useMemo(() => {
    return (
      (data.title && data.title.length > 30) ||
      (data.industry && data.industry.length > 20) ||
      (data.companyType && data.companyType.length > 15) ||
      (data.company && data.company.length > 30)
    );
  }, [data.title, data.industry, data.companyType, data.company]);

  return (
    <Card className="group rounded-2xl border border-border hover:border-brand-amethyst/20 hover:shadow-brand-card transition-all duration-300 hover:-translate-y-1 relative overflow-hidden h-full flex flex-col">
      <div className="flex flex-col p-4 relative flex-1 min-h-0 gap-2">
        {/* ================= HEADER SECTION ================= */}
        <div className="flex items-start gap-2">
          <div className="relative">
            <PremiumAvatar
              name={data.fullName}
              size="md"
              imageUrl={data.profilePhotoUrl}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between pl-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <h3 className="text-[15px] font-extrabold text-foreground leading-tight break-words min-w-0 flex-1">
                    {data.fullName}
                  </h3>
                  {links.personLinkedin && (
                    <a
                      href={links.personLinkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="LinkedIn Profile"
                      className="shrink-0 grid place-items-center h-6 w-6 rounded-md bg-brand-sky/10 text-brand-sky hover:bg-brand-sky/20 transition-colors"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {isLargeData ? (
                  // Line by line layout: title, then industry, then company type, then company
                  <div className="flex flex-col gap-1 mt-0.5">
                    {/* Title */}
                    {data.title && (
                      <div
                        className="flex items-start gap-2 text-[12.5px] font-semibold text-muted-foreground"
                        title={data.title}
                      >
                        <IdCard className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="break-words">{data.title}</span>
                      </div>
                    )}

                    {/* Industry */}
                    {data.industry && (
                      <div
                        className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
                        title={data.industry}
                      >
                        <Briefcase className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{data.industry}</span>
                      </div>
                    )}

                    {/* Company Type */}
                    {data.companyType && (
                      <div
                        className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
                        title={data.companyType}
                      >
                        <Landmark className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{data.companyType}</span>
                      </div>
                    )}

                    {/* Company */}
                    {data.company && (
                      <div
                        className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5"
                        title={data.company}
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">{data.company}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  // Compact layout: title in one line, then industry and company type side by side, then company below
                  <div className="flex flex-col gap-1 mt-0.5">
                    {/* Title */}
                    {data.title && (
                      <div
                        className="flex items-start gap-2 text-[12.5px] font-semibold text-muted-foreground"
                        title={data.title}
                      >
                        <IdCard className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="break-words">{data.title}</span>
                      </div>
                    )}

                    {/* Industry and Company Type side by side */}
                    {(data.industry || data.companyType) && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {data.industry && (
                          <div
                            className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
                            title={data.industry}
                          >
                            <Briefcase className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[120px]">
                              {data.industry}
                            </span>
                          </div>
                        )}
                        {data.companyType && (
                          <div
                            className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
                            title={data.companyType}
                          >
                            <Landmark className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[100px]">
                              {data.companyType}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Company */}
                    {data.company && (
                      <div
                        className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
                        title={data.company}
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">{data.company}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {data.linkedinConnections ? (
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-brand-sky justify-end">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-[12px] font-bold">
                      {data.linkedinConnections}+
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    connections
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ================= LOCATION ================= */}
        {data.location && (
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span
              className="text-[12px] font-semibold text-muted-foreground truncate min-w-0"
              title={data.location}
            >
              {data.location}
            </span>
          </div>
        )}

        {/* ================= ABOUT COMPANY ================= */}
        {/* We keep this conditional as it's often entirely missing in search results, 
            but if we want perfect vertical alignment across all cards in a grid 
            even when some have descriptions and some don't, we'd need fixed height. 
            However, usually location and contact are the main sources of mismatch. */}
        {data.companyDescription && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider">
                <Building2 className="h-3.5 w-3.5" />
                About Company
              </div>
              {data.employees && (
                <div className="text-[11px] font-bold text-brand-sky bg-brand-sky/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {data.employees} employees
                </div>
              )}
            </div>
            <div className="relative">
              <p className="text-[12.5px] text-muted-foreground leading-relaxed break-words line-clamp-2">
                {data.companyDescription}
              </p>
              {String(data.companyDescription).length > 90 && (
                <div className="flex justify-end mt-1">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="rounded text-[12px] font-extrabold text-brand-rose hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        >
                          Read more
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="start"
                        className="p-0 overflow-hidden rounded-xl border-border shadow-2xl w-72 max-w-[90vw] z-[100]"
                      >
                        <div className="p-4 max-h-48 overflow-y-auto text-[12px] text-muted-foreground leading-relaxed break-words bg-popover">
                          {data.companyDescription}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= CONTACT & LINK ================= */}
        {contactItems.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
              Contact & Web
            </div>
            <div className="grid grid-cols-2 gap-2">
              {contactItems.map((item, index) => {
                const isLastItem = index === contactItems.length - 1;
                const isOddCount = contactItems.length % 2 === 1;
                const isFullWidth =
                  contactItems.length === 1 || (isOddCount && isLastItem);

                return (
                  <div
                    key={item.id}
                    className={cn(isFullWidth ? "col-span-2" : "col-span-1")}
                  >
                    {item.content}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= FOOTER - CTA ================= */}
        <div className="pt-2 mt-auto space-y-3">
          <div
            className={cn(
              "px-3 py-3 rounded-xl border text-center",
              data.bountyAmount > 0
                ? "border-brand-success/30 bg-brand-success/10"
                : "border-dashed border-border bg-muted/40"
            )}
          >
            <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
              Referral Payout Amount
            </div>
            {baseBounty > 0 ? (
              <>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-[20px] font-extrabold text-brand-success leading-none">
                    $
                    {baseBounty.toLocaleString(undefined, {
                      minimumFractionDigits: baseBounty % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 py-2">
                <Sparkles className="h-5 w-5 text-brand-amethyst" />
                <span className="text-[12px] font-semibold text-brand-amethyst">
                  Click "More Info Button" for estimate
                </span>
              </div>
            )}
          </div>

          <Button
            className="w-full gap-2 h-10 text-[13.5px] font-bold bg-brand-amethyst/10 text-brand-amethyst border-brand-amethyst/30 hover:bg-brand-amethyst hover:text-brand-foreground transition-colors rounded-lg active:scale-[0.98] disabled:opacity-50
          disabled:cursor-not-allowed"
            onClick={() => onRequestToMeet(prospect)}
            disabled={isDisabled || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                More Info
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
