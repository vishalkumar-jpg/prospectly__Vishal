import {
  Briefcase,
  Clock,
  ExternalLink,
  Eye,
  Linkedin,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isHttpOrHttpsUrl, isPdfFile } from "@/lib/url-utils";
import { formatDateTime } from "@/utils/dateFormatter";
import type { CandidateDetailResponse } from "@/lib/api/recruitment";
import { revealedInitials } from "./detail.helpers";

export function DetailProfileHeader({
  detail,
  isHidden,
  onPreviewResume,
  onOpenResume,
}: {
  detail: CandidateDetailResponse;
  isHidden: boolean;
  onPreviewResume: () => void;
  onOpenResume: () => void;
}) {
  const title = detail.revealedName || detail.anonymousLabel;
  const jobTitle = detail.resumeJobTitle || detail.currentTitle;
  const subtitle = [jobTitle, detail.currentCompany]
    .filter(Boolean)
    .join(" · ");
  const initials = revealedInitials(detail.revealedName);
  const showContact = !isHidden && Boolean(detail.revealedName);

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-amethyst/15 text-base font-bold text-brand-amethyst"
        >
          {initials ?? <User className="h-6 w-6" />}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>

          {subtitle || detail.totalYearsExp != null ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {subtitle ? (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {subtitle}
                </span>
              ) : null}
              {subtitle && detail.totalYearsExp != null ? (
                <span aria-hidden>·</span>
              ) : null}
              {detail.totalYearsExp != null ? (
                <span className="tabular-nums">
                  {detail.totalYearsExp} years of experience
                </span>
              ) : null}
            </p>
          ) : null}

          {showContact && (detail.revealedEmail || detail.revealedLinkedIn) ? (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {detail.revealedEmail ? (
                <a
                  href={`mailto:${detail.revealedEmail}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:underline"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {detail.revealedEmail}
                </a>
              ) : null}
              {detail.revealedLinkedIn ? (
                isHttpOrHttpsUrl(detail.revealedLinkedIn) ? (
                  <a
                    href={detail.revealedLinkedIn}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:underline"
                  >
                    <Linkedin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    LinkedIn
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  <span>{detail.revealedLinkedIn}</span>
                )
              ) : null}
            </p>
          ) : null}

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Applied {formatDateTime(detail.createdAt)}
            </span>
            {detail.referrer ? (
              <>
                <span aria-hidden className="hidden sm:inline">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    {detail.referrer.avatar ? (
                      <AvatarImage
                        src={detail.referrer.avatar}
                        alt={detail.referrer.name}
                      />
                    ) : null}
                    <AvatarFallback className="bg-brand-amethyst/15 text-[8px] font-semibold text-brand-amethyst">
                      {detail.referrer.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  Referred by {detail.referrer.name}
                </span>
              </>
            ) : null}
            {isHidden ? (
              <>
                <span aria-hidden className="hidden sm:inline">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5 text-brand-warning">
                  <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Some details are hidden for this candidate
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {detail.hasResume ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {isPdfFile(null, detail.resumeFileName) ? (
            <Button
              type="button"
              className="cursor-pointer bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all duration-200 hover:shadow-brand-cta-lg"
              onClick={onPreviewResume}
            >
              <Eye className="mr-1.5 h-4 w-4" aria-hidden />
              View resume
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer transition-colors duration-200 hover:border-brand-amethyst/40 hover:text-brand-amethyst"
            onClick={onOpenResume}
          >
            <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
            View resume in new tab
          </Button>
        </div>
      ) : null}
    </header>
  );
}
