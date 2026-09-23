import { useState } from "react";
import {
  Sparkles,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import {
  formatRecruitmentWorkType,
  formatRecruitmentEmploymentType,
} from "@/utils/recruitmentDisplay";
import { cn } from "@/lib/utils";

interface InterviewBookingJobCardProps {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  jobLocation?: string | null;
  jobWorkType?: string | null;
  jobEmploymentType?: string | null;
  recruiterName: string;
  recruiterTitle?: string | null;
  interviewNotes?: string | null;
}

/**
 * The entire left rail for the interview-booking page.
 *
 *   ┌────────────────────────────────────┐
 *   │  ✨ INTERVIEW INVITATION           │  hero (gradient)
 *   │  {jobTitle}                        │
 *   │  Hi {candidateName} — pick a time…│
 *   ├────────────────────────────────────┤
 *   │  📋  ROLE DETAILS                  │  job details
 *   │  🏢 Company                         │
 *   │  📍 Location                        │
 *   │  ⏱ 30 minutes                       │
 *   ├────────────────────────────────────┤
 *   │  👥  YOUR INTERVIEWER              │  recruiter mini-row
 *   │  [Avatar] RECRUITER                │
 *   │          {recruiterName}           │
 *   │          {recruiterTitle}          │
 *   ├────────────────────────────────────┤
 *   │  💬  NOTE FROM THE RECRUITER       │  (optional)
 *   │  {interviewNotes} (Read more…)     │
 *   └────────────────────────────────────┘
 *
 * Renders a Fragment so the parent's `<aside flex flex-col gap-4>` can lay
 * out the four cards with consistent spacing.
 */
export default function InterviewBookingJobCard({
  candidateName,
  jobTitle,
  companyName,
  jobLocation,
  jobWorkType,
  jobEmploymentType,
  recruiterName,
  recruiterTitle,
  interviewNotes,
}: InterviewBookingJobCardProps) {
  // UI-only: collapses long interview-notes paragraph behind a Read-more.
  const [notesExpanded, setNotesExpanded] = useState(false);

  const formattedWorkType = formatRecruitmentWorkType(jobWorkType);
  const formattedEmploymentType =
    formatRecruitmentEmploymentType(jobEmploymentType);

  return (
    <>
      {/* Card A — Hero rail (gradient) */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-brand-card">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
        />
        <div className="relative">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur">
            <Sparkles className="h-3 w-3" />
            Interview Invitation
          </span>
          <h1 className="break-words text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
            {jobTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed opacity-90">
            Hi {candidateName} — pick a time for your interview with{" "}
            <b className="font-bold">{companyName}</b>.
          </p>
        </div>
      </div>

      {/* Card B — Role details */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-brand-card">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-sky/10 text-brand-sky">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider">
            Role Details
          </div>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="break-words font-semibold">{companyName}</span>
          </div>
          {jobLocation && (
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="truncate text-foreground/80">{jobLocation}</span>
            </div>
          )}
          {formattedEmploymentType && (
            <div className="flex items-center gap-2.5">
              <span className="grid h-4 w-4 flex-shrink-0 place-items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-amethyst" />
              </span>
              <span className="inline-flex items-center rounded-md border border-brand-amethyst/15 bg-brand-amethyst/10 px-2 py-0.5 text-[11px] font-bold text-brand-amethyst">
                {formattedEmploymentType}
              </span>
            </div>
          )}
          {formattedWorkType && (
            <div className="flex items-center gap-2.5">
              <span className="grid h-4 w-4 flex-shrink-0 place-items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-amethyst" />
              </span>
              <span className="inline-flex items-center rounded-md border border-brand-amethyst/15 bg-brand-amethyst/10 px-2 py-0.5 text-[11px] font-bold text-brand-amethyst">
                {formattedWorkType}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="text-foreground/80">30-minute interview</span>
          </div>
        </div>
      </div>

      {/* Card C — Recruiter mini-row */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-brand-card">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-sky/10 text-brand-sky">
            <Users className="h-4 w-4" />
          </div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider">
            Your Interviewer
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          <PremiumAvatar
            name={recruiterName}
            size="sm"
            showPurpleRing={false}
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider leading-none text-brand-amethyst">
              Recruiter
            </div>
            <div className="mt-1 break-words text-sm font-extrabold leading-tight">
              {recruiterName}
            </div>
            {recruiterTitle && (
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {recruiterTitle}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card D — Interview notes (only when notes exist) */}
      {interviewNotes && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-brand-card">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-white shadow-brand-cta">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider">
              Note from the Recruiter
            </div>
          </div>

          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-amethyst">
            <TrendingUp className="h-3 w-3" />
            Details
          </div>
          <p
            className={cn(
              "whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-foreground/80",
              !notesExpanded && "line-clamp-3"
            )}
          >
            {interviewNotes}
          </p>
          {interviewNotes.length > 160 && (
            <button
              type="button"
              onClick={() => setNotesExpanded((v) => !v)}
              className="mt-1.5 text-[11px] font-extrabold text-brand-amethyst underline-offset-2 hover:text-brand-rose hover:underline"
            >
              {notesExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
