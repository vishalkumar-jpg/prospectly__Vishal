import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import {
  Calendar,
  Send,
  Loader2,
  Mail,
  CheckCircle,
  X,
  Clock,
  ChevronsUpDown,
  Check,
  AlertCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  useInterviewAvailability,
  INTERVIEW_AVAILABILITY_QUERY_KEY,
} from "@/hooks/useInterviewAvailability";
import {
  getMajorTimezoneOptions,
  canonicalMajorTimezone,
  descriptiveTimezoneLabel,
  majorTimezoneLabel,
  resolveRecruiterInterviewTimezone,
} from "@/lib/timezones";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// 30-minute time-of-day options ("HH:mm") shown in the Start/End selects.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const value = `${String(h).padStart(2, "0")}:${m}`;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return { value, label: `${hour12}:${m} ${ampm}` };
});

interface Candidate {
  id: string;
  name: string;
  email: string;
  title: string;
  company: string;
  matchScore: number;
}

interface SendInterviewInviteRecruiterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  jobTitle: string;
  onInviteSent: () => void;
  isReschedule?: boolean;
  isResend?: boolean;
}

function getDialogTitle(isReschedule: boolean, isResend: boolean): string {
  if (isReschedule) return "Reschedule Interview";
  if (isResend) return "Resend Interview Invite";
  return "Send Interview Invite";
}

function getSubmitLabel(isReschedule: boolean, isResend: boolean): string {
  if (isReschedule) return "Send New Booking Link";
  if (isResend) return "Resend Interview Invite";
  return "Send Interview Invite";
}

