import React, { useEffect, useMemo } from "react";
import { utcDayjs } from "@/lib/dayjs";

/**
 * Scheduled maintenance window (ISO 8601 UTC).
 * Window: Sunday, 13 September 2026, 10:00 AM – 2:00 PM IST (04:30 – 08:30 UTC).
 */
const MAINTENANCE_START_UTC = "2026-09-13T04:30:00Z";
const MAINTENANCE_END_UTC = "2026-09-13T08:30:00Z";

const MaintenancePage: React.FC = () => {
  // Format local maintenance window schedule using utcDayjs according to project conventions
  const formattedSchedule = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const isIndia = tz === "Asia/Kolkata" || tz === "Asia/Calcutta";

      if (isIndia) {
        return "Sun, 13 Sep 2026, 10:00 AM – 2:00 PM IST (04:30 – 08:30 UTC)";
      }

      if (tz === "UTC" || tz === "Etc/UTC") {
        return "Sun, 13 Sep 2026, 04:30 – 08:30 UTC";
      }

      const startLocal = utcDayjs(MAINTENANCE_START_UTC).local();
      const endLocal = utcDayjs(MAINTENANCE_END_UTC).local();

      const startDateStr = startLocal.toDate().toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const endDateStr = endLocal.toDate().toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const startTimeStr = startLocal.toDate().toLocaleString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });

      const endTimeStr = endLocal.toDate().toLocaleString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });

      if (startDateStr !== endDateStr) {
        return `${startDateStr}, ${startTimeStr} – ${endDateStr}, ${endTimeStr} (04:30 – 08:30 UTC)`;
      }

      return `${startDateStr}, ${startTimeStr} – ${endTimeStr} (04:30 – 08:30 UTC)`;
    } catch {
      return "Sun, 13 Sep 2026, 10:00 AM – 2:00 PM IST (04:30 – 08:30 UTC)";
    }
  }, []);

  // Auto-refresh after 60s to check if the app is back up
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/";
    }, 60000);

    return () => clearTimeout(timer);
  }, []);

  const footerYear = useMemo(() => {
    return utcDayjs().local().year();
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between px-4 sm:px-6 pb-6 bg-app text-foreground font-sans antialiased selection:bg-primary/20 selection:text-foreground">
      {/* Soft brand glow behind the card */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute -top-[220px] left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full bg-gradient-to-br from-brand-amethyst/10 to-brand-rose/10 blur-[100px]" />
      </div>

      {/* Content wrapper with equal top gap and header-to-card gap */}
      <div className="w-full flex flex-col items-center pt-8 sm:pt-10">
        {/* Header */}
        <header className="w-full max-w-[960px] flex flex-col items-center gap-3.5 pb-8 sm:pb-10">
          <img
            src="/prospectly-logo.png"
            alt="Prospectly"
            className="h-10 md:h-12 w-auto object-contain"
            onError={(e) => {
              // Fallback to remote CDN if local path is unavailable
              const target = e.currentTarget;
              if (target.src !== "https://prospectly.com/prospectly-logo.png") {
                target.src = "https://prospectly.com/prospectly-logo.png";
              }
            }}
          />
          <div className="inline-flex items-center gap-2 border border-border bg-card rounded-full px-3.5 py-1.5 text-xs font-bold text-muted-foreground shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Scheduled maintenance</span>
          </div>
        </header>

        {/* Main Card */}
        <main className="w-full max-w-[660px] flex flex-col items-center">
          <div
            className="w-full bg-card border border-border/90 rounded-2xl shadow-card px-6 py-10 sm:px-10 sm:py-11 text-center"
            role="status"
            aria-live="polite"
          >
            {/* Animated Gradient Icon Ring */}
            <div
              className="w-[76px] h-[76px] mx-auto mb-6 rounded-[22px] grid place-items-center bg-gradient-to-br from-brand-amethyst/15 to-brand-rose/10 border border-brand-amethyst/25"
              aria-hidden="true"
            >
              <svg
                className="w-9 h-9 animate-[spin_9s_linear_infinite]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="url(#gear-gradient)"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <defs>
                  <linearGradient
                    id="gear-gradient"
                    x1="0"
                    y1="0"
                    x2="24"
                    y2="24"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="hsl(var(--brand-amethyst))" />
                    <stop offset="100%" stopColor="hsl(var(--brand-rose))" />
                  </linearGradient>
                </defs>
                <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
                <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                <path d="M12 2v2" />
                <path d="M12 22v-2" />
                <path d="m17 20.66-1-1.73" />
                <path d="M11 10.27 7 3.34" />
                <path d="m20.66 17-1.73-1" />
                <path d="m3.34 7 1.73 1" />
                <path d="M14 12h8" />
                <path d="M2 12h2" />
                <path d="m20.66 7-1.73 1" />
                <path d="m3.34 17 1.73-1" />
                <path d="m17 3.34-1 1.73" />
                <path d="m7 20.66 1-1.73" />
              </svg>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-3">
              We’ll be back shortly
            </h1>

            <p className="text-[15.5px] leading-relaxed text-muted-foreground max-w-[46ch] mx-auto mb-7">
              Prospectly is undergoing{" "}
              <strong className="text-foreground font-bold">
                scheduled maintenance
              </strong>{" "}
              while we roll out platform upgrades. Your job posts, candidate
              pipeline, and data are{" "}
              <strong className="text-foreground font-bold">
                safe and unaffected
              </strong>{" "}
              — no action is needed on your side.
            </p>

            {/* Schedule & Duration Box */}
            <div className="flex items-center justify-center gap-2.5 flex-wrap bg-app border border-border rounded-[14px] px-4.5 py-3.5 mb-7 text-sm">
              <span className="text-muted-foreground font-semibold">
                Duration:
              </span>
              <span className="font-extrabold text-foreground tabular-nums">
                {formattedSchedule}
              </span>
              <span className="text-border select-none" aria-hidden="true">
                |
              </span>
              <span className="font-extrabold tabular-nums text-brand-gradient">
                ~4 hours
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 flex-wrap mt-2">
              <a
                href="mailto:support@prospectly.com"
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-brand-foreground bg-brand-gradient shadow-brand-cta hover:shadow-brand-cta-lg hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Contact support
              </a>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full text-center pt-8 pb-2 text-xs text-muted-foreground">
        © {footerYear} Prospectly LLC. All Rights Reserved.
      </footer>
    </div>
  );
};

export default MaintenancePage;
