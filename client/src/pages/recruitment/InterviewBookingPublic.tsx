import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import InterviewBookingJobCard from "@/components/recruitment/interview-booking/InterviewBookingJobCard";
import InterviewBookingCalendarPicker from "@/components/recruitment/interview-booking/InterviewBookingCalendarPicker";
import InterviewBookingConfirmation from "@/components/recruitment/interview-booking/InterviewBookingConfirmation";

interface AvailabilityData {
  isAlreadyBooked: boolean;
  availableSlots?: Array<{ start: string; end: string }>;
  timezone?: string | null;
  jobTitle: string;
  companyName: string;
  jobLocation?: string | null;
  jobWorkType?: string | null;
  jobEmploymentType?: string | null;
  recruiterName: string;
  recruiterTitle?: string | null;
  candidateName: string;
  interviewNotes?: string | null;
  // Already booked fields
  meetingDate?: string;
  meetingDuration?: number;
  meetingLink?: string | null;
  meetingPlatform?: string | null;
}

interface BookingResult {
  meetingLink: string | null;
  meetingDate: string;
  duration: number;
}

/**
 * Branded full-page status screen used for loading-error, already-booked, and
 * post-confirm success states. Mirrors the helper from `BookMeetingPublic.tsx`
 * so the two public-booking pages render identical chrome around their
 * confirmation cards.
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
  /** Override the card's max width — e.g. `max-w-xl` for content-heavy
   *  states like already-booked / success that pack meeting details. */
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

export default function InterviewBookingPublic() {
  const { candidateId, token } = useParams<{
    candidateId: string;
    token: string;
  }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(
    null
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  useEffect(() => {
    if (!candidateId || !token) return;

    const fetchAvailability = async () => {
      try {
        const result = (await api.recruitment.getInterviewBookingAvailability(
          candidateId,
          token
        )) as AvailabilityData;
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "This booking link is invalid or has expired."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [candidateId, token]);

  const handleConfirm = async (
    slot: { start: string; end: string },
    timezone: string,
    requesterTimezone: string
  ) => {
    if (!candidateId || !token) return;
    setIsConfirming(true);
    setSelectedTimezone(timezone);

    try {
      const result = (await api.recruitment.confirmInterviewBooking(
        candidateId,
        token,
        {
          selectedSlot: slot,
          timezone,
          requesterTimezone,
        }
      )) as BookingResult;

      setBookingResult(result);
    } catch (err) {
      toast({
        title: "Booking failed",
        description:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
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

  // ─── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <StatusScreen
        icon={AlertTriangle}
        tint="bg-red-100 text-red-600"
        title="Link Expired or Invalid"
        message={error}
      >
        <div className="rounded-xl border border-border bg-secondary p-4">
          <p className="text-xs text-muted-foreground">
            Please contact the recruiter for a new interview booking link.
          </p>
        </div>
      </StatusScreen>
    );
  }

  if (!data) return null;

  // ─── Success (post-confirm) ────────────────────────────────────────────────
  if (bookingResult) {
    return (
      <StatusScreen
        icon={CheckCircle}
        tint="bg-emerald-100 text-emerald-600"
        title="Your Interview is Scheduled"
        message={`You're all set for your interview with ${data.recruiterName}.`}
        // Wider card — meeting-details block needs room to breathe.
        widthClass="max-w-xl"
      >
        <InterviewBookingConfirmation
          meetingDate={bookingResult.meetingDate}
          meetingLink={bookingResult.meetingLink}
          duration={bookingResult.duration}
          recruiterName={data.recruiterName}
          jobTitle={data.jobTitle}
          companyName={data.companyName}
          timezone={selectedTimezone}
        />
      </StatusScreen>
    );
  }

  // ─── Already booked ────────────────────────────────────────────────────────
  if (data.isAlreadyBooked && data.meetingDate) {
    return (
      <StatusScreen
        icon={CheckCircle}
        tint="bg-emerald-100 text-emerald-600"
        title="Interview Already Booked"
        message="This interview has been confirmed."
        widthClass="max-w-xl"
      >
        <InterviewBookingConfirmation
          meetingDate={data.meetingDate}
          meetingLink={data.meetingLink || null}
          duration={data.meetingDuration || 30}
          recruiterName={data.recruiterName}
          jobTitle={data.jobTitle}
          companyName={data.companyName}
          timezone={selectedTimezone}
        />
      </StatusScreen>
    );
  }

  // ─── Main booking page ─────────────────────────────────────────────────────
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
        {data.companyName && (
          <span className="hidden items-center gap-1.5 rounded-full border border-brand-sky/15 bg-brand-sky/5 px-3 py-1.5 text-[11px] font-bold text-brand-sky lg:inline-flex">
            <Briefcase className="h-3 w-3" />
            Interview · {data.companyName}
          </span>
        )}
      </header>

      <main className="container mx-auto max-w-[1180px] px-4 pb-20 pt-6 sm:px-7">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* ─── LEFT RAIL ──────────────────────────────────────────────── */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[80px]">
            <InterviewBookingJobCard
              candidateName={data.candidateName}
              jobTitle={data.jobTitle}
              companyName={data.companyName}
              jobLocation={data.jobLocation}
              jobWorkType={data.jobWorkType}
              jobEmploymentType={data.jobEmploymentType}
              recruiterName={data.recruiterName}
              recruiterTitle={data.recruiterTitle}
              interviewNotes={data.interviewNotes}
            />
          </aside>

          {/* ─── RIGHT MAIN — booking ──────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-brand-card sm:p-8">
            <InterviewBookingCalendarPicker
              availableSlots={data.availableSlots || []}
              recruiterTimezone={data.timezone || null}
              onConfirm={handleConfirm}
              isConfirming={isConfirming}
            />
          </section>
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
                Interviews, simplified
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
    </div>
  );
}