export function SendInterviewInviteRecruiterDialog({
  open,
  onOpenChange,
  candidate,
  jobTitle,
  onInviteSent,
  isReschedule = false,
  isResend = false,
}: SendInterviewInviteRecruiterDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Recruiter's saved working hours — pre-fills the form; editing saves the
  // new default when the invite is sent.
  const {
    workingHoursStart,
    workingHoursEnd,
    isLoading: isLoadingHours,
    error: hoursError,
    refetch: refetchHours,
  } = useInterviewAvailability({ enabled: open });

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [timezone, setTimezone] = useState(() =>
    resolveRecruiterInterviewTimezone()
  );
  const [tzPickerOpen, setTzPickerOpen] = useState(false);

  // Working hours pre-fill from saved config; timezone always from system/browser.
  useEffect(() => {
    if (!open) return;
    setStartTime(workingHoursStart || "09:00");
    setEndTime(workingHoursEnd || "17:00");
  }, [open, workingHoursStart, workingHoursEnd]);

  useEffect(() => {
    if (!open) return;
    setTimezone(resolveRecruiterInterviewTimezone());
  }, [open]);

  const isHoursInvalid = endTime <= startTime;

  const timezoneOptions = useMemo(() => {
    const canonical = canonicalMajorTimezone(timezone);
    const base = getMajorTimezoneOptions();
    if (base.some((t) => t.value === canonical)) return base;
    return [
      { value: canonical, label: descriptiveTimezoneLabel(timezone) },
      ...base,
    ];
  }, [timezone]);

  if (!candidate) return null;

  const handleSendInvite = async () => {
    if (isHoursInvalid) return;
    setIsSending(true);
    try {
      await api.recruitment.sendInterviewInvite(candidate.id, {
        interviewNotes: undefined,
        availability: { startTime, endTime, timezone },
      });
      // Sync the shared config cache with the hours we just saved so the dialog
      // pre-fills the latest values on the next open (it never unmounts).
      queryClient.setQueryData(
        INTERVIEW_AVAILABILITY_QUERY_KEY,
        (old: Record<string, unknown> | undefined) => ({
          ...(old ?? {}),
          workingHoursStart: startTime,
          workingHoursEnd: endTime,
          workingHoursTimezone: timezone,
        })
      );
      onInviteSent();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: isReschedule
          ? "Failed to reschedule"
          : isResend
            ? "Failed to resend invite"
            : "Failed to send invite",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const dialogTitle = getDialogTitle(isReschedule, isResend);
  const submitLabel = getSubmitLabel(isReschedule, isResend);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl max-sm:rounded-none"
        mobileFullscreen
        hideCloseButton
      >
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient px-6 py-5 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm">
              <Calendar className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
              {dialogTitle}
            </DialogTitle>
          </div>
          <DialogDescription className="relative mt-2 text-[13px] leading-relaxed text-white/90">
            {isReschedule ? (
              <>
                Send a new booking link to{" "}
                <b className="font-extrabold text-white">{candidate.name}</b> to
                reschedule their interview.
              </>
            ) : isResend ? (
              <>
                Resend the interview booking link to{" "}
                <b className="font-extrabold text-white">{candidate.name}</b>{" "}
                for the {jobTitle} position.
              </>
            ) : (
              <>
                Send an interview booking link to{" "}
                <b className="font-extrabold text-white">{candidate.name}</b>{" "}
                for the {jobTitle} position.
              </>
            )}
          </DialogDescription>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid gap-5 sm:grid-cols-[1.25fr_1fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-foreground">
                      Set your interview availability
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      The daily hours you're free to interview. Candidates can
                      only pick a 30-minute slot within this window, Mon–Fri.
                    </p>
                  </div>
                </div>

                {isLoadingHours ? (
                  <div className="space-y-2">
                    <div className="h-9 animate-pulse rounded-lg bg-muted" />
                    <div className="h-9 animate-pulse rounded-lg bg-muted" />
                  </div>
                ) : hoursError ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-[13px] text-destructive">
                      Couldn't load your saved hours.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchHours()}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                          Start
                        </label>
                        <Select value={startTime} onValueChange={setStartTime}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {TIME_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                          End
                        </label>
                        <Select value={endTime} onValueChange={setEndTime}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {TIME_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Timezone
                      </label>
                      <Popover
                        open={tzPickerOpen}
                        onOpenChange={setTzPickerOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal"
                          >
                            <span className="truncate">
                              {majorTimezoneLabel(timezone)}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[--radix-popover-trigger-width] p-0"
                          align="start"
                        >
                          <Command>
                            <CommandInput placeholder="Search timezone..." />
                            <CommandList>
                              <CommandEmpty>No timezone found.</CommandEmpty>
                              <CommandGroup>
                                {timezoneOptions.map((tz) => (
                                  <CommandItem
                                    key={tz.value}
                                    value={tz.label}
                                    onSelect={() => {
                                      setTimezone(tz.value);
                                      setTzPickerOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        canonicalMajorTimezone(timezone) ===
                                          tz.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <span className="truncate">{tz.label}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {isHoursInvalid && (
                      <p className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" /> End time must be
                        later than start time.
                      </p>
                    )}

                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      Times you're busy on your connected calendar are removed
                      automatically — block lunch/breaks on your calendar to
                      hide them.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex flex-1 flex-col rounded-2xl border border-border bg-card p-4">
                <p className="mb-3.5 text-sm font-extrabold text-foreground">
                  {isReschedule
                    ? "What happens when you reschedule:"
                    : "What happens when you send this invite:"}
                </p>
                <div className="flex flex-1 flex-col justify-center gap-3.5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-sky/10 text-brand-sky">
                      <Mail className="h-4 w-4" />
                    </div>
                    <p className="pt-1 text-[13.5px] leading-snug text-muted-foreground">
                      Candidate receives an email with a{" "}
                      <b className="font-bold text-foreground">
                        unique booking link
                      </b>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <p className="pt-1 text-[13.5px] leading-snug text-muted-foreground">
                      They select a time from your{" "}
                      <b className="font-bold text-foreground">
                        available calendar slots
                      </b>{" "}
                      (Google/Microsoft)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-success/10 text-brand-success">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <p className="pt-1 text-[13.5px] leading-snug text-muted-foreground">
                      {isReschedule ? (
                        <>
                          A new meeting is created on your calendar once they
                          book
                        </>
                      ) : (
                        <>
                          Meeting is created on your calendar and you'll be{" "}
                          <b className="font-bold text-foreground">
                            notified by email
                          </b>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-border bg-background px-6 py-4 max-sm:[&>button]:flex-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendInvite}
            disabled={isSending || isLoadingHours || isHoursInvalid}
            className="bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> {submitLabel}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SendInterviewInviteRecruiterDialog;
