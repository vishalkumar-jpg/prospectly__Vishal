import { Check, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { strong: "Zero-knowledge", rest: " — only you see contacts" },
  { strong: "Never emailed", rest: " — inboxes untouched" },
  { strong: "You approve", rest: " every introduction" },
  { strong: "Encrypted", rest: " end-to-end" },
];

export function GettingStartedTrustBanner() {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col overflow-hidden rounded-2xl border border-sky-500/20 bg-card lg:flex-row lg:items-stretch"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-full shrink-0 items-center justify-center border-b border-sky-500/15 bg-gradient-to-br from-sky-500/10 to-sky-500/20",
          "lg:h-auto lg:w-14 lg:border-b-0 lg:border-r"
        )}
      >
        <Shield className="h-7 w-7 text-sky-500" aria-hidden />
      </div>
      <div
        className={cn(
          "flex items-center border-b border-border px-4 py-3 font-extrabold text-sm sm:text-base",
          "lg:border-b-0 lg:border-r lg:shrink-0 lg:py-0"
        )}
      >
        Your contacts are fortress-safe
      </div>
      <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item) => (
          <div
            key={item.strong}
            className="flex items-center gap-2 border-b border-border px-3 py-3.5 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0 lg:border-r lg:border-border lg:last:border-r-0"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/10 text-[10px] font-bold text-sky-600">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <p className="text-xs text-muted-foreground leading-snug">
              <span className="font-semibold text-foreground">
                {item.strong}
              </span>
              {item.rest}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
