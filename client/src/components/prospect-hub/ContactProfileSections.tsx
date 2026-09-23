import { useState } from "react";
import {
  Building2,
  Users,
  TrendingUp,
  Calendar,
  BarChart3,
  Linkedin,
  Globe,
  MapPin,
  Facebook,
  Link,
  Twitter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { utcDayjs } from "@/lib/dayjs";
import { cn } from "@/lib/utils";

function capitalizeFirst(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-100 p-5",
        className
      )}
    >
      <h3 className="text-sm font-bold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 text-sm text-gray-600">
      <Icon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
      {children}
    </p>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "";
  return utcDayjs(d).local().format("MMM YYYY");
}

function formatDateRange(
  start: string | null,
  end: string | null,
  current: boolean
): string {
  const s = formatDate(start);
  const e = current ? "Present" : formatDate(end);
  if (!s && !e) return "";
  return `${s}${s && e ? " — " : ""}${e}`;
}

/* ─── Professional Headline ─── */

interface ProfessionalHeadlineProps {
  headline: string | null;
  seniority: string | null;
  departments: string[] | null;
  functions: string[] | null;
}

export function ProfessionalHeadline({
  headline,
  seniority,
  departments,
  functions,
}: ProfessionalHeadlineProps) {
  const hasContent =
    headline || seniority || departments?.length || functions?.length;
  if (!hasContent) return null;

  return (
    <SectionCard title="Professional Headline">
      {headline && (
        <p className="text-sm font-medium text-gray-800 mb-3">{headline}</p>
      )}
      <div className="space-y-3">
        {seniority && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 min-w-[80px]">
              Seniority:
            </span>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs font-medium">
              {capitalizeFirst(seniority)}
            </Badge>
          </div>
        )}
        {departments?.length ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 min-w-[80px]">
              Department:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {departments.map((dept) => (
                <Badge
                  key={dept}
                  className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 text-xs font-medium"
                >
                  {capitalizeFirst(dept)}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
        {functions?.length ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 min-w-[80px]">
              Functions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {functions.map((func) => (
                <Badge
                  key={func}
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs font-medium"
                >
                  {capitalizeFirst(func)}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

/* ─── Employment History ─── */

interface EmploymentHistoryProps {
  history:
    | {
        current: boolean;
        organizationName: string;
        title: string;
        startDate: string | null;
        endDate: string | null;
      }[]
    | null;
}

export function EmploymentHistory({ history }: EmploymentHistoryProps) {
  return (
    <SectionCard title="Employment History">
      {history?.length ? (
        <div className="relative ml-1">
          {history.map((job, i) => (
            <div key={i} className="flex gap-4 relative pb-4 last:pb-0">
              {/* Timeline line */}
              {i < history.length - 1 && (
                <div className="absolute left-[5px] top-4 bottom-0 w-px bg-gray-200" />
              )}
              {/* Dot */}
              <div className="flex-shrink-0 mt-1.5">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full border-2",
                    job.current
                      ? "bg-teal-500 border-teal-500"
                      : "bg-white border-gray-300"
                  )}
                />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {job.title}
                </p>
                <p className="text-sm text-gray-600">{job.organizationName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDateRange(job.startDate, job.endDate, job.current)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No experience data available</p>
      )}
    </SectionCard>
  );
}

/* ─── Organization Spotlight ─── */

interface OrganizationSpotlightProps {
  company: string | null;
  companyDescription: string | null;
  companyIndustry: string | null;
  industry: string | null;
  employees: string | null;
  companyRevenue: string | null;
  companyFoundedYear: number | null;
  companyMarketCap: string | null;
  websiteUrl: string | null;
  companyLinkedinUrl: string | null;
  companyCity: string | null;
  companyState: string | null;
  companyCountry: string | null;
  companyLogoUrl: string | null;
  companyFacebookUrl: string | null;
  companyTwitterUrl: string | null;
  companyPrimaryDomain: string | null;
}

export function OrganizationSpotlight({
  company,
  companyDescription,
  companyIndustry,
  industry,
  employees,
  companyRevenue,
  companyFoundedYear,
  companyMarketCap,
  websiteUrl,
  companyLinkedinUrl,
  companyCity,
  companyState,
  companyCountry,
  companyLogoUrl,
  companyFacebookUrl,
  companyTwitterUrl,
  companyPrimaryDomain,
}: OrganizationSpotlightProps) {
  const [logoError, setLogoError] = useState(false);
  const ind = companyIndustry || industry;
  const companyLocation = [companyCity, companyState, companyCountry]
    .filter(Boolean)
    .join(", ");
  const hasContent = company || ind || employees || companyDescription;
  if (!hasContent) return null;

  return (
    <SectionCard title="Organization Spotlight">
      <div className="flex items-center gap-3 mb-2">
        {companyLogoUrl && !logoError ? (
          <img
            src={companyLogoUrl}
            alt={company ?? "Company logo"}
            className="h-14 w-14 rounded-lg object-contain border border-gray-100 bg-white p-1 flex-shrink-0"
            onError={() => setLogoError(true)}
          />
        ) : company ? (
          <div className="h-14 w-14 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-violet-600">
              {company.charAt(0).toUpperCase()}
            </span>
          </div>
        ) : null}
        <div className="min-w-0">
          {company && (
            <p className="text-sm font-semibold text-gray-900 truncate">
              {company}
            </p>
          )}
          {companyPrimaryDomain && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Link className="h-2.5 w-2.5 flex-shrink-0" />
              {companyPrimaryDomain}
            </p>
          )}
        </div>
      </div>
      {companyDescription && (
        <p className="text-xs text-gray-500 mb-3">{companyDescription}</p>
      )}
      <div className="space-y-1.5">
        {companyLocation && (
          <DetailRow icon={MapPin}>{companyLocation}</DetailRow>
        )}
        {ind && (
          <DetailRow icon={Building2}>
            Industry: {capitalizeFirst(ind)}
          </DetailRow>
        )}
        {employees && <DetailRow icon={Users}>{employees} employees</DetailRow>}
        {companyRevenue && (
          <DetailRow icon={TrendingUp}>Revenue: {companyRevenue}</DetailRow>
        )}
        {companyFoundedYear && (
          <DetailRow icon={Calendar}>Founded {companyFoundedYear}</DetailRow>
        )}
        {companyMarketCap && (
          <DetailRow icon={BarChart3}>Market Cap: {companyMarketCap}</DetailRow>
        )}
      </div>
      {(websiteUrl ||
        companyLinkedinUrl ||
        companyFacebookUrl ||
        companyTwitterUrl) && (
        <div className="flex items-center flex-wrap gap-3 pt-3 mt-3">
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#0A66C2] hover:text-[#004182] hover:underline flex items-center gap-1"
            >
              <Globe className="h-3 w-3" /> Website
            </a>
          )}
          {companyLinkedinUrl && (
            <a
              href={companyLinkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#0A66C2] hover:text-[#004182] hover:underline flex items-center gap-1"
            >
              <Linkedin className="h-3 w-3" /> LinkedIn
            </a>
          )}
          {companyFacebookUrl && (
            <a
              href={companyFacebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#1877F2] hover:text-[#0d5bbd] hover:underline flex items-center gap-1"
            >
              <Facebook className="h-3 w-3" /> Facebook
            </a>
          )}
          {companyTwitterUrl && (
            <a
              href={companyTwitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#1DA1F2] hover:text-[#0d8bd9] hover:underline flex items-center gap-1"
            >
              <Twitter className="h-3 w-3" /> Twitter
            </a>
          )}
        </div>
      )}
    </SectionCard>
  );
}

/* ─── Skills / Badges Row ─── */

interface StatsBadgesProps {
  seniority: string | null;
  departments: string[] | null;
  functions: string[] | null;
  linkedinConnections: string | null;
}

export function StatsBadges({
  seniority,
  departments,
  functions,
  linkedinConnections,
}: StatsBadgesProps) {
  const items: string[] = [];
  if (seniority) items.push(capitalizeFirst(seniority));
  if (departments?.[0]) items.push(capitalizeFirst(departments[0]));
  if (functions?.[0]) items.push(capitalizeFirst(functions[0]));
  if (linkedinConnections) items.push(`${linkedinConnections} Connections`);
  if (!items.length) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Skills & Tags</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge
            key={item}
            variant="secondary"
            className="bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 text-xs"
          >
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
