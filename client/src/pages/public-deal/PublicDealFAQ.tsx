import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { faqItems } from "./constants";

interface PublicDealFAQProps {
  expandedFaq: number | null;
  setExpandedFaq: (index: number | null) => void;
}

export function PublicDealFAQ({
  expandedFaq,
  setExpandedFaq,
}: PublicDealFAQProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-brand-sky/10 text-brand-sky">
          <HelpCircle className="h-[18px] w-[18px]" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">
            Common questions
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Everything you need to know about claiming intros
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {faqItems.map((faq, idx) => {
          const open = expandedFaq === idx;
          return (
            <div
              key={idx}
              className={cn(
                "overflow-hidden rounded-xl border bg-secondary/40 transition-colors",
                open ? "border-brand-amethyst/30" : "border-border"
              )}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
                onClick={() => setExpandedFaq(open ? null : idx)}
              >
                <span className="text-[14.5px] font-bold">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-300",
                    open && "rotate-180 text-brand-amethyst"
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300",
                  open
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
