import {
  Building2,
  Users,
  MapPin,
  Mail,
  Linkedin,
  Globe,
  AlertCircle,
} from "lucide-react";
import { AccountDeletedInfo } from "./AccountDeletedInfo";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { Badge } from "@/components/ui/badge";
import { UserOrganizationsSection } from "@/components/shared/UserOrganizationsSection";
import { encryptEmail } from "./introductionHelpers";

interface ProspectCardProps {
  prospect: {
    name: string;
    photoUrl?: string | null;
    title?: string | null;
    industry?: string | null;
    company?: string | null;
    employees?: string | null;
    location?: string | null;
    linkedinConnections?: string | null;
    email?: string | null;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    companyLinkedinUrl?: string | null;
    organizations?: Array<{
      id: string;
      name: string;
      isVerified: boolean;
    }>;
  };
}

export function ProspectCard({ prospect }: ProspectCardProps) {
  return (
    <div className="w-full h-full relative p-5 bg-gradient-to-br from-purple-50/60 to-purple-50/30 dark:from-purple-950/30 dark:to-purple-950/10 border border-purple-200/50 dark:border-purple-800/40 rounded-xl shadow-sm flex flex-col justify-between">
      <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600/70 dark:text-purple-400/70 mb-4">
        PROSPECT
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-4 flex-1">
        <div className="flex justify-between items-start gap-4">
          <div className="flex gap-5 min-w-0 flex-1">
            {/* Avatar */}
            <PremiumAvatar
              name={prospect.name}
              size="md"
              qualityScore={8}
              imageUrl={prospect.photoUrl}
              className="h-12 w-12 flex-shrink-0"
            />

            {/* Details Column */}
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              {/* Row 1: Name + Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-foreground leading-tight break-words min-w-0">
                  {prospect.name}
                </span>
                {prospect.title && (
                  <Badge
                    variant="secondary"
                    className="px-2 py-0.5 h-auto min-h-[20px] text-[10px] font-medium bg-purple-100 text-purple-700 hover:!bg-purple-700 hover:!text-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:!bg-purple-400 dark:hover:!text-purple-900 border-none max-w-full break-words"
                    title={prospect.title}
                  >
                    <span className="line-clamp-2">{prospect.title}</span>
                  </Badge>
                )}
                {prospect.industry && (
                  <Badge
                    variant="secondary"
                    className="px-2 py-0.5 h-auto min-h-[20px] text-[10px] font-medium bg-purple-100 text-purple-700 hover:!bg-purple-700 hover:!text-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:!bg-purple-400 dark:hover:!text-purple-900 border-none max-w-full break-words"
                    title={prospect.industry}
                  >
                    <span className="line-clamp-2">{prospect.industry}</span>
                  </Badge>
                )}
              </div>

              {/* Row 2: Company & Employees */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground truncate">
                {prospect.company && (
                  <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-medium">
                    <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{prospect.company}</span>
                  </div>
                )}
                {prospect.company && prospect.employees && (
                  <span className="text-slate-400 dark:text-slate-600">•</span>
                )}
                {prospect.employees && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                    <span className="truncate">
                      {prospect.employees} employees
                    </span>
                  </div>
                )}
              </div>

              {/* Row 3: Location */}
              {prospect.location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-purple-500" />
                  <span className="truncate">{prospect.location}</span>
                </div>
              )}

              {/* Row 4: Organizations */}
              {prospect.organizations && prospect.organizations.length > 0 && (
                <div className="mt-2">
                  <UserOrganizationsSection
                    organizations={prospect.organizations}
                    variant="purple"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Connections (Right) */}
          {prospect.linkedinConnections && (
            <div className="flex flex-col items-end flex-shrink-0 ml-4">
              <div className="flex items-center gap-1 text-purple-700 dark:text-purple-400 font-bold text-sm">
                <Users className="h-4 w-4" />
                {prospect.linkedinConnections}+
              </div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                connections
              </div>
            </div>
          )}
        </div>

        {/* Account Deleted Info */}
        {(prospect.name === "User's Account deleted" ||
          prospect.name === "Unknown") && (
          <div className="mt-4">
            <AccountDeletedInfo variant="purple" />
          </div>
        )}

        {/* Bottom Row: Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
          {/* Email */}
          {prospect.email &&
            typeof prospect.email === "string" &&
            prospect.email.trim() !== "" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-100/50 hover:bg-purple-100 dark:bg-purple-900/20 text-purple-700 hover:bg-purple-700 hover:text-purple-100 dark:text-purple-300 dark:hover:bg-purple-300 dark:hover:text-purple-900 transition-colors text-[12px] font-medium max-w-full">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate max-w-[150px]" title={prospect.email}>
                  {encryptEmail(prospect.email)}
                </span>
              </div>
            )}

          {/* LinkedIn */}
          {prospect.linkedinUrl && (
            <a
              href={
                prospect.linkedinUrl.startsWith("http")
                  ? prospect.linkedinUrl
                  : `https://linkedin.com/in/${prospect.linkedinUrl}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-100/50 hover:bg-purple-100 dark:bg-purple-900/20 text-purple-700 hover:bg-purple-700 hover:text-purple-100 dark:text-purple-300 dark:hover:bg-purple-300 dark:hover:text-purple-900 transition-colors text-[12px] font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
              LinkedIn
            </a>
          )}

          {/* Company Website */}
          {prospect.websiteUrl &&
            typeof prospect.websiteUrl === "string" &&
            prospect.websiteUrl.trim() !== "" && (
              <a
                href={
                  prospect.websiteUrl.startsWith("http")
                    ? prospect.websiteUrl
                    : `https://${prospect.websiteUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-100/50 hover:bg-purple-100 dark:bg-purple-900/20 text-purple-700 hover:bg-purple-700 hover:text-purple-100 dark:text-purple-300 dark:hover:bg-purple-300 dark:hover:text-purple-900 transition-colors text-[12px] font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                Company Website
              </a>
            )}

          {/* Company LinkedIn */}
          {prospect.companyLinkedinUrl &&
            typeof prospect.companyLinkedinUrl === "string" &&
            prospect.companyLinkedinUrl.trim() !== "" && (
              <a
                href={
                  prospect.companyLinkedinUrl.startsWith("http")
                    ? prospect.companyLinkedinUrl
                    : `https://${prospect.companyLinkedinUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-100/50 hover:bg-purple-100 dark:bg-purple-900/20 text-purple-700 hover:bg-purple-700 hover:text-purple-100 dark:text-purple-300 dark:hover:bg-purple-300 dark:hover:text-purple-900 transition-colors text-[12px] font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                Company LinkedIn
              </a>
            )}
        </div>
      </div>
    </div>
  );
}
