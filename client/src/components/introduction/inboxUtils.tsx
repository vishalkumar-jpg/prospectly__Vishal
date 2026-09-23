import {
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Send,
  MessageSquare,
  AlertCircle,
  CalendarCheck,
  RefreshCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AnyType } from "@/types/common";
import { utcDayjs } from "@/lib/dayjs";
import { cn } from "@/lib/utils";

/**
 * Normalizes a LinkedIn value into a valid absolute URL.
 * Handles full URLs, bare domains (linkedin.com/in/john, www.linkedin.com/...),
 * and bare profile slugs (john) without producing malformed links.
 */
export const normalizeLinkedInUrl = (value: string) => {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?linkedin\.com/i.test(trimmed)) return `https://${trimmed}`;
  return `https://linkedin.com/in/${trimmed.replace(/^\/+/, "")}`;
};

/** Normalizes an arbitrary website value into an absolute URL. */
export const normalizeWebsiteUrl = (value: string) => {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export interface InboxRequest {
  id: string;
  status?: string;
  requester: {
    id?: string;
    name?: string;
    company?: string;
    title?: string;
    jobTitle?: string;
    industry?: string;
    bio?: string;
    websiteUrl?: string;
    linkedIn?: string;
    linkedinUrl?: string;
    linkedin_id?: string;
    email?: string;
    location?: string;
    groups?: string[];
    avatar?: string;
    trustScore?: number;
    current_trust_score?: number;
    first_name?: string;
    last_name?: string;
    profilePhotoUrl?: string | null;
    phone?: string | null;
    products?: string | null;
    uniqueSellingProposition?: string | null;
    targetMarket?: string | null;
    companySize?: string | null;
    revenueRange?: string | null;
    keyCredentials?: string | null;
    organizations?: Array<{
      id: string;
      name: string;
      isVerified: boolean;
    }>;
    recentFeedback?: Array<{
      comment: string;
      reviewer: string;
      rating: number;
    }>;
  };
  contact: {
    id?: string;
    name?: string;
    company?: string;
    title?: string;
    jobTitle?: string;
    linkedIn?: string;
    linkedinUrl?: string;
    linkedin?: string;
    websiteUrl?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar?: string;
    relevanceScore?: number;
    profilePhotoUrl?: string | null;
    industry?: string | null;
    location?: string | null;
    employees?: string | null;
    companyIndustry?: string | null;
    companyDescription?: string | null;
    linkedinConnections?: string | null;
    companyLinkedinUrl?: string | null;
    organizations?: Array<{
      id: string;
      name: string;
      isVerified: boolean;
    }>;
  };
  bounty?: number;
  bounty_amount?: number;
  urgency?: "urgent" | "high" | "medium" | "low";
  daysRemaining?: number;
  message?: string;
  purpose?: string;
  meetingType?: "virtual" | "in-person" | "flexible";
  trustScore?: number;
  receivedDate?: string;
  meetingPreferences?: {
    duration: string;
    format: string;
    timeframe: string;
  };
  meeting_description?: string;
  meeting_duration?: string;
  meetingTitle?: string;
  meeting_title?: string;
  additionalContext?: string;
  additional_context?: string;
  feedback?: Array<{
    rating: number;
    comment: string;
    user: string;
  }>;
  // Legacy fields for compatibility
  requesterName?: string;
  requesterCompany?: string;
  requesterTitle?: string;
  requesterLinkedIn?: string;
  requesterEmail?: string;
  requesterTrustScore?: number;
  requesterLocation?: string;
  requesterGroups?: string[];
  targetName?: string;
  targetCompany?: string;
  targetTitle?: string;
  targetLinkedIn?: string;
  bountyAmount?: number;
  description?: string;
  createdAt?: string;
  created_at?: string;
  requestReason?: string;
  requesterMeetingUrl?: string;
  requesterMeetingPlatform?: string;
  requesterDefaultDuration?: string;
  requesterAvailability?: string;
  preferredDuration?: "15min" | "30min" | "45min" | "60min";
  preferredTimeSlots?: string[];
  timeZone?: string;
  schedulingLink?: string;
  // Bounty validation fields
  connectorBountyAmount?: number;
  requesterBountyAmount?: number;
  canAccept?: boolean;
  // Entry status for potential connector requests
  entryStatus?: string;
  // Top-level photo URLs for PremiumAvatar consistency
  requesterPhotoUrl?: string | null;
  contactPhotoUrl?: string | null;
  // Meeting date information
  meetingDate?: string | null;
  meetingStartTime?: string | null;
}

export function canOpenReviewDialog(request: InboxRequest): boolean {
  const status = request.status ?? "pending";
  return status === "pending" && request.entryStatus !== "archived";
}

/**
 * Encrypts an email by masking the local part.
 * If the email is already masked or malformed, it returns the original email.
 */
export const encryptEmail = (email: string | null | undefined) => {
  if (!email) return "";

  // Basic check for already masked email or obviously invalid structure
  if (email.includes("***") || !email.includes("@")) {
    return email;
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    return email;
  }

  const [localPart, domain] = parts;

  // Pattern check: if localPart matches what we usually produce (e.g., a***b)
  // or if it already has asterisks.
  if (localPart.includes("*")) {
    return email;
  }

  if (localPart.length === 0) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }

  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
};

