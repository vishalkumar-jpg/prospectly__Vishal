import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarIcon,
  Clock,
  Loader2,
  AlertCircle,
  Check,
  ChevronsUpDown,
  Mail,
  Info,
  MessageSquare,
  Users,
  Linkedin,
  MapPin,
  TrendingUp,
  Sparkles,
  Shield,
  AlertTriangle,
  CheckCircle,
  Star,
} from "lucide-react";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { apiRequest } from "@/lib/api";
import { ApiError } from "@/lib/api/core";
import { dayjs } from "@/lib/dayjs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ReviewsDialog } from "@/components/introduction/ReviewsDialog";

// Major timezones supported
const MAJOR_TIMEZONES = [
  {
    value: "Pacific/Honolulu",
    label: "(GMT-10:00) Hawaii Standard Time - Honolulu",
  },
  {
    value: "America/Anchorage",
    label: "(GMT-09:00) Alaska Standard Time - Anchorage",
  },
  {
    value: "America/Los_Angeles",
    label: "(GMT-08:00) Pacific Standard Time - Los Angeles",
  },
  {
    value: "America/Tijuana",
    label: "(GMT-08:00) Pacific Standard Time - Tijuana",
  },
  {
    value: "America/Phoenix",
    label: "(GMT-07:00) Mountain Standard Time - Phoenix",
  },
  {
    value: "America/Denver",
    label: "(GMT-07:00) Mountain Standard Time - Denver",
  },
  {
    value: "America/Mexico_City",
    label: "(GMT-06:00) Central Standard Time - Mexico City",
  },
  {
    value: "America/Chicago",
    label: "(GMT-06:00) Central Standard Time - Chicago",
  },
  {
    value: "America/Cancun",
    label: "(GMT-05:00) Eastern Standard Time - Cancun",
  },
  {
    value: "America/New_York",
    label: "(GMT-05:00) Eastern Standard Time - New York",
  },
  {
    value: "America/Sao_Paulo",
    label: "(GMT-03:00) Brasilia Time - Sao Paulo",
  },
  { value: "Atlantic/Azores", label: "(GMT-01:00) Azores Standard Time" },
  { value: "UTC", label: "(GMT+00:00) Coordinated Universal Time - UTC" },
  { value: "Europe/London", label: "(GMT+00:00) Greenwich Mean Time - London" },
  { value: "Europe/Paris", label: "(GMT+01:00) Central European Time - Paris" },
  {
    value: "Europe/Berlin",
    label: "(GMT+01:00) Central European Time - Berlin",
  },
  {
    value: "Europe/Athens",
    label: "(GMT+02:00) Eastern European Time - Athens",
  },
  { value: "Europe/Moscow", label: "(GMT+03:00) Moscow Standard Time" },
  { value: "Asia/Dubai", label: "(GMT+04:00) Gulf Standard Time - Dubai" },
  { value: "Asia/Kolkata", label: "(GMT+05:30) India Standard Time - Kolkata" },
  {
    value: "Asia/Dhaka",
    label: "(GMT+06:00) Bangladesh Standard Time - Dhaka",
  },
  { value: "Asia/Bangkok", label: "(GMT+07:00) Indochina Time - Bangkok" },
  {
    value: "Asia/Shanghai",
    label: "(GMT+08:00) China Standard Time - Shanghai",
  },
  { value: "Asia/Hong_Kong", label: "(GMT+08:00) Hong Kong Time" },
  { value: "Asia/Singapore", label: "(GMT+08:00) Singapore Standard Time" },
  { value: "Asia/Tokyo", label: "(GMT+09:00) Japan Standard Time - Tokyo" },
  { value: "Asia/Seoul", label: "(GMT+09:00) Korea Standard Time - Seoul" },
  {
    value: "Australia/Sydney",
    label: "(GMT+10:00) Australian Eastern Time - Sydney",
  },
  {
    value: "Pacific/Auckland",
    label: "(GMT+12:00) New Zealand Standard Time - Auckland",
  },
];

/** Browsers may return deprecated IANA IDs not listed in MAJOR_TIMEZONES. */
const IANA_TIMEZONE_ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
};

function canonicalMajorTimezone(iana: string): string {
  return IANA_TIMEZONE_ALIASES[iana] ?? iana;
}

/** GMT offset label for a zone at the current instant, e.g. "(GMT-05:00)". */
function formatGmtOffsetLabelForIana(iana: string): string {
  const canonical = canonicalMajorTimezone(iana);
  const d = dayjs.tz(dayjs(), canonical);
  if (!d.isValid()) return "";
  const z = d.utcOffset();
  const sign = z >= 0 ? "+" : "-";
  const total = Math.abs(z);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `(GMT${sign}${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")})`;
}

/**
 * Human-readable label matching MAJOR_TIMEZONES dropdown style when the zone
 * is not in that list (e.g. America/Toronto from the browser).
 */
function descriptiveTimezoneLabel(iana: string): string {
  const canonical = canonicalMajorTimezone(iana);
  const offsetPart = formatGmtOffsetLabelForIana(canonical);
  let longName = "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: canonical,
      timeZoneName: "long",
    }).formatToParts(new Date());
    longName = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return offsetPart ? `${offsetPart} ${canonical}` : canonical;
  }
  const cityPart = canonical.includes("/")
    ? (canonical.split("/").pop() ?? canonical).replace(/_/g, " ")
    : canonical;
  if (!offsetPart && !longName) return canonical;
  if (!longName) return `${offsetPart} ${cityPart}`.trim();
  return `${offsetPart} ${longName} - ${cityPart}`;
}

function majorTimezoneLabel(iana: string): string {
  const canonical = canonicalMajorTimezone(iana);
  const fromList = MAJOR_TIMEZONES.find((tz) => tz.value === canonical)?.label;
  if (fromList) return fromList;
  return descriptiveTimezoneLabel(iana);
}

/** Calendar day key for grouping slots / calendar cells in the user's selected IANA timezone. */
function formatCalendarDateKeyInTimezone(d: Date, iana: string): string {
  return dayjs(d).tz(iana).format("YYYY-MM-DD");
}

function slotStartToCalendarDateKeyInTimezone(
  startIso: string,
  iana: string
): string {
  return dayjs(startIso).tz(iana).format("YYYY-MM-DD");
}

/**
 * Branded full-page status screen used for loading-error, calendar-not-connected,
 * already-booked, and post-confirm success states. Mirrors the pattern used in
 * `CandidateConsentPublic.tsx` for consistency across public recruitment + booking
 * pages.
 */
function StatusScreen({
  icon: Icon,
  tint,
  title,
  message,
  children,
  widthClass = "max-w-lg",
}: {
  icon: typeof AlertTriangle;
  tint: string;
  title: string;
  message: string;
  children?: React.ReactNode;
  /** Override the card's max width — e.g. `max-w-2xl` for content-heavy
   *  states like already-booked / success that pack a timezone picker plus
   *  meeting details and look cramped at the default `max-w-lg`. */
  widthClass?: string;
}) {
  return (
    // p-3 sm:p-6 — tighter outer gutter on phones so the card claims more of
    // the viewport width. p-5 sm:p-8 inside the card likewise reclaims space
    // that was previously eaten by 32px of mobile padding on each side.
    <div className="flex min-h-screen items-center justify-center bg-secondary p-3 sm:p-6">
      <div
        className={cn(
          "w-full rounded-2xl border border-border bg-card p-5 text-center sm:p-8",
          widthClass
        )}
      >
        <div
          className={cn(
            "mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl",
            tint
          )}
        >
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        {children}
        <div className="mt-6 text-sm text-muted-foreground">
          Powered by{" "}
          <span className="font-semibold text-brand-amethyst">Prospectly</span>
        </div>
      </div>
    </div>
  );
}

