import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Code2,
  FileText,
  Mail,
  Palette,
  UserCheck,
  UserRound,
} from "lucide-react";
import type { PriorityActionItem } from "../types";

export const ACTIVE_JOB_ICON_STYLES: Array<{
  icon: LucideIcon;
  className: string;
}> = [
  { icon: Briefcase, className: "bg-rose-100 text-rose-600" },
  { icon: Palette, className: "bg-violet-100 text-violet-600" },
  { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-600" },
  { icon: BarChart3, className: "bg-amber-100 text-amber-600" },
  { icon: Code2, className: "bg-indigo-100 text-indigo-600" },
];

export const ACTIVITY_AVATAR_COLORS = [
  "bg-rose-100 text-rose-600",
  "bg-rose-100 text-rose-600",
  "bg-violet-100 text-violet-600",
  "bg-amber-100 text-amber-600",
  "bg-violet-100 text-violet-600",
  "bg-violet-100 text-violet-600",
  "bg-rose-100 text-rose-600",
];

function getNameInitial(name: string): string {
  const firstLetter = name.trim().match(/\p{L}/u);
  return firstLetter?.[0].toLocaleUpperCase() ?? "A";
}

export function getActivityInitials(message: string): string {
  const { lead } = parseActivityMessage(message);
  return getNameInitial(lead);
}

/** Split activity message into optional prefix, bold lead, and remainder. */
export function parseActivityMessage(message: string): {
  prefix: string;
  lead: string;
  rest: string;
} {
  const applied = message.match(/^(.+?) applied for (.+)$/);
  if (applied) {
    return { prefix: "", lead: applied[1], rest: ` applied for ${applied[2]}` };
  }

  const hired = message.match(/^(.+?) hired for (.+)$/);
  if (hired)
    return { prefix: "", lead: hired[1], rest: ` hired for ${hired[2]}` };

  const referred = message.match(/^(.+?) referred (.+)$/);
  if (referred)
    return { prefix: "", lead: referred[1], rest: ` referred ${referred[2]}` };

  const interview = message.match(/^Interview scheduled with (.+)$/);
  if (interview) {
    return {
      prefix: "Interview scheduled with ",
      lead: interview[1],
      rest: "",
    };
  }

  return { prefix: "", lead: message, rest: "" };
}

export function getPriorityActionIcon(type: PriorityActionItem["type"]): {
  icon: LucideIcon;
  className: string;
} {
  if (type === "draft_ready") {
    return { icon: FileText, className: "bg-emerald-100 text-emerald-600" };
  }
  if (type === "interview_feedback") {
    return { icon: CheckCircle2, className: "bg-violet-100 text-violet-600" };
  }
  if (type === "shortlisted_pending") {
    return { icon: UserCheck, className: "bg-amber-100 text-amber-600" };
  }
  if (type === "interview_invite_pending") {
    return { icon: Mail, className: "bg-indigo-100 text-indigo-600" };
  }
  if (type === "interview_scheduled") {
    return { icon: CalendarClock, className: "bg-sky-100 text-sky-600" };
  }
  return { icon: UserRound, className: "bg-rose-100 text-rose-600" };
}