export const formatStatus = (status: string) => {
  if (!status) return "";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const getStageBadge = (request: InboxRequest) => {
  let statusKey = request.status || "pending";

  // Check if meeting date has passed for meeting_booked status
  if (statusKey === "meeting_booked") {
    const meetingDate = request.meetingStartTime || request.meetingDate;
    if (meetingDate && utcDayjs(meetingDate).isBefore(utcDayjs())) {
      statusKey = "no_show";
    }
  }

  // Brand semantic status tints (color = informational, paired with icon + text)
  const WARNING =
    "bg-brand-warning/10 text-brand-warning border-brand-warning/30 hover:bg-brand-warning/20";
  const INFO =
    "bg-brand-sky/10 text-brand-sky border-brand-sky/30 hover:bg-brand-sky/20";
  const DESTRUCTIVE =
    "bg-brand-destructive/10 text-brand-destructive border-brand-destructive/30 hover:bg-brand-destructive/20";
  const SUCCESS =
    "bg-brand-success/10 text-brand-success border-brand-success/30 hover:bg-brand-success/20";
  const NEUTRAL =
    "bg-muted text-muted-foreground border-border hover:bg-muted/80";

  const stageConfig: Record<
    string,
    { label: string; icon: AnyType; className: string }
  > = {
    pending: { label: "Pending", icon: Clock, className: WARNING },
    accepted: { label: "Accepted", icon: CheckCircle2, className: INFO },
    declined: { label: "Declined", icon: XCircle, className: DESTRUCTIVE },
    intro_sent: { label: "Intro Sent", icon: Send, className: INFO },
    meeting_scheduled: {
      label: "Scheduled",
      icon: Calendar,
      className: INFO,
    },
    meeting_booked: {
      label: "Booked",
      icon: CalendarCheck,
      className: INFO,
    },
    no_show: { label: "No Show", icon: XCircle, className: DESTRUCTIVE },
    meeting_completed: {
      label: "Meeting Done",
      icon: CheckCircle2,
      className: SUCCESS,
    },
    peer_feedback: {
      label: "Feedback",
      icon: MessageSquare,
      className: WARNING,
    },
    completed: { label: "Completed", icon: CheckCircle2, className: SUCCESS },
    email_failed: {
      label: "Email Failed",
      icon: AlertCircle,
      className: DESTRUCTIVE,
    },
    meeting_rescheduled: {
      label: "Rescheduled",
      icon: RefreshCcw,
      className: WARNING,
    },
  };

  const config = stageConfig[statusKey] || {
    label: formatStatus(statusKey),
    icon: Clock,
    className: NEUTRAL,
  };
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-bold text-[11.5px]", config.className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};
