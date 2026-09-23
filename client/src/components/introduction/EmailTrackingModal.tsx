import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Mail,
  Check,
  Clock,
  MousePointer,
  XCircle,
  AlertTriangle,
  Loader2,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
interface EmailTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  introductionRequestId: string;
}
interface EmailLog {
  id: string;
  recipientEmail: string;
  subject: string;
  status: string;
  sentAt: string;
  deliveredAt: string | null;
  clicked: boolean;
  clickedAt: string | null;
  clickCount: number;
  bounced: boolean;
  bouncedAt: string | null;
  bounceType: string | null;
  bounceReason: string | null;
  lastEventType: string | null;
  lastEventAt: string | null;
  rawEvents: Record<string, unknown>;
  createdAt: string;
}
const STATUS_META: Record<string, { icon: LucideIcon; label: string }> = {
  pending: { icon: Clock, label: "Pending" },
  scheduled: { icon: Clock, label: "Scheduled" },
  sent: { icon: Mail, label: "Sent" },
  received: { icon: Check, label: "Received" },
  delivered: { icon: Check, label: "Delivered" },
  delivery_delayed: { icon: Clock, label: "Delayed" },
  failed: { icon: XCircle, label: "Failed" },
  bounced: { icon: XCircle, label: "Bounced" },
  complained: { icon: AlertTriangle, label: "Spam Complaint" },
};
function getStatusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.pending;
}
function formatEventTime(timestamp: string | null) {
  if (!timestamp) return "Not yet";
  return formatLocalizedShortDateTime(timestamp);
}

function formatBounceTypeLabel(bounceType: string): string {
  if (bounceType === "Permanent") return "Hard Bounce (Permanent)";
  if (bounceType === "Temporary") return "Soft Bounce (Temporary)";
  return bounceType;
}

function getEmailTrackingFlags(emailLog: EmailLog) {
  const isFailure = emailLog.bounced || emailLog.status === "failed";
  const isDelivered = !!emailLog.deliveredAt && !isFailure;
  return { isFailure, isDelivered };
}

function buildEmailTimelineEvents(emailLog: EmailLog): TimelineEventProps[] {
  const { isFailure } = getEmailTrackingFlags(emailLog);
  const events: TimelineEventProps[] = [
    {
      icon: Mail,
      tone: "indigo",
      title: "Email Sent",
      time: formatEventTime(emailLog.sentAt),
      done: !!emailLog.sentAt,
    },
    {
      icon: isFailure && !emailLog.deliveredAt ? XCircle : Check,
      tone: isFailure && !emailLog.deliveredAt ? "destructive" : "success",
      title: "Delivered",
      time: formatEventTime(emailLog.deliveredAt),
      done: !!emailLog.deliveredAt || isFailure,
    },
  ];
  if (emailLog.clicked) {
    const clickSuffix =
      emailLog.clickCount > 1 ? ` (${emailLog.clickCount} times)` : "";
    events.push({
      icon: MousePointer,
      tone: "amethyst",
      title: `Link Clicked${clickSuffix}`,
      time: formatEventTime(emailLog.clickedAt),
      done: true,
    });
  }
  if (emailLog.bounced) {
    events.push({
      icon: XCircle,
      tone: "destructive",
      title: "Bounced",
      time: formatEventTime(emailLog.bouncedAt),
      description: emailLog.bounceReason || undefined,
      done: true,
    });
  } else if (emailLog.status === "failed") {
    events.push({
      icon: XCircle,
      tone: "destructive",
      title: "Delivery Failed",
      time: formatEventTime(emailLog.lastEventAt),
      description: emailLog.bounceReason || undefined,
      done: true,
    });
  }
  return events;
}

