import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

const QUOTES = [
  { quote: "Earned $150 from first intro", name: "Alex P." },
  { quote: "Warm paths to 3 VPs", name: "Maya R." },
  { quote: "Real payouts, simple setup", name: "Sarah K." },
  { quote: "$400 in my first week", name: "David L." },
  { quote: "Values my network properly", name: "Priya M." },
];

interface GettingStartedImportHeroProps {
  heroAmountPlus: string;
}

export function GettingStartedImportHero({
  heroAmountPlus,
}: GettingStartedImportHeroProps) {
  const scrollQuotes = [...QUOTES, ...QUOTES];

  return (
    <div className="pt-2">
      <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gs-rose mb-3">
        <span
          className="h-1.5 w-1.5 rounded-full bg-gs-rose shrink-0 animate-pulse"
          aria-hidden
        />
        Step 1 of 3 · Import Contacts
      </div>

      <h1 className="text-[1.65rem] sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight mb-3">
        Your network could be
        <br />
        worth{" "}
        <span
          className={cn(
            "bg-gradient-to-br from-gs-accent-from to-gs-accent-to bg-clip-text text-transparent"
          )}
        >
          {heroAmountPlus}
        </span>
      </h1>

      <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed mb-4 max-w-xl">
        Import contacts, discover warm intro paths, and start earning referral
        payouts in minutes.
      </p>

      <ul className="flex flex-col gap-2 mb-5">
        <li className="flex items-center gap-2.5 text-sm font-medium text-foreground">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gs-rose/10 text-gs-rose text-sm font-bold">
            $
          </span>
          Earn $25–$500+ per warm introduction
        </li>
        <li className="flex items-center gap-2.5 text-sm font-medium text-foreground">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gs-amethyst/10 text-gs-amethyst text-sm font-bold">
            ~
          </span>
          AI-matched intro paths from your network
        </li>
        <li className="flex items-center gap-2.5 text-sm font-medium text-foreground">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 text-sm font-bold">
            +
          </span>
          Get up to $60 in Connector Credits free
        </li>
      </ul>

      <div className="inline-flex max-w-full flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-px" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-emerald-600"
              >
                <Star className="h-2 w-2 fill-white text-white" />
              </span>
            ))}
            <span className="relative h-3.5 w-3.5 overflow-hidden rounded-sm bg-muted">
              <span className="absolute inset-y-0 left-0 w-1/2 bg-emerald-600" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">4.8</span>
            <span className="mx-1">·</span>
            <span className="font-bold text-emerald-600">Excellent</span>
            <span className="ml-1">on Trustpilot</span>
          </p>
        </div>
        <div className="relative h-4 overflow-hidden">
          <div className="flex gap-7 animate-gs-marquee whitespace-nowrap w-max items-center">
            {scrollQuotes.map((q, i) => (
              <span
                key={`${q.name}-${i}`}
                className="text-[11px] text-muted-foreground"
              >
                &ldquo;{q.quote}&rdquo; —{" "}
                <span className="font-semibold text-foreground not-italic">
                  {q.name}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
