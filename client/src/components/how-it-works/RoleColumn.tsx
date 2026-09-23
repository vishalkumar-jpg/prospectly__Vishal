import { Handshake } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RoleStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface RoleColumnProps {
  tone: "sky" | "amethyst";
  badge: string;
  title: string;
  description: string;
  steps: RoleStep[];
  footer: string;
}

/**
 * Requester / Connector role card used inside HowItWorksRequesterConnector.
 * Matches the GiveToGet homepage pattern (numbered vertical step list,
 * tone-specific gradient connector line).
 */
export function RoleColumn({
  tone,
  badge,
  title,
  description,
  steps,
  footer,
}: RoleColumnProps) {
  const numberBg = tone === "sky" ? "bg-home-sky" : "bg-home-amethyst";
  const wellBg =
    tone === "sky"
      ? "bg-home-sky/10 text-home-sky"
      : "bg-home-amethyst/10 text-home-amethyst";
  const badgeBg =
    tone === "sky"
      ? "bg-home-sky/10 text-home-sky"
      : "bg-home-amethyst/10 text-home-amethyst";
  const connectorFrom =
    tone === "sky"
      ? "from-home-sky to-home-sky/15"
      : "from-home-amethyst to-home-amethyst/15";

  return (
    <div
      className={cn(
        "rounded-[20px] border border-home-border bg-home-bg p-6 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:p-7",
        "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5",
      )}
    >
      <div className="mb-4 flex items-start gap-3.5">
        <span
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-[14px]",
            wellBg,
          )}
          aria-hidden
        >
          <Handshake className="h-6 w-6" strokeWidth={2} />
        </span>
        <div>
          <span
            className={cn(
              "mb-0.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              badgeBg,
            )}
          >
            {badge}
          </span>
          <h3 className="text-lg font-extrabold tracking-tight text-home-fg">
            {title}
          </h3>
        </div>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-home-muted">
        {description}
      </p>
      <div
        className={cn(
          "relative mb-4 space-y-0 pl-4",
          "before:absolute before:left-[27px] before:bottom-[18px] before:top-[18px] before:w-0.5 before:rounded-sm before:bg-gradient-to-b",
          connectorFrom,
        )}
      >
        {steps.map((step, i) => (
          <div key={step.title} className="relative flex items-start gap-3 py-3">
            <span
              className={cn(
                "relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-white",
                numberBg,
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-home-fg">{step.title}</div>
              <div className="text-[12px] leading-snug text-home-muted">
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-t border-home-border pt-3.5 text-xs text-home-muted">
        <b className="text-home-fg">{footer}</b>
      </div>
    </div>
  );
}