function EmailTrackingDialogShell({
  isOpen,
  onClose,
  dialogContentClass,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  dialogContentClass: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={dialogContentClass}
        mobileFullscreen
        hideCloseButton
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

function DeliveryOutcomeSummary({
  emailLog,
  isFailure,
  isDelivered,
}: {
  emailLog: EmailLog;
  isFailure: boolean;
  isDelivered: boolean;
}) {
  if (isFailure) {
    return (
      <SummaryRow
        icon={XCircle}
        tone="destructive"
        title={emailLog.bounced ? "Email bounced" : "Delivery failed"}
        subtitle={
          emailLog.bounceReason ||
          "The email could not be delivered to the recipient"
        }
        badge={{
          label: emailLog.bounced ? "Bounced" : "Failed",
          tone: "destructive",
        }}
      />
    );
  }
  if (isDelivered) {
    return (
      <SummaryRow
        icon={Check}
        tone="success"
        title="Successfully delivered"
        subtitle="Reached the recipient's inbox"
        badge={{ label: "Done", tone: "success" }}
      />
    );
  }
  return (
    <SummaryRow
      icon={Clock}
      tone="warning"
      title={getStatusMeta(emailLog.status).label}
      subtitle="Awaiting delivery confirmation"
      badge={{ label: "In progress", tone: "warning" }}
    />
  );
}

function LinkClickSummary({ emailLog }: { emailLog: EmailLog }) {
  const subtitle =
    emailLog.clicked && emailLog.clickedAt
      ? `First click ${formatEventTime(emailLog.clickedAt)}`
      : "No clicks yet";
  return (
    <SummaryRow
      icon={MousePointer}
      tone="amethyst"
      title="Link clicked"
      subtitle={subtitle}
      value={emailLog.clicked ? String(emailLog.clickCount) : "0"}
      valueMuted={!emailLog.clicked}
    />
  );
}

function BounceFailureDetails({
  emailLog,
  isFailure,
}: {
  emailLog: EmailLog;
  isFailure: boolean;
}) {
  if (!isFailure || (!emailLog.bounceType && !emailLog.bounceReason)) {
    return null;
  }
  return (
    <div className="rounded-2xl border border-brand-destructive/20 bg-brand-destructive/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-destructive">
        <AlertTriangle className="h-4 w-4" />
        Delivery Failed
      </div>
      <div className="space-y-2 text-sm">
        {emailLog.bounceType && (
          <div className="flex justify-between gap-3">
            <span className="text-brand-destructive/80">Type:</span>
            <span className="text-right font-medium text-foreground">
              {formatBounceTypeLabel(emailLog.bounceType)}
            </span>
          </div>
        )}
        {emailLog.bounceReason && (
          <div>
            <span className="text-brand-destructive/80">Reason:</span>
            <p className="mt-1 font-medium text-foreground">
              {emailLog.bounceReason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmailTrackingTimeline({ events }: { events: TimelineEventProps[] }) {
  return (
    <div>
      <p className="mb-3.5 mt-5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        Delivery Timeline
      </p>
      <div className="pl-9">
        {events.map((event, i) => (
          <TimelineEvent
            key={event.title}
            {...event}
            isLast={i === events.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function EmailTrackingBody({ emailLog }: { emailLog: EmailLog }) {
  const { isFailure, isDelivered } = getEmailTrackingFlags(emailLog);
  const timelineEvents = buildEmailTimelineEvents(emailLog);
  return (
    <ScrollArea className="flex-1">
      <div className="space-y-3 p-5 sm:p-6">
        <DeliveryOutcomeSummary
          emailLog={emailLog}
          isFailure={isFailure}
          isDelivered={isDelivered}
        />
        <LinkClickSummary emailLog={emailLog} />
        <EmailTrackingTimeline events={timelineEvents} />
        <BounceFailureDetails emailLog={emailLog} isFailure={isFailure} />
      </div>
    </ScrollArea>
  );
}
function TrackingHero({ emailLog }: { emailLog?: EmailLog | null }) {
  const statusMeta = emailLog ? getStatusMeta(emailLog.status) : null;
  const StatusIcon = statusMeta?.icon;
  return (
    <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
      />
      <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogClose>
      <div className="relative flex items-center gap-3.5 pr-10">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
          <Mail className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
            Email Delivery Status
          </DialogTitle>
          <DialogDescription className="mt-1 text-[13px] leading-relaxed text-white/90">
            Track your introduction email delivery and engagement
          </DialogDescription>
        </div>
      </div>
      {emailLog && statusMeta && StatusIcon && (
        <div className="relative mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-bold">
            <StatusIcon className="h-3.5 w-3.5" />
            {statusMeta.label}
          </span>
          <span className="min-w-0 text-xs text-white/85">
            to {emailLog.recipientEmail}
            {emailLog.sentAt && ` · ${formatEventTime(emailLog.sentAt)}`}
          </span>
        </div>
      )}
    </div>
  );
}
export function EmailTrackingModal({
  isOpen,
  onClose,
  introductionRequestId,
}: EmailTrackingModalProps) {
  const { data: emailLogs, isLoading } = useQuery<EmailLog[]>({
    queryKey: [
      "/api/introduction-requests",
      introductionRequestId,
      "email-logs",
    ],
    queryFn: () => api.introductions.getEmailLogs(introductionRequestId),
    enabled: isOpen && !!introductionRequestId,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  // Most recent email log (API returns them sorted by createdAt desc)
  const emailLog = emailLogs && emailLogs.length > 0 ? emailLogs[0] : null;
  const dialogContentClass =
    "flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg";

  if (isLoading) {
    return (
      <EmailTrackingDialogShell
        isOpen={isOpen}
        onClose={onClose}
        dialogContentClass={dialogContentClass}
      >
        <TrackingHero />
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-amethyst" />
        </div>
      </EmailTrackingDialogShell>
    );
  }

  if (!emailLog) {
    return (
      <EmailTrackingDialogShell
        isOpen={isOpen}
        onClose={onClose}
        dialogContentClass={dialogContentClass}
      >
        <TrackingHero />
        <div className="flex-1 px-6 py-12 text-center text-muted-foreground sm:px-7">
          <Mail className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>No email sent for this introduction yet</p>
        </div>
      </EmailTrackingDialogShell>
    );
  }

  return (
    <EmailTrackingDialogShell
      isOpen={isOpen}
      onClose={onClose}
      dialogContentClass={dialogContentClass}
    >
      <TrackingHero emailLog={emailLog} />
      <EmailTrackingBody emailLog={emailLog} />
    </EmailTrackingDialogShell>
  );
}
type Tone = "success" | "amethyst" | "indigo" | "destructive" | "warning";
const TONE_TILE: Record<Tone, string> = {
  success: "bg-brand-success/10 text-brand-success",
  amethyst: "bg-brand-amethyst/10 text-brand-amethyst",
  indigo: "bg-primary/10 text-primary",
  destructive: "bg-brand-destructive/10 text-brand-destructive",
  warning: "bg-brand-warning/10 text-brand-warning",
};
const TONE_BADGE: Record<Tone, string> = {
  success: "border-brand-success/20 bg-brand-success/10 text-brand-success",
  amethyst: "border-brand-amethyst/20 bg-brand-amethyst/10 text-brand-amethyst",
  indigo: "border-primary/20 bg-primary/10 text-primary",
  destructive:
    "border-brand-destructive/20 bg-brand-destructive/10 text-brand-destructive",
  warning: "border-brand-warning/20 bg-brand-warning/10 text-brand-warning",
};
interface SummaryRowProps {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  subtitle: string;
  badge?: { label: string; tone: Tone };
  value?: string;
  valueMuted?: boolean;
}
function SummaryRow({
  icon: Icon,
  tone,
  title,
  subtitle,
  badge,
  value,
  valueMuted,
}: SummaryRowProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border p-4 transition-shadow hover:shadow-sm">
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          TONE_TILE[tone]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {subtitle}
        </p>
      </div>
      {badge && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold",
            TONE_BADGE[badge.tone]
          )}
        >
          {badge.label}
        </span>
      )}
      {value !== undefined && (
        <span
          className={cn(
            "shrink-0 font-mono text-xl font-bold",
            valueMuted ? "text-muted-foreground" : "text-brand-gradient"
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}
interface TimelineEventProps {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  time: string;
  done?: boolean;
  description?: string;
  isLast?: boolean;
}
function TimelineEvent({
  icon: Icon,
  tone,
  title,
  time,
  done,
  description,
  isLast,
}: TimelineEventProps) {
  return (
    <div className="relative pb-5 last:pb-0">
      {/* connector line */}
      {!isLast && (
        <span
          className={cn(
            "absolute left-[-22px] top-7 bottom-[-0.5rem] w-0.5",
            done
              ? "bg-gradient-to-b from-brand-success to-brand-success/15"
              : "bg-border"
          )}
        />
      )}
      <span
        className={cn(
          "absolute left-[-36px] top-0 grid h-7 w-7 place-items-center rounded-full",
          done ? TONE_TILE[tone] : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p
        className={cn(
          "text-sm font-bold",
          done ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {title}
      </p>
      <p className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">
        {time}
      </p>
      {description && (
        <p className="mt-1 text-xs italic text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
