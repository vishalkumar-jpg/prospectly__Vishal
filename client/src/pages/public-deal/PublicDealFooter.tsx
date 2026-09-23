import { Link } from "react-router-dom";

export function PublicDealFooter() {
  return (
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
              Turn your network into income
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
  );
}