interface MiniPersonProps {
  name?: string;
  title?: string;
  company?: string;
  photoUrl?: string | null;
  linkedInUrl?: string | null;
  trustScore?: number;
  roleLabel: string;
  roleColorClass: string;
  trustChipClass: string;
  onReviewsClick: () => void;
}

/**
 * A role-tinted mini person card used in the left rail's "People" card.
 *
 * Avatar is pinned top-left; identity (role, name, title) and the action
 * buttons share a single column to the right of it, so the buttons indent
 * past the avatar and start under the name. Buttons are content-sized
 * pills (not flex-1) so they don't stretch and look chunky.
 *
 *   ┌────────────────────────────────────────────┐
 *   │ [Avatar] ROLE                    🛡 score  │
 *   │          Full name (wraps if long)         │
 *   │          Title · Company                   │
 *   │          [🔗 LinkedIn]  [⭐ Reviews]       │
 *   └────────────────────────────────────────────┘
 */
function MiniPerson({
  name,
  title,
  company,
  photoUrl,
  linkedInUrl,
  trustScore,
  roleLabel,
  roleColorClass,
  trustChipClass,
  onReviewsClick,
}: MiniPersonProps) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all",
        // Subtle hover affordance — the whole card lifts a touch, but actual
        // clicks happen on the explicit buttons below so users always know
        // what's interactive.
        "hover:border-brand-amethyst/25 hover:shadow-brand-card"
      )}
    >
      {/* Avatar vertically centered against the full identity stack (role +
          name + title + buttons) — items-center on the parent splits the
          extra vertical space evenly above and below the photo. */}
      <PremiumAvatar
        name={name || "User"}
        size="sm"
        imageUrl={photoUrl}
        showPurpleRing={false}
        className="flex-shrink-0"
      />

      {/* Identity + action buttons share this column so the buttons indent
          past the avatar and start from where the name starts. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "text-[10px] font-extrabold uppercase tracking-wider leading-none",
              roleColorClass
            )}
          >
            {roleLabel}
          </div>
          {/* Trust chip — Shield icon + visible "Trust" label + score so the
              number's meaning is explicit at a glance (no domain knowledge
              needed). Tooltip + aria-label spell it out fully on hover and
              for screen readers. */}
          <span
            className={cn(
              "inline-flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 leading-none",
              trustChipClass
            )}
            title={`Trust score: ${trustScore ?? 0}`}
            aria-label={`Trust score ${trustScore ?? 0}`}
          >
            <Shield className="h-3 w-3" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-80">
              Trust
            </span>
            <span className="font-mono text-[11px] font-extrabold">
              {trustScore ?? 0}
            </span>
          </span>
        </div>
        {/* Names always render in full — wrap rather than truncate. */}
        <div className="mt-1 break-words text-sm font-extrabold leading-tight">
          {name || "—"}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {[title, company].filter(Boolean).join(" · ") || "Professional"}
        </div>

        {/* Action buttons sit inside the identity column → naturally aligned
            under the name (indented past the avatar). Content-sized pills
            (no flex-1) so they stay compact rather than stretching. */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {linkedInUrl && (
            <button
              type="button"
              onClick={() =>
                window.open(linkedInUrl, "_blank", "noopener,noreferrer")
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-sky/20 bg-brand-sky/10 px-2.5 py-1 text-[11px] font-bold text-brand-sky transition-colors hover:border-brand-sky/40 hover:bg-brand-sky/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sky/40"
              aria-label={`Open ${name || "user"} on LinkedIn`}
            >
              <Linkedin className="h-3 w-3" />
              LinkedIn
            </button>
          )}
          <button
            type="button"
            onClick={onReviewsClick}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-amethyst/20 bg-brand-amethyst/10 px-2.5 py-1 text-[11px] font-bold text-brand-amethyst transition-colors hover:border-brand-amethyst/40 hover:bg-brand-amethyst/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst/40"
            aria-label={`View reviews for ${name || roleLabel}`}
          >
            <Star className="h-3 w-3" />
            Reviews
          </button>
        </div>
      </div>
    </div>
  );
}

interface BookMeetingRequestData {
  success?: boolean;
  error?: string;
  requestCreatedAt?: string;
  availableSlots?: BookMeetingTimeSlot[];
  requesterTimezone?: string;
  hasCalendarConnected?: boolean;
  targetContactId?: number | null;
  targetContactName?: string;
  targetContactEmail?: string;
  targetContactTitle?: string;
  targetContactCompany?: string;
  targetContactPhotoUrl?: string | null;
  requesterId?: string;
  requesterName?: string;
  requesterTitle?: string;
  requesterCompany?: string;
  requesterPhotoUrl?: string | null;
  requesterLinkedInUrl?: string | null;
  requesterTrustScore?: number;
  connectorId?: string | null;
  connectorName?: string;
  connectorTitle?: string;
  connectorPhotoUrl?: string | null;
  connectorLinkedInUrl?: string | null;
  connectorCompany?: string;
  connectorTrustScore?: number;
  message?: string;
  meetingTitle?: string;
  isAlreadyBooked?: boolean;
  meeting_booked?: boolean;
  targetContactLinkedInUrl?: string | null;
  targetContactTrustScore?: number;
  scheduledMeeting?: {
    startTime: string;
    endTime: string;
    duration: number;
    timezone: string;
    meetingUrl?: string;
  };
}

interface BookMeetingTimeSlot {
  start: string;
  end: string;
}

function filterSlotsInBookingWindow({
  slots,
  requestCreatedAt,
}: {
  slots: BookMeetingTimeSlot[];
  requestCreatedAt?: string;
}): BookMeetingTimeSlot[] {
  const requestCreated = requestCreatedAt ? dayjs(requestCreatedAt) : dayjs();
  const earliestAllowedTime = requestCreated.add(24, "hour");
  const latestAllowedDate = earliestAllowedTime.add(14, "day");
  return slots.filter((slot) => {
    const slotStart = dayjs(slot.start);
    return (
      slotStart.isAfter(earliestAllowedTime) &&
      slotStart.isBefore(latestAllowedDate)
    );
  });
}

function isCalendarNotConnectedError(error: string): boolean {
  return (
    error.includes("Calendar integration not found") ||
    error.includes("calendar") ||
    error.includes("integration")
  );
}

function isAlreadyBookedBookingError({
  err,
  message,
}: {
  err: unknown;
  message: string;
}): boolean {
  return (
    (err instanceof ApiError && err.status === 409) ||
    message.toLowerCase().includes("already been booked")
  );
}

function toFetchErrorMessage(err: unknown): string {
  return err instanceof Error
    ? err.message
    : "Failed to load booking information";
}

function openReviewsForPerson({
  setSelectedUserForReview,
  setReviewsDialogOpen,
  id,
  name,
  trustScore,
  requireUserId,
}: {
  setSelectedUserForReview: Dispatch<
    SetStateAction<{
      id?: string;
      name?: string;
      trustScore?: number;
    } | null>
  >;
  setReviewsDialogOpen: Dispatch<SetStateAction<boolean>>;
  id?: string;
  name?: string;
  trustScore?: number;
  requireUserId?: boolean;
}): void {
  if (!name) return;
  if (requireUserId && !id) return;
  setSelectedUserForReview({
    id,
    name,
    trustScore: trustScore || 0,
  });
  setReviewsDialogOpen(true);
}

