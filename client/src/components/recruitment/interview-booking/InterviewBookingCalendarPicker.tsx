import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Loader2,
  ChevronsUpDown,
  Clock,
  CalendarIcon,
  MapPin,
  Info,
  AlertCircle,
  Check,
} from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { cn } from "@/lib/utils";
import {
  getMajorTimezoneOptions,
  canonicalMajorTimezone,
  descriptiveTimezoneLabel,
  majorTimezoneLabel,
} from "@/lib/timezones";

dayjs.extend(utc);
dayjs.extend(timezone);

interface TimeSlot {
  start: string;
  end: string;
}

interface InterviewBookingCalendarPickerProps {
  availableSlots: TimeSlot[];
  recruiterTimezone: string | null;
  onConfirm: (
    slot: TimeSlot,
    timezone: string,
    requesterTimezone: string
  ) => void;
  isConfirming: boolean;
}

export default function InterviewBookingCalendarPicker({
  availableSlots,
  recruiterTimezone,
  onConfirm,
  isConfirming,
}: InterviewBookingCalendarPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [tz, setTz] = useState(() =>
    canonicalMajorTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  );
  const [tzOpen, setTzOpen] = useState(false);

  // Ensure the active timezone is always present in the dropdown — even if the
  // browser auto-detected a zone that isn't part of the curated MAJOR_TIMEZONES
  // (e.g. America/Toronto, Asia/Karachi). Without this, switching away makes
  // the original zone unreachable without a page refresh.
  const timezoneOptions = useMemo(() => {
    const canonical = canonicalMajorTimezone(tz);
    const base = getMajorTimezoneOptions();
    if (base.some((t) => t.value === canonical)) return base;
    return [{ value: canonical, label: descriptiveTimezoneLabel(tz) }, ...base];
  }, [tz]);

  // Group slots by date in the selected timezone
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    for (const slot of availableSlots) {
      const dateKey = dayjs(slot.start).tz(tz).format("YYYY-MM-DD");
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(slot);
    }
    return grouped;
  }, [availableSlots, tz]);

  // Dates that have available slots
  const availableDateStrings = useMemo(
    () => new Set(Object.keys(slotsByDate)),
    [slotsByDate]
  );

  // Slots for the selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = dayjs(selectedDate).format("YYYY-MM-DD");
    return slotsByDate[dateKey] || [];
  }, [selectedDate, slotsByDate]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleTimezoneChange = (value: string) => {
    setTz(value);
    setTzOpen(false);
    setSelectedDate(undefined);
    setSelectedSlot(null);
  };

  const handleConfirm = () => {
    if (!selectedSlot) return;
    onConfirm(selectedSlot, tz, recruiterTimezone || "UTC");
  };

  return (
    <div className="space-y-5">
      {/* Block 1 — Booking header.
          Mobile: everything stacks vertically so the h2 gets the full
          container width (no shared row with the duration pill) and the
          title fits on one line. sm+: side-by-side with the pill on the
          right. The h2 also scales `text-xl → text-2xl → text-3xl` so it
          never has to wrap on narrow viewports. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-brand-sky/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-sky">
            <CalendarIcon className="h-3.5 w-3.5" />
            Book a Time
          </span>
          <h2 className="text-balance text-xl font-extrabold leading-tight tracking-tight sm:text-2xl md:text-3xl">
            Pick a time that works for you
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Calendar invites are sent automatically once you confirm.
          </p>
        </div>
        <div className="inline-flex flex-shrink-0 items-center gap-2 self-start rounded-xl border border-brand-amethyst/15 bg-brand-amethyst/10 px-3.5 py-2 text-sm font-bold text-brand-amethyst">
          <Clock className="h-4 w-4" />
          30 min
        </div>
      </div>

      {/* Block 2 — Timezone row. The min-w-0 + flex-1 chain at every layer is
          what lets the long timezone label actually truncate on mobile. */}
      <div className="flex w-full min-w-0 flex-col items-stretch gap-3 rounded-xl border border-border bg-secondary px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-muted-foreground">
              Your Timezone
            </div>
            <Popover open={tzOpen} onOpenChange={setTzOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  role="combobox"
                  aria-expanded={tzOpen}
                  // hover:text-foreground keeps the label readable on hover —
                  // the ghost variant defaults to hover:text-accent-foreground
                  // which can render as near-white on this brand background.
                  className="h-auto w-full min-w-0 max-w-full justify-start gap-2 px-0 py-0.5 font-bold text-foreground hover:bg-transparent hover:text-foreground"
                >
                  <span className="min-w-0 flex-1 truncate text-left text-sm">
                    {majorTimezoneLabel(tz)}
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] max-w-[calc(100vw-2rem)] p-0"
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
                      {timezoneOptions.map((t) => (
                        <CommandItem
                          key={t.value}
                          value={t.label}
                          onSelect={() => handleTimezoneChange(t.value)}
                          // Override shadcn's default
                          // `data-[selected]:bg-accent text-accent-foreground`
                          // with a brand-amethyst tint that keeps the label
                          // readable on hover.
                          className="aria-selected:bg-brand-amethyst/10 aria-selected:text-foreground data-[selected=true]:bg-brand-amethyst/10 data-[selected=true]:text-foreground"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              canonicalMajorTimezone(tz) === t.value
                                ? "opacity-100 text-brand-amethyst"
                                : "opacity-0"
                            )}
                          />
                          {t.label}
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

      {/* Block 3 — Availability note (when recruiter is in a non-UTC zone) */}
      {recruiterTimezone && recruiterTimezone !== "UTC" && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-sky/15 bg-brand-sky/5 px-4 py-3 text-sm">
          <Info className="h-4 w-4 flex-shrink-0 text-brand-sky" />
          <span className="min-w-0 break-words">
            The recruiter is in{" "}
            <b className="font-bold text-brand-sky">
              {majorTimezoneLabel(recruiterTimezone)}
            </b>
          </span>
        </div>
      )}

      {/* Block 4 — Calendar + Slots grid */}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {/* Calendar — fixed h-[420px] to match slots panel; Day Picker is
            shorter than 420px naturally, but our classNames override
            (`tbody: flex flex-1 flex-col`, `row: flex-1`) makes it fill. */}
        <div className="flex h-[420px] flex-col rounded-2xl border border-border bg-card p-3 sm:p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              const dateStr = dayjs(date).format("YYYY-MM-DD");
              return !availableDateStrings.has(dateStr);
            }}
            className="flex h-full w-full flex-col p-0"
            // Match the BookMeetingPublic calendar styling:
            //   1. selected day uses brand-gradient + 8px radius (not default
            //      bg-primary blue)
            //   2. cell's bg-accent wrapper stripped so the gradient pill
            //      stands alone
            //   3. day grid stretches to fill the 420px wrapper instead of
            //      sitting with whitespace above/below
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
              cell: "relative flex flex-1 items-center justify-center p-0 text-center text-sm focus-within:relative focus-within:z-20",
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

        {/* Slots panel — fixed height so many slots scroll inside instead of
            growing the panel. */}
        <div className="flex h-[420px] flex-col rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-border pb-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold">
                {selectedDate
                  ? dayjs(selectedDate).format("dddd, MMM D")
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
            // overflow-auto can actually engage.
            <ScrollArea className="min-h-0 flex-1">
              {/* pr-4 leaves a small gap between the slot pills and the
                  ScrollArea's right-edge scrollbar so they don't touch. */}
              <div className="grid grid-cols-1 gap-2 pr-4">
                {slotsForSelectedDate.map((slot, i) => {
                  const isSelected =
                    selectedSlot?.start === slot.start &&
                    selectedSlot?.end === slot.end;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "min-h-[44px] rounded-lg border px-2 py-2.5 font-mono text-sm font-bold transition-all",
                        isSelected
                          ? "border-transparent bg-brand-gradient text-white shadow-brand-cta"
                          : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-brand-amethyst hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                      )}
                    >
                      {dayjs(slot.start).tz(tz).format("h:mm A")} –{" "}
                      {dayjs(slot.end).tz(tz).format("h:mm A")}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Block 5 — Confirm summary + button */}
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
                ? `${dayjs(selectedSlot.start).tz(tz).format("ddd, MMM D")} at ${dayjs(selectedSlot.start).tz(tz).format("h:mm A")}`
                : "Pick a time to continue"}
            </div>
          </div>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!selectedSlot || isConfirming}
          size="lg"
          className="h-12 w-full bg-brand-gradient text-base font-extrabold text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg disabled:hover:translate-y-0 disabled:hover:shadow-brand-cta"
        >
          {isConfirming ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              Confirm Interview
            </>
          )}
        </Button>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Once you confirm, calendar invites are sent automatically.
          </span>
        </div>
      </div>

      {/* Block 6 — Mobile sticky bottom action bar. Lives inside the picker
          because selectedSlot/tz/isConfirming/handleConfirm all live here;
          the parent's outer wrapper has `pb-20 md:pb-0` so content isn't
          covered by this fixed bar. */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-border bg-background/95 p-3 backdrop-blur-xl md:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Selected
          </div>
          <div className="truncate text-xs font-bold">
            {selectedSlot
              ? dayjs(selectedSlot.start).tz(tz).format("MMM D · h:mm A")
              : "Pick a time"}
          </div>
        </div>
        <Button
          onClick={handleConfirm}
          disabled={!selectedSlot || isConfirming}
          size="lg"
          className="flex-shrink-0 gap-1.5 bg-brand-gradient text-white shadow-brand-cta"
        >
          {isConfirming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Confirm
        </Button>
      </div>
    </div>
  );
}
