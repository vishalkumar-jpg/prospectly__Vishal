import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicRequestNotFound({
  message,
  onGoHome,
}: {
  message: string;
  onGoHome: () => void;
}) {
  return (
    <div className="min-h-screen bg-secondary">
      <div className="bg-brand-gradient py-4 text-white">
        <div className="container mx-auto px-4 lg:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/prospectly-logo.png"
              alt="Prospectly"
              className="h-8 w-auto brightness-0 invert"
            />
          </Link>
        </div>
      </div>
      <div className="container mx-auto px-4 py-16 text-center lg:px-6">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-warning/10 text-brand-warning">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Introduction Request Not Found
        </h1>
        <p className="mx-auto mb-6 max-w-md text-muted-foreground">{message}</p>
        <Button
          onClick={onGoHome}
          className="bg-brand-gradient text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
        >
          Go to Homepage
        </Button>
        <div className="mt-8 text-sm text-muted-foreground">
          Powered by{" "}
          <span className="font-semibold text-brand-amethyst">Prospectly</span>
        </div>
      </div>
    </div>
  );
}
