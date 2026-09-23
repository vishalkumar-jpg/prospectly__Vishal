import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { ImportModalProgressPanel } from "@/components/getting-started/import-modal/progressPanel";
import { OAuthCallbackShell } from "@/components/getting-started/import-modal/oauthCallbackShell";

export default function GoogleCalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [message, setMessage] = useState(
    "Processing Google Calendar connection..."
  );

  const handleNavigateToGettingStarted = () => {
    navigate("/getting-started");
  };

  const handleTryAgain = () => {
    window.location.reload();
  };

  useEffect(() => {
    let redirectTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let alive = true;

    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
          throw new Error(`Google OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error("Missing authorization code or state parameter");
        }

        const response = await fetch(
          `/api/calendar/callback/google?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || result.error || "Unknown error occurred"
          );
        }

        const data = result.data !== undefined ? result.data : result;

        setStatus("success");
        setMessage(
          `Google Calendar connected successfully${data.user_email ? ` for ${data.user_email}` : ""}`
        );

        toast({
          title: "Google Calendar Connected",
          description: "Your Google Calendar has been connected successfully!",
        });

        if (!alive) {
          return;
        }
        redirectTimeoutId = setTimeout(() => {
          navigate("/getting-started");
        }, 2000);
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to connect Google Calendar"
        );

        toast({
          title: "Connection Failed",
          description: "Unable to connect Google Calendar. Please try again.",
          variant: "destructive",
        });
      }
    };

    void handleCallback();

    return () => {
      alive = false;
      if (redirectTimeoutId !== undefined) {
        clearTimeout(redirectTimeoutId);
      }
    };
  }, [searchParams, navigate, toast]);

  if (status === "processing") {
    return (
      <OAuthCallbackShell>
        <ImportModalProgressPanel mode="oauth" providerName="Google Calendar" />
      </OAuthCallbackShell>
    );
  }

  if (status === "success") {
    return (
      <OAuthCallbackShell>
        <div className="space-y-6 text-center">
          <ImportModalDots activeIndex={2} total={3} />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/50">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
              <CheckCircle2
                className="h-6 w-6 text-white"
                strokeWidth={2.5}
              />
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Calendar connected
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Redirecting to Getting started…
            </p>
          </div>
          <Button
            type="button"
            onClick={handleNavigateToGettingStarted}
            className="h-12 w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white shadow-md hover:opacity-95"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Continue to Getting Started
          </Button>
        </div>
      </OAuthCallbackShell>
    );
  }

  return (
    <OAuthCallbackShell>
      <div className="space-y-6 text-center">
        <ImportModalDots activeIndex={1} total={3} />
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <div>
          <h1 className="text-lg font-bold text-foreground">
            Connection failed
          </h1>
          <p className="mt-2 text-sm font-medium text-destructive">{message}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleNavigateToGettingStarted}
            className="h-12 flex-1 rounded-full"
          >
            Return to Getting Started
          </Button>
          <Button
            type="button"
            onClick={handleTryAgain}
            className="h-12 flex-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white shadow-md hover:opacity-95"
          >
            Try Again
          </Button>
        </div>
      </div>
    </OAuthCallbackShell>
  );
}