function useBookMeetingVisibilityRefetch({
  requestId,
  bookingToken,
  fetchAvailability,
  successRef,
  loadingRef,
}: {
  requestId?: string;
  bookingToken?: string;
  fetchAvailability: () => Promise<void>;
  successRef: MutableRefObject<boolean>;
  loadingRef: MutableRefObject<boolean>;
}): void {
  useEffect(() => {
    const debounceMs = 300;
    let timeoutId: number | undefined;

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!requestId || !bookingToken) return;
      if (successRef.current || loadingRef.current) return;

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        timeoutId = undefined;
        if (successRef.current || loadingRef.current) return;
        void fetchAvailability();
      }, debounceMs);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [requestId, bookingToken, fetchAvailability, successRef, loadingRef]);
}

function BookMeetingLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-secondary">
      <header className="sticky top-0 z-[60] flex h-[60px] items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="hidden h-7 w-48 rounded-full lg:block" />
      </header>
      <main className="container mx-auto max-w-[1180px] px-4 pb-20 pt-6 sm:px-7">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-[640px] w-full rounded-2xl" />
        </div>
      </main>
    </div>
  );
}

function BookMeetingErrorScreens({
  error,
  requesterName,
}: {
  error: string;
  requesterName?: string;
}) {
  if (isCalendarNotConnectedError(error)) {
    return (
      <StatusScreen
        icon={AlertTriangle}
        tint="bg-amber-100 text-amber-600"
        title="Calendar Setup Required"
        message={error}
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
          <p className="mb-2 text-sm font-semibold text-amber-900">
            The person who requested this meeting needs to complete their
            calendar setup.
          </p>
          <p className="text-xs leading-relaxed text-amber-800">
            Once they connect their Google or Microsoft calendar, you&apos;ll be
            able to see their availability and book a time that works for both
            of you.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-brand-sky/15 bg-brand-sky/5 p-4 text-left">
          <p className="mb-2 text-sm font-semibold text-brand-sky">
            👋 Are you {requesterName}?
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            Connect your calendar to enable booking for this meeting request.
          </p>
          <Button
            className="w-full bg-brand-gradient text-white shadow-brand-cta hover:shadow-brand-cta-lg"
            onClick={() => (window.location.href = "/getting-started?step=2")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Connect My Calendar
          </Button>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-1 text-xs text-muted-foreground">
            Not {requesterName}?
          </p>
          <p className="text-xs text-muted-foreground">
            Please ask them to complete their calendar setup and share a new
            booking link with you.
          </p>
        </div>
      </StatusScreen>
    );
  }

  return (
    <StatusScreen
      icon={AlertTriangle}
      tint="bg-red-100 text-red-600"
      title="Booking Link Invalid"
      message={error}
    >
      <div className="rounded-xl border border-border bg-secondary p-4">
        <p className="mb-2 text-sm text-muted-foreground">
          This booking link may have expired or been cancelled.
        </p>
        <p className="text-xs text-muted-foreground">
          Please contact {requesterName || "the requester"} for a new booking
          link.
        </p>
      </div>
    </StatusScreen>
  );
}

function BookMeetingTimezonePicker({
  timezone,
  timezoneOpen,
  onTimezoneOpenChange,
  onTimezoneChange,
  triggerClassName,
}: {
  timezone: string;
  timezoneOpen: boolean;
  onTimezoneOpenChange: (open: boolean) => void;
  onTimezoneChange: (iana: string) => void;
  triggerClassName?: string;
}) {
  return (
    <Popover open={timezoneOpen} onOpenChange={onTimezoneOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={timezoneOpen}
          className={cn("w-full justify-between", triggerClassName)}
        >
          <span className="truncate">{majorTimezoneLabel(timezone)}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full max-w-[calc(100vw-2rem)] p-0"
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
      >
        <Command>
          <CommandInput placeholder="Search timezone..." />
          <CommandList className="max-h-[min(20rem,50vh)]">
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {MAJOR_TIMEZONES.map((tz) => (
                <CommandItem
                  key={tz.value}
                  value={tz.value}
                  onSelect={() => {
                    onTimezoneChange(tz.value);
                    onTimezoneOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      canonicalMajorTimezone(timezone) === tz.value
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {tz.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function BookMeetingAlreadyBookedScreen({
  requestData,
  timezone,
  timezoneOpen,
  onTimezoneOpenChange,
  onTimezoneChange,
}: {
  requestData: BookMeetingRequestData;
  timezone: string;
  timezoneOpen: boolean;
  onTimezoneOpenChange: (open: boolean) => void;
  onTimezoneChange: (iana: string) => void;
}) {
  const meeting = requestData.scheduledMeeting!;
  return (
    <StatusScreen
      icon={CheckCircle}
      tint="bg-emerald-100 text-emerald-600"
      title="Meeting Already Booked"
      message="This meeting has been confirmed."
      widthClass="max-w-xl"
    >
      <div className="mb-4 rounded-xl border border-border bg-secondary p-4 text-left">
        <Label className="mb-2 block text-sm font-medium">
          View meeting time in your timezone
        </Label>
        <BookMeetingTimezonePicker
          timezone={timezone}
          timezoneOpen={timezoneOpen}
          onTimezoneOpenChange={onTimezoneOpenChange}
          onTimezoneChange={onTimezoneChange}
        />
      </div>

      <div className="rounded-xl border border-border bg-secondary p-4 text-left sm:p-5">
        {requestData.meetingTitle && (
          <div className="mb-3 border-b border-border pb-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Meeting
            </div>
            <div className="mt-0.5 text-base font-extrabold">
              {requestData.meetingTitle}
            </div>
          </div>
        )}
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Date
            </div>
            <div className="text-sm font-bold">
              {dayjs(meeting.startTime)
                .tz(timezone)
                .format("dddd, MMMM D, YYYY")}
            </div>
          </div>
        </div>
        <div className="mb-3 flex items-start gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-rose/10 text-brand-rose">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Time
            </div>
            <div className="text-sm font-bold">
              {dayjs(meeting.startTime).tz(timezone).format("h:mm A")} –{" "}
              {dayjs(meeting.endTime).tz(timezone).format("h:mm A")}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {majorTimezoneLabel(timezone)}
            </div>
            {canonicalMajorTimezone(timezone) !==
              canonicalMajorTimezone(meeting.timezone) && (
              <div className="mt-1 text-[11px] italic text-brand-amethyst">
                Organizer&apos;s time:{" "}
                {dayjs(meeting.startTime).tz(meeting.timezone).format("h:mm A")}{" "}
                ({majorTimezoneLabel(meeting.timezone)})
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-sky/10 text-brand-sky">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Duration
            </div>
            <div className="text-sm font-bold">{meeting.duration} minutes</div>
          </div>
        </div>
        {meeting.meetingUrl && (
          <Button
            className="mt-4 w-full bg-brand-gradient text-white shadow-brand-cta hover:shadow-brand-cta-lg"
            onClick={() => window.open(meeting.meetingUrl, "_blank")}
          >
            Join Meeting
          </Button>
        )}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand-sky/15 bg-brand-sky/5 p-4 text-left text-sm">
        <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-sky" />
        <span className="text-muted-foreground">
          This meeting has been scheduled. All parties have received calendar
          invites.
        </span>
      </div>
    </StatusScreen>
  );
}

function BookMeetingConfirmedScreen({
  requestData,
  selectedSlot,
  timezone,
  duration,
}: {
  requestData: BookMeetingRequestData | null;
  selectedSlot: BookMeetingTimeSlot | null;
  timezone: string;
  duration: number;
}) {
  return (
    <StatusScreen
      icon={CheckCircle}
      tint="bg-emerald-100 text-emerald-600"
      title="Meeting Confirmed"
      message={`Your meeting with ${requestData?.requesterName ?? "the requester"} is all set.`}
      widthClass="max-w-xl"
    >
      <div className="rounded-xl border border-border bg-secondary p-4 text-left sm:p-5">
        {requestData?.meetingTitle && (
          <div className="mb-3 border-b border-border pb-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Meeting
            </div>
            <div className="mt-0.5 text-base font-extrabold">
              {requestData.meetingTitle}
            </div>
          </div>
        )}
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Date
            </div>
            <div className="text-sm font-bold">
              {selectedSlot &&
                dayjs(selectedSlot.start)
                  .tz(timezone)
                  .format("dddd, MMMM D, YYYY")}
            </div>
          </div>
        </div>
        <div className="mb-3 flex items-start gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-rose/10 text-brand-rose">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Time
            </div>
            <div className="text-sm font-bold">
              {selectedSlot &&
                dayjs(selectedSlot.start).tz(timezone).format("h:mm A")}{" "}
              –{" "}
              {selectedSlot &&
                dayjs(selectedSlot.end).tz(timezone).format("h:mm A")}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {majorTimezoneLabel(timezone)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-sky/10 text-brand-sky">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Duration
            </div>
            <div className="text-sm font-bold">{duration} minutes</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand-sky/15 bg-brand-sky/5 p-4 text-left text-sm">
        <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-sky" />
        <span className="text-muted-foreground">
          Confirmation emails with meeting details and calendar invites have
          been sent to all parties.
        </span>
      </div>
    </StatusScreen>
  );
}

function isBookMeetingAlreadyBookedState(
  requestData: BookMeetingRequestData | null
): requestData is BookMeetingRequestData & {
  scheduledMeeting: NonNullable<BookMeetingRequestData["scheduledMeeting"]>;
} {
  return Boolean(
    (requestData?.isAlreadyBooked || requestData?.meeting_booked) &&
    requestData?.scheduledMeeting
  );
}

async function loadBookMeetingAvailability({
  requestId,
  bookingToken,
}: {
  requestId: string;
  bookingToken: string;
}): Promise<{
  data: BookMeetingRequestData;
  filteredSlots: BookMeetingTimeSlot[];
}> {
  const data = (await apiRequest(
    `/introduction-requests/booking/${requestId}/${bookingToken}/availability`,
    { method: "GET" }
  )) as BookMeetingRequestData;

  if (!data.success) {
    throw new Error(data.error || "Failed to load booking information");
  }

  return {
    data,
    filteredSlots: filterSlotsInBookingWindow({
      slots: data.availableSlots || [],
      requestCreatedAt: data.requestCreatedAt,
    }),
  };
}

function applyBookMeetingConfirmResult({
  result,
  setSuccess,
  toast,
  fetchAvailability,
}: {
  result:
    | { ok: true }
    | {
        ok: false;
        reason: "missing" | "failed" | "already-booked";
        message: string;
      };
  setSuccess: Dispatch<SetStateAction<boolean>>;
  toast: ReturnType<typeof useToast>["toast"];
  fetchAvailability: () => Promise<void>;
}): void {
  if (result.ok === false) {
    if (result.reason === "missing") {
      toast({
        title: "Missing Information",
        description: result.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title:
        result.reason === "already-booked"
          ? "Meeting already booked"
          : "Booking Failed",
      description: result.message,
      variant: "destructive",
    });

    if (result.reason === "already-booked") {
      void fetchAvailability();
    }
    return;
  }

  setSuccess(true);
  toast({
    title: "Meeting Booked! 🎉",
    description: "Confirmation emails have been sent to all parties.",
  });
}

async function confirmBookMeeting({
  requestId,
  bookingToken,
  selectedSlot,
  contactEmail,
  contactName,
  duration,
  timezone,
  requesterTimezone,
}: {
  requestId: string;
  bookingToken: string;
  selectedSlot: BookMeetingTimeSlot | null;
  contactEmail: string;
  contactName: string;
  duration: number;
  timezone: string;
  requesterTimezone: string;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      reason: "missing" | "failed" | "already-booked";
      message: string;
    }
> {
  if (!selectedSlot || !contactEmail || !contactName) {
    return {
      ok: false,
      reason: "missing",
      message: "Please fill in all required fields",
    };
  }

  try {
    const data = (await apiRequest(
      `/introduction-requests/booking/${requestId}/${bookingToken}/confirm`,
      {
        method: "POST",
        body: JSON.stringify({
          selectedSlot,
          duration,
          targetContactEmail: contactEmail,
          targetContactName: contactName,
          timezone,
          requesterTimezone,
        }),
      }
    )) as { success: boolean; error?: string };

    if (!data.success) {
      throw new Error(data.error || "Failed to book meeting");
    }

    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to book meeting";
    if (isAlreadyBookedBookingError({ err, message })) {
      return { ok: false, reason: "already-booked", message };
    }
    return { ok: false, reason: "failed", message };
  }
}

function renderBookMeetingPageContent({
  loading,
  error,
  requestData,
  success,
  selectedSlot,
  timezone,
  timezoneOpen,
  duration,
  contactName,
  contactEmail,
  whyExpanded,
  selectedDate,
  requesterTimezone,
  datesWithSlots,
  getSlotCalendarDateKey,
  slotsForSelectedDate,
  booking,
  selectedUserForReview,
  reviewsDialogOpen,
  setWhyExpanded,
  setTimezoneOpen,
  setTimezone,
  setSelectedDate,
  setSelectedSlot,
  setReviewsDialogOpen,
  handleBookMeeting,
  handleViewRequesterReviews,
  handleViewConnectorReviews,
  handleViewProspectReviews,
}: {
  loading: boolean;
  error: string;
  requestData: BookMeetingRequestData | null;
  success: boolean;
  selectedSlot: BookMeetingTimeSlot | null;
  timezone: string;
  timezoneOpen: boolean;
  duration: number;
  contactName: string;
  contactEmail: string;
  whyExpanded: boolean;
  selectedDate: Date | undefined;
  requesterTimezone: string;
  datesWithSlots: Set<string>;
  getSlotCalendarDateKey: (date: Date) => string;
  slotsForSelectedDate: BookMeetingTimeSlot[];
  booking: boolean;
  selectedUserForReview: {
    id?: string;
    name?: string;
    trustScore?: number;
  } | null;
  reviewsDialogOpen: boolean;
  setWhyExpanded: Dispatch<SetStateAction<boolean>>;
  setTimezoneOpen: Dispatch<SetStateAction<boolean>>;
  setTimezone: Dispatch<SetStateAction<string>>;
  setSelectedDate: Dispatch<SetStateAction<Date | undefined>>;
  setSelectedSlot: Dispatch<SetStateAction<BookMeetingTimeSlot | null>>;
  setReviewsDialogOpen: Dispatch<SetStateAction<boolean>>;
  handleBookMeeting: () => void;
  handleViewRequesterReviews: () => void;
  handleViewConnectorReviews: () => void;
  handleViewProspectReviews: () => void;
}) {
  if (loading) {
    return <BookMeetingLoadingSkeleton />;
  }

  if (error) {
    return (
      <BookMeetingErrorScreens
        error={error}
        requesterName={requestData?.requesterName}
      />
    );
  }

  if (isBookMeetingAlreadyBookedState(requestData)) {
    return (
      <BookMeetingAlreadyBookedScreen
        requestData={requestData}
        timezone={timezone}
        timezoneOpen={timezoneOpen}
        onTimezoneOpenChange={setTimezoneOpen}
        onTimezoneChange={setTimezone}
      />
    );
  }

  if (success) {
    return (
      <BookMeetingConfirmedScreen
        requestData={requestData}
        selectedSlot={selectedSlot}
        timezone={timezone}
        duration={duration}
      />
    );
  }

  return (
    <BookMeetingMainScreen
      requestData={requestData}
      contactName={contactName}
      contactEmail={contactEmail}
      whyExpanded={whyExpanded}
      onWhyExpandedChange={setWhyExpanded}
      duration={duration}
      timezone={timezone}
      timezoneOpen={timezoneOpen}
      onTimezoneOpenChange={setTimezoneOpen}
      onTimezoneChange={(iana) => {
        setTimezone(iana);
        setSelectedDate(undefined);
        setSelectedSlot(null);
      }}
      selectedDate={selectedDate}
      onSelectedDateChange={setSelectedDate}
      selectedSlot={selectedSlot}
      onSelectedSlotChange={setSelectedSlot}
      requesterTimezone={requesterTimezone}
      datesWithSlots={datesWithSlots}
      getSlotCalendarDateKey={getSlotCalendarDateKey}
      slotsForSelectedDate={slotsForSelectedDate}
      booking={booking}
      onBookMeeting={handleBookMeeting}
      onViewRequesterReviews={handleViewRequesterReviews}
      onViewConnectorReviews={handleViewConnectorReviews}
      onViewProspectReviews={handleViewProspectReviews}
      selectedUserForReview={selectedUserForReview}
      reviewsDialogOpen={reviewsDialogOpen}
      onReviewsDialogOpenChange={setReviewsDialogOpen}
    />
  );
}

type BookMeetingMainScreenProps = {
  requestData: BookMeetingRequestData | null;
  contactName: string;
  contactEmail: string;
  whyExpanded: boolean;
  onWhyExpandedChange: Dispatch<SetStateAction<boolean>>;
  duration: number;
  timezone: string;
  timezoneOpen: boolean;
  onTimezoneOpenChange: Dispatch<SetStateAction<boolean>>;
  onTimezoneChange: (iana: string) => void;
  selectedDate: Date | undefined;
  onSelectedDateChange: Dispatch<SetStateAction<Date | undefined>>;
  selectedSlot: BookMeetingTimeSlot | null;
  onSelectedSlotChange: Dispatch<SetStateAction<BookMeetingTimeSlot | null>>;
  requesterTimezone: string;
  datesWithSlots: Set<string>;
  getSlotCalendarDateKey: (date: Date) => string;
  slotsForSelectedDate: BookMeetingTimeSlot[];
  booking: boolean;
  onBookMeeting: () => void;
  onViewRequesterReviews: () => void;
  onViewConnectorReviews: () => void;
  onViewProspectReviews: () => void;
  selectedUserForReview: {
    id?: string;
    name?: string;
    trustScore?: number;
  } | null;
  reviewsDialogOpen: boolean;
  onReviewsDialogOpenChange: Dispatch<SetStateAction<boolean>>;
};

type BookMeetingLeftRailProps = Pick<
  BookMeetingMainScreenProps,
  | "requestData"
  | "contactName"
  | "whyExpanded"
  | "onWhyExpandedChange"
  | "onViewRequesterReviews"
  | "onViewConnectorReviews"
  | "onViewProspectReviews"
>;

function BookMeetingWhyMeetCard({
  requestData,
  whyExpanded,
  onWhyExpandedChange,
}: Pick<
  BookMeetingLeftRailProps,
  "requestData" | "whyExpanded" | "onWhyExpandedChange"
>) {
  if (!requestData?.meetingTitle && !requestData?.message) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-brand-card">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-white shadow-brand-cta">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="text-[11px] font-extrabold uppercase tracking-wider">
          Why They Want to Meet
        </div>
      </div>
      {requestData.meetingTitle ? (
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-amethyst">
            <CalendarIcon className="h-3 w-3" />
            Title
          </div>
          <div className="text-sm font-extrabold leading-snug">
            {requestData.meetingTitle}
          </div>
        </div>
      ) : null}
      {requestData.message ? (
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-amethyst">
            <TrendingUp className="h-3 w-3" />
            Description
          </div>
          <p
            className={cn(
              "whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground/80",
              !whyExpanded && "line-clamp-3"
            )}
          >
            {requestData.message}
          </p>
          {requestData.message.length > 160 ? (
            <button
              type="button"
              onClick={() => onWhyExpandedChange((v) => !v)}
              className="mt-1.5 text-[11px] font-extrabold text-brand-amethyst underline-offset-2 hover:text-brand-rose hover:underline"
            >
              {whyExpanded ? "Show less" : "Read more"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BookMeetingLeftRail({
  requestData,
  contactName,
  whyExpanded,
  onWhyExpandedChange,
  onViewRequesterReviews,
  onViewConnectorReviews,
  onViewProspectReviews,
}: BookMeetingLeftRailProps) {
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-[80px]">
      <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-brand-card">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
        />
        <div className="relative">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur">
            <Sparkles className="h-3 w-3" />
            Meeting Request
          </span>
          <h1 className="text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
            {requestData?.requesterName ?? "Someone"} wants to meet you
          </h1>
          <p className="mt-2 text-sm leading-relaxed opacity-90">
            Introduced by {requestData?.connectorName ?? "a verified connector"}
            . Pick a time below.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-brand-card">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-sky/10 text-brand-sky">
            <Users className="h-4 w-4" />
          </div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider">
            The People
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <MiniPerson
            name={requestData?.requesterName}
            title={requestData?.requesterTitle}
            company={requestData?.requesterCompany}
            photoUrl={requestData?.requesterPhotoUrl}
            linkedInUrl={requestData?.requesterLinkedInUrl}
            trustScore={requestData?.requesterTrustScore}
            roleLabel="Requester"
            roleColorClass="text-brand-success"
            trustChipClass="bg-brand-success/10 text-brand-success"
            onReviewsClick={onViewRequesterReviews}
          />
          <MiniPerson
            name={requestData?.connectorName}
            title={requestData?.connectorTitle}
            company={requestData?.connectorCompany}
            photoUrl={requestData?.connectorPhotoUrl}
            linkedInUrl={requestData?.connectorLinkedInUrl}
            trustScore={requestData?.connectorTrustScore}
            roleLabel="Connector"
            roleColorClass="text-brand-sky"
            trustChipClass="bg-brand-sky/10 text-brand-sky"
            onReviewsClick={onViewConnectorReviews}
          />
          <MiniPerson
            name={requestData?.targetContactName || contactName}
            title={requestData?.targetContactTitle}
            company={requestData?.targetContactCompany}
            photoUrl={requestData?.targetContactPhotoUrl}
            linkedInUrl={requestData?.targetContactLinkedInUrl}
            trustScore={requestData?.targetContactTrustScore}
            roleLabel="You"
            roleColorClass="text-brand-amethyst"
            trustChipClass="bg-brand-amethyst/10 text-brand-amethyst"
            onReviewsClick={onViewProspectReviews}
          />
        </div>
      </div>
      <BookMeetingWhyMeetCard
        requestData={requestData}
        whyExpanded={whyExpanded}
        onWhyExpandedChange={onWhyExpandedChange}
      />
      {requestData?.hasCalendarConnected === false ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div>
            <div className="mb-0.5 font-bold text-amber-900">
              Calendar Not Configured
            </div>
            <p className="text-xs leading-relaxed text-amber-800">
              {requestData?.requesterName || "The requester"} needs to connect
              their Google or Microsoft calendar to enable slot selection.
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

type BookMeetingBookingPanelProps = Pick<
  BookMeetingMainScreenProps,
  | "requestData"
  | "contactName"
  | "contactEmail"
  | "duration"
  | "timezone"
  | "timezoneOpen"
  | "onTimezoneOpenChange"
  | "onTimezoneChange"
  | "selectedDate"
  | "onSelectedDateChange"
  | "selectedSlot"
  | "onSelectedSlotChange"
  | "requesterTimezone"
  | "datesWithSlots"
  | "getSlotCalendarDateKey"
  | "slotsForSelectedDate"
  | "booking"
  | "onBookMeeting"
>;

function BookMeetingBookingSection({
  requestData,
  contactName,
  contactEmail,
  duration,
  timezone,
  timezoneOpen,
  onTimezoneOpenChange,
  onTimezoneChange,
  selectedDate,
  onSelectedDateChange,
  selectedSlot,
  onSelectedSlotChange,
  requesterTimezone,
  datesWithSlots,
  getSlotCalendarDateKey,
  slotsForSelectedDate,
  booking,
  onBookMeeting,
}: BookMeetingBookingPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-brand-card sm:p-8">
      {/* Booking header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[200px] flex-1">
          <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-brand-sky/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-sky">
            <CalendarIcon className="h-3.5 w-3.5" />
            Book a Time
          </span>
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            Pick a time that works for you
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Calendar invites are sent automatically once you confirm.
          </p>
        </div>
        <div className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl border border-brand-amethyst/15 bg-brand-amethyst/10 px-3.5 py-2 text-sm font-bold text-brand-amethyst">
          <Clock className="h-4 w-4" />
          {duration} min
        </div>
      </div>

      {/* Timezone row — Popover/Command preserved. The min-w-0 + flex-1
                chain on every nesting level is what lets the long timezone
                label actually truncate on mobile instead of overflowing the
                bordered container. */}
      <div className="mb-4 flex w-full min-w-0 flex-col items-stretch gap-3 rounded-xl border border-border bg-secondary px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-muted-foreground">
              Your Timezone
            </div>
            <Popover open={timezoneOpen} onOpenChange={onTimezoneOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  role="combobox"
                  aria-expanded={timezoneOpen}
                  // hover:text-foreground keeps the label readable on
                  // hover — the ghost variant defaults to
                  // `hover:text-accent-foreground` which can render as
                  // near-white on this brand background.
                  // w-full + min-w-0 + max-w-full are required for the
                  // inner span's `truncate` to actually engage on mobile
                  // when the timezone label is long.
                  className="h-auto w-full min-w-0 max-w-full justify-start gap-2 px-0 py-0.5 font-bold text-foreground hover:bg-transparent hover:text-foreground"
                >
                  <span className="min-w-0 flex-1 truncate text-left text-sm">
                    {majorTimezoneLabel(timezone)}
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-full max-w-[calc(100vw-2rem)] p-0"
                align="start"
                side="bottom"
                sideOffset={8}
                collisionPadding={16}
              >
                <Command>
                  <CommandInput placeholder="Search timezone..." />
                  <CommandList className="max-h-[min(20rem,50vh)]">
                    <CommandEmpty>No timezone found.</CommandEmpty>
                    <CommandGroup>
                      {MAJOR_TIMEZONES.map((tz) => (
                        <CommandItem
                          key={tz.value}
                          value={tz.value}
                          onSelect={() => {
                            onTimezoneChange(tz.value);
                            onTimezoneOpenChange(false);
                          }}
                          // Override shadcn's default
                          // `data-[selected]:bg-accent text-accent-foreground`
                          // (which renders near-white text on hover) with
                          // a brand-amethyst tint that keeps the label
                          // readable.
                          className="aria-selected:bg-brand-amethyst/10 aria-selected:text-foreground data-[selected=true]:bg-brand-amethyst/10 data-[selected=true]:text-foreground"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              canonicalMajorTimezone(timezone) === tz.value
                                ? "opacity-100 text-brand-amethyst"
                                : "opacity-0"
                            )}
                          />
                          {tz.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Availability note */}
      {requesterTimezone && requesterTimezone !== "UTC" && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-sky/15 bg-brand-sky/5 px-4 py-3 text-sm">
          <Info className="h-4 w-4 flex-shrink-0 text-brand-sky" />
          <span>
            <b className="font-bold text-brand-sky">
              {requestData?.requesterName?.split(" ")[0] || "The requester"} is
              available 9 AM – 5 PM
            </b>{" "}
            in{" "}
            <b className="font-bold">
              {MAJOR_TIMEZONES.find(
                (tz) => tz.value === canonicalMajorTimezone(requesterTimezone)
              )?.label.split(" - ")[0] || requesterTimezone}
            </b>
          </span>
        </div>
      )}

      {/* Calendar + slots */}
      <div className="mb-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {/* Calendar — fills the 420px wrapper. We override Day Picker's
                  internal layout (months/month/table) so the day grid stretches
                  to fill remaining vertical space after the caption + weekday
                  header, instead of shrinking around a tiny aspect-[1.5] grid. */}
        <div className="flex h-[420px] flex-col rounded-2xl border border-border bg-card p-3 sm:p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onSelectedDateChange}
            disabled={(date) => {
              const dateKey = getSlotCalendarDateKey(date);
              const todayKey = dayjs().tz(timezone).format("YYYY-MM-DD");
              const isPast = dateKey < todayKey;
              // Check if there are any slots for this date using pre-computed
              // set (O(1) lookup). We don't filter weekends because a weekend
              // in the user's timezone might be a weekday in the requester's.
              const hasSlots = datesWithSlots.has(dateKey);
              return isPast || !hasSlots;
            }}
            className="flex h-full w-full flex-col p-0"
            // Override shadcn defaults so:
            //   1. the selected day uses the brand gradient + 8px radius
            //      (matching option4's `.cal-day`), not the default blue;
            //   2. the cell's `bg-accent` wrapper is removed so the
            //      gradient pill stands alone;
            //   3. the day grid stretches to fill the 420px wrapper
            //      instead of leaving big gaps above and below.
            classNames={{
              months:
                "flex h-full w-full flex-col space-y-3 sm:space-x-4 sm:space-y-0",
              month: "flex h-full w-full flex-col space-y-3",
              caption: "flex justify-center pt-1 relative items-center h-9",
              caption_label: "text-sm font-bold",
              table: "flex h-full w-full flex-col border-collapse",
              head_row: "flex w-full",
              head_cell:
                "text-muted-foreground rounded-md flex-1 text-center font-semibold text-[0.7rem] uppercase tracking-wider pb-1",
              tbody: "flex flex-1 flex-col",
              row: "flex w-full flex-1 mt-1 gap-1",
              // Cell stays flex-1 to spread evenly across 7 columns and
              // centers the (square) day pill vertically inside its
              // slightly-taller row.
              cell: "relative flex flex-1 items-center justify-center p-0 text-center text-sm focus-within:relative focus-within:z-20",
              // aspect-square keeps the day pill perfectly square no
              // matter how tall the row becomes.
              day: "inline-flex aspect-square w-full max-w-[46px] items-center justify-center rounded-lg p-0 text-sm font-medium transition-colors hover:bg-brand-amethyst/10 hover:text-brand-amethyst focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst/40 aria-selected:opacity-100 disabled:pointer-events-none disabled:opacity-40",
              day_selected:
                "rounded-lg bg-brand-gradient font-extrabold text-white shadow-brand-cta hover:bg-brand-gradient hover:text-white focus:bg-brand-gradient focus:text-white",
              day_today:
                "rounded-lg border border-brand-amethyst/40 font-bold text-brand-amethyst",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-40",
            }}
          />
        </div>

        {/* Slots panel — fixed height so many slots scroll inside instead of growing the panel */}
        <div className="flex h-[420px] flex-col rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-border pb-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold">
                {selectedDate
                  ? dayjs(selectedDate).tz(timezone).format("dddd, MMM D")
                  : "Select a date"}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {selectedDate
                  ? "All times in your timezone"
                  : "to view available times"}
              </div>
            </div>
            {selectedDate && slotsForSelectedDate.length > 0 && (
              <span className="flex-shrink-0 rounded-full bg-brand-success/10 px-2.5 py-1 text-[11px] font-extrabold text-brand-success">
                {slotsForSelectedDate.length} slot
                {slotsForSelectedDate.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {!selectedDate ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="px-4 text-sm text-muted-foreground">
                Pick a date on the calendar to see available times
              </p>
            </div>
          ) : slotsForSelectedDate.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="px-4 text-sm text-muted-foreground">
                No slots available for this date
              </p>
            </div>
          ) : (
            // min-h-0 lets the ScrollArea shrink within the flex parent so
            // overflow-auto can actually engage (flex children default to
            // min-height:auto and would otherwise grow to fit content).
            <ScrollArea className="min-h-0 flex-1">
              {/* pr-4 leaves a small gap between the slot pills and the
                        ScrollArea's right-edge scrollbar so they don't touch. */}
              <div className="grid grid-cols-1 gap-2 pr-4">
                {slotsForSelectedDate.map((slot, idx) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectedSlotChange(slot)}
                      className={cn(
                        "min-h-[44px] rounded-lg border px-2 py-2.5 font-mono text-sm font-bold transition-all",
                        isSelected
                          ? "border-transparent bg-brand-gradient text-white shadow-brand-cta"
                          : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-brand-amethyst hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                      )}
                    >
                      {dayjs(slot.start).tz(timezone).format("h:mm A")} –{" "}
                      {dayjs(slot.end).tz(timezone).format("h:mm A")}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Confirm summary + button */}
      <div className="border-t border-border pt-5">
        <div
          className={cn(
            "mb-3 flex items-center gap-4 rounded-xl p-4 transition-colors",
            selectedSlot
              ? "border border-brand-amethyst/15 bg-gradient-to-br from-brand-amethyst/5 to-brand-rose/5"
              : "border border-border bg-secondary"
          )}
        >
          <div
            className={cn(
              "grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl",
              selectedSlot
                ? "bg-brand-gradient text-white shadow-brand-cta"
                : "bg-card text-muted-foreground"
            )}
          >
            {selectedSlot ? (
              <CalendarIcon className="h-5 w-5" />
            ) : (
              <Clock className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <div
              className={cn(
                "text-[11px] font-extrabold uppercase tracking-wider",
                selectedSlot ? "text-brand-amethyst" : "text-muted-foreground"
              )}
            >
              Selected Time
            </div>
            <div
              className={cn(
                "mt-0.5 text-base font-extrabold leading-tight",
                !selectedSlot && "text-muted-foreground"
              )}
            >
              {selectedSlot
                ? `${dayjs(selectedSlot.start).tz(timezone).format("ddd, MMM D")} at ${dayjs(selectedSlot.start).tz(timezone).format("h:mm A")}`
                : "Pick a time to continue"}
            </div>
          </div>
        </div>

        <Button
          onClick={onBookMeeting}
          disabled={!selectedSlot || !contactEmail || !contactName || booking}
          size="lg"
          className="h-12 w-full bg-brand-gradient text-base font-extrabold text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg disabled:hover:translate-y-0 disabled:hover:shadow-brand-cta"
        >
          {booking ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              Confirm Booking
            </>
          )}
        </Button>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Once you confirm, calendar invites go to all three parties.
          </span>
        </div>
      </div>
    </section>
  );
}

function BookMeetingMainScreen({
  requestData,
  contactName,
  contactEmail,
  whyExpanded,
  onWhyExpandedChange,
  duration,
  timezone,
  timezoneOpen,
  onTimezoneOpenChange,
  onTimezoneChange,
  selectedDate,
  onSelectedDateChange,
  selectedSlot,
  onSelectedSlotChange,
  requesterTimezone,
  datesWithSlots,
  getSlotCalendarDateKey,
  slotsForSelectedDate,
  booking,
  onBookMeeting,
  onViewRequesterReviews,
  onViewConnectorReviews,
  onViewProspectReviews,
  selectedUserForReview,
  reviewsDialogOpen,
  onReviewsDialogOpenChange,
}: BookMeetingMainScreenProps) {
  return (
    <div className="min-h-screen bg-secondary pb-20 text-foreground md:pb-0">
      {/* Sticky topbar */}
      <header className="sticky top-0 z-[60] flex h-[60px] items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-8">
        <Link to="/" className="flex flex-shrink-0 items-center gap-2">
          <img
            src="/prospectly-logo.png"
            alt="Prospectly"
            className="h-8 w-auto"
          />
        </Link>
        {requestData?.connectorName && (
          <span className="hidden items-center gap-1.5 rounded-full border border-brand-sky/15 bg-brand-sky/5 px-3 py-1.5 text-[11px] font-bold text-brand-sky lg:inline-flex">
            <Shield className="h-3 w-3" />
            Verified intro · {requestData.connectorName}
          </span>
        )}
      </header>

      <main className="container mx-auto max-w-[1180px] px-4 pb-20 pt-6 sm:px-7">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <BookMeetingLeftRail
            requestData={requestData}
            contactName={contactName}
            whyExpanded={whyExpanded}
            onWhyExpandedChange={onWhyExpandedChange}
            onViewRequesterReviews={onViewRequesterReviews}
            onViewConnectorReviews={onViewConnectorReviews}
            onViewProspectReviews={onViewProspectReviews}
          />

          <BookMeetingBookingSection
            requestData={requestData}
            contactName={contactName}
            contactEmail={contactEmail}
            duration={duration}
            timezone={timezone}
            timezoneOpen={timezoneOpen}
            onTimezoneOpenChange={onTimezoneOpenChange}
            onTimezoneChange={onTimezoneChange}
            selectedDate={selectedDate}
            onSelectedDateChange={onSelectedDateChange}
            selectedSlot={selectedSlot}
            onSelectedSlotChange={onSelectedSlotChange}
            requesterTimezone={requesterTimezone}
            datesWithSlots={datesWithSlots}
            getSlotCalendarDateKey={getSlotCalendarDateKey}
            slotsForSelectedDate={slotsForSelectedDate}
            booking={booking}
            onBookMeeting={onBookMeeting}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-border bg-card sm:mt-12">
        <div className="container mx-auto max-w-[1180px] px-4 py-6 sm:px-7 lg:py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <img
                src="/prospectly-logo.png"
                alt="Prospectly"
                className="h-6 w-auto"
              />
              <span className="text-xs font-semibold text-muted-foreground sm:text-sm">
                Verified intros, on your time
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold sm:gap-6 sm:text-sm">
              <Link
                to="/privacy"
                className="text-muted-foreground transition-colors hover:text-brand-amethyst"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-muted-foreground transition-colors hover:text-brand-amethyst"
              >
                Terms
              </Link>
              <a
                href="mailto:support@prospectly.com"
                className="text-muted-foreground transition-colors hover:text-brand-amethyst"
              >
                Help
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-border bg-background/95 p-3 backdrop-blur-xl md:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Selected
          </div>
          <div className="truncate text-xs font-bold">
            {selectedSlot
              ? dayjs(selectedSlot.start).tz(timezone).format("MMM D · h:mm A")
              : "Pick a time"}
          </div>
        </div>
        <Button
          onClick={onBookMeeting}
          disabled={!selectedSlot || !contactEmail || !contactName || booking}
          size="lg"
          className="flex-shrink-0 gap-1.5 bg-brand-gradient text-white shadow-brand-cta"
        >
          {booking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Confirm
        </Button>
      </div>

      {/* Reviews Dialog */}
      {selectedUserForReview && (
        <ReviewsDialog
          open={reviewsDialogOpen}
          onOpenChange={onReviewsDialogOpenChange}
          connectorName={selectedUserForReview.name || "User"}
          trustScore={selectedUserForReview.trustScore || 0}
          userId={selectedUserForReview.id}
        />
      )}
    </div>
  );
}

export default function BookMeetingPublic() {
  const { requestId, bookingToken } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  const [requestData, setRequestData] = useState<BookMeetingRequestData | null>(
    null
  );
  const [availableSlots, setAvailableSlots] = useState<BookMeetingTimeSlot[]>(
    []
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<BookMeetingTimeSlot | null>(
    null
  );
  const [duration] = useState(30);
  const [timezone, setTimezone] = useState(() =>
    canonicalMajorTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  );
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [success, setSuccess] = useState(false);
  const successRef = useRef(false);
  const loadingRef = useRef(true);
  successRef.current = success;
  loadingRef.current = loading;
  const [requesterTimezone, setRequesterTimezone] = useState<string>("UTC");
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [selectedUserForReview, setSelectedUserForReview] = useState<{
    id?: string;
    name?: string;
    trustScore?: number;
  } | null>(null);
  // UI-only: collapses the meeting-description paragraph in the rail.
  const [whyExpanded, setWhyExpanded] = useState(false);

  const fetchAvailability = useCallback(async () => {
    if (!requestId || !bookingToken) return;

    try {
      setLoading(true);
      setError("");
      const { data, filteredSlots } = await loadBookMeetingAvailability({
        requestId,
        bookingToken,
      });
      setRequestData(data);
      setAvailableSlots(filteredSlots);
      setRequesterTimezone(data.requesterTimezone || "UTC");
      if (data.targetContactName) setContactName(data.targetContactName);
      if (data.targetContactEmail) setContactEmail(data.targetContactEmail);
    } catch (err: unknown) {
      const errorMessage = toFetchErrorMessage(err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [requestId, bookingToken, toast]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  useBookMeetingVisibilityRefetch({
    requestId,
    bookingToken,
    fetchAvailability,
    successRef,
    loadingRef,
  });

  const getSlotCalendarDateKey = useCallback(
    (date: Date): string => formatCalendarDateKeyInTimezone(date, timezone),
    [timezone]
  );

  // Pre-compute a map of date strings to slots for O(1) lookup
  // This prevents filtering through all slots on every calendar cell render
  const slotsByDate = useMemo(() => {
    const map = new Map<string, BookMeetingTimeSlot[]>();
    availableSlots.forEach((slot) => {
      const dateKey = slotStartToCalendarDateKeyInTimezone(
        slot.start,
        timezone
      );
      const existing = map.get(dateKey) || [];
      existing.push(slot);
      map.set(dateKey, existing);
    });
    return map;
  }, [availableSlots, timezone]);

  // Set of dates that have available slots (for fast lookup in disabled callback)
  const datesWithSlots = useMemo(() => {
    return new Set(slotsByDate.keys());
  }, [slotsByDate]);

  const getSlotsForDate = useCallback(
    (date: Date) => {
      return slotsByDate.get(getSlotCalendarDateKey(date)) || [];
    },
    [getSlotCalendarDateKey, slotsByDate]
  );

  // Memoize slots for selected date - must be before any early returns
  const slotsForSelectedDate = useMemo(() => {
    return selectedDate ? getSlotsForDate(selectedDate) : [];
  }, [selectedDate, getSlotsForDate]);

  const handleBookMeeting = async () => {
    if (!requestId || !bookingToken) return;

    setBooking(true);
    const result = await confirmBookMeeting({
      requestId,
      bookingToken,
      selectedSlot,
      contactEmail,
      contactName,
      duration,
      timezone,
      requesterTimezone,
    });
    setBooking(false);
    applyBookMeetingConfirmResult({
      result,
      setSuccess,
      toast,
      fetchAvailability,
    });
  };

  const reviewDialogState = {
    setSelectedUserForReview,
    setReviewsDialogOpen,
  };

  const handleViewRequesterReviews = () =>
    openReviewsForPerson({
      ...reviewDialogState,
      id: requestData?.requesterId,
      name: requestData?.requesterName,
      trustScore: requestData?.requesterTrustScore,
      requireUserId: true,
    });

  const handleViewConnectorReviews = () =>
    openReviewsForPerson({
      ...reviewDialogState,
      id: requestData?.connectorId ?? undefined,
      name: requestData?.connectorName,
      trustScore: requestData?.connectorTrustScore,
      requireUserId: true,
    });

  const handleViewProspectReviews = () =>
    openReviewsForPerson({
      ...reviewDialogState,
      name: requestData?.targetContactName,
      trustScore: requestData?.targetContactTrustScore,
    });

  return renderBookMeetingPageContent({
    loading,
    error,
    requestData,
    success,
    selectedSlot,
    timezone,
    timezoneOpen,
    duration,
    contactName,
    contactEmail,
    whyExpanded,
    selectedDate,
    requesterTimezone,
    datesWithSlots,
    getSlotCalendarDateKey,
    slotsForSelectedDate,
    booking,
    selectedUserForReview,
    reviewsDialogOpen,
    setWhyExpanded,
    setTimezoneOpen,
    setTimezone,
    setSelectedDate,
    setSelectedSlot,
    setReviewsDialogOpen,
    handleBookMeeting,
    handleViewRequesterReviews,
    handleViewConnectorReviews,
    handleViewProspectReviews,
  });
}
