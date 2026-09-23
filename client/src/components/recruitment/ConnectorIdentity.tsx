import { Briefcase, Linkedin, Mail } from "lucide-react";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { isHttpOrHttpsUrl } from "@/lib/url-utils";

interface ConnectorIdentityProps {
  name: string;
  /** Connector role — "primary" renders a pill, other roles render as a label. */
  role?: string | null;
  avatar?: string | null;
  /** Optional — rendered as a mailto row only when provided (detail modal). */
  email?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  linkedinUrl?: string | null;
}

/**
 * Avatar + name + role + title/company + LinkedIn link. Shared by the
 * recruitment kanban dialogs (Hire / Edit Classification / Release Payout) and
 * the candidate detail modal, so the connector rendering contract stays in one
 * place.
 */
export function ConnectorIdentity({
  name,
  role,
  avatar,
  email,
  jobTitle,
  company,
  linkedinUrl,
}: ConnectorIdentityProps) {
  const displayName = name || "Connector";
  const isPrimary = role === "primary";
  const titleAndCompany = [jobTitle, company].filter(Boolean).join(" · ");
  const showLinkedIn = !!linkedinUrl && isHttpOrHttpsUrl(linkedinUrl);

  return (
    <div className="flex items-center gap-3">
      <PremiumAvatar
        name={displayName}
        size="sm"
        imageUrl={avatar ?? null}
        showPurpleRing={false}
        fallbackBgColor="bg-brand-gradient"
        fallbackTextColor="text-white"
        className="shrink-0"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold text-foreground">
            {displayName}
          </span>
          {isPrimary ? (
            <span className="rounded-full bg-brand-amethyst/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-brand-amethyst">
              Primary
            </span>
          ) : role ? (
            <span className="text-xs capitalize text-muted-foreground">
              {role}
            </span>
          ) : null}
        </div>
        {titleAndCompany && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{titleAndCompany}</span>
          </div>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            <Mail className="h-3 w-3 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{email}</span>
          </a>
        )}
        {showLinkedIn && (
          <a
            href={linkedinUrl as string}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-sky hover:underline"
          >
            <Linkedin className="h-3 w-3 shrink-0" />
            <span>LinkedIn</span>
          </a>
        )}
      </div>
    </div>
  );
}

export default ConnectorIdentity;
