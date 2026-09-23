import { useState, useMemo } from "react";
import { CheckCircle, Search } from "lucide-react";
// import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import { cn } from "@/lib/utils";

export interface ContactFaq {
  question: string;
  answer: string;
}

interface FaqGridProps {
  faqs: ContactFaq[];
  // Live chat is disabled — email is the only support path for now.
  // onStartChat: () => void;
}

export function ContactFaqGrid({ faqs }: FaqGridProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return faqs;
    const q = query.toLowerCase();
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q)
    );
  }, [faqs, query]);

  return (
    <StaticSection ariaLabelledBy="contact-faq-title">
      <StaticSectionHeading
        id="contact-faq-title"
        eyebrow="Frequent questions"
        title="Common questions answered"
        description={
          query
            ? `Found ${filtered.length} result${filtered.length === 1 ? "" : "s"}`
            : "Tap a question or search for something specific."
        }
      />
      <div className="mx-auto mb-8 max-w-xl">
        <label className="sr-only" htmlFor="faq-search">
          Search FAQs
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-home-muted"
            aria-hidden
          />
          <Input
            id="faq-search"
            type="search"
            placeholder="Search FAQs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              "h-12 border-home-border bg-home-bg pl-10 text-sm",
              "focus-visible:ring-home-amethyst focus-visible:border-home-amethyst"
            )}
          />
        </div>
      </div>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
        {filtered.map((faq) => (
          <article
            key={faq.question}
            className={cn(
              "rounded-2xl border border-home-border bg-home-bg-elevated p-6",
              "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              "hover:-translate-y-1 hover:border-home-amethyst/40 hover:shadow-lg hover:shadow-black/5"
            )}
          >
            <h3 className="mb-3 flex items-start gap-2 text-base font-bold text-home-fg">
              <CheckCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-home-amethyst"
                aria-hidden
              />
              {faq.question}
            </h3>
            <p className="pl-7 text-sm leading-relaxed text-home-muted">
              {faq.answer}
            </p>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="mt-10 text-center">
          <p className="mb-4 text-sm text-home-muted">
            No FAQs match your search.
          </p>
          <Button
            variant="outline"
            onClick={() => setQuery("")}
            className="border-home-border"
          >
            Clear search
          </Button>
        </div>
      )}
      {/* <div className="mt-12 text-center">
        <p className="mb-4 text-sm text-home-muted">
          Can&apos;t find what you&apos;re looking for?
        </p>
        <Button
          size="lg"
          onClick={onStartChat}
          className="home-brand-gradient border-0 text-white shadow-home-cta hover:-translate-y-0.5 hover:brightness-[1.03] transition-transform"
        >
          <MessageCircle className="mr-2 h-5 w-5" aria-hidden />
          Chat with us
        </Button>
      </div> */}
    </StaticSection>
  );
}
