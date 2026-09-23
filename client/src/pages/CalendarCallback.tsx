import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { getFriendlyOAuthErrorMessage } from "@/lib/oauth-user-error";
import {
  clearCalendarConnectReopenModal,
  consumeCalendarConnectReturn,
  peekCalendarConnectReturn,
  setCalendarConnectReopenModal,
} from "@/utils/calendar-connect-return";
import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { ImportModalProgressPanel } from "@/components/getting-started/import-modal/progressPanel";
import { OAuthCallbackShell } from "@/components/getting-started/import-modal/oauthCallbackShell";
import { POST_A_JOB_PATH } from "@/constants/recruitment-routes";
import { cn } from "@/lib/utils";

type Provider = "google" | "microsoft" | "zoom" | "calendly";

const DEFAULT_RETURN_PATH = "/getting-started";

export default function CalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState<Provider>("google");
  const [returnPath, setReturnPath] = useState(DEFAULT_RETURN_PATH);
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const path = window.location.pathname;

        const providerMatch = path.match(
          /\/(?:auth|calendar)\/callback\/(\w+)/
        );
        const currentProvider = (providerMatch?.[1] || "google") as Provider;
        setProvider(currentProvider);

        if (error) {
          throw new Error(`Authorization denied: ${error}`);
        }

        if (!code || !state) {
          throw new Error("Missing authorization code or state parameter");
        }

        setStatus("processing");
        setMessage("Processing your authorization...");

        const data = await apiRequest<{
          success: boolean;
          message: string;
          email?: string;
        }>(`/calendar/auth/${currentProvider}/process-callback`, {
          method: "POST",
          body: JSON.stringify({ code, state }),
        });

        if (!data.success) {
          throw new Error(data.message || "Failed to connect calendar");
        }

        const targetPath =
          consumeCalendarConnectReturn() ?? DEFAULT_RETURN_PATH;
        clearCalendarConnectReopenModal();
        setReturnPath(targetPath);

        setStatus("success");
        setMessage(
          `${currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1)} Calendar connected successfully!`
        );

        toast({
          title: "Connection Successful",
          description: `Your ${currentProvider} calendar has been connected.${data.email ? ` (${data.email})` : ""}`,
        });

        setTimeout(() => {
          navigate(targetPath);
        }, 2000);
      } catch (error) {
        setStatus("error");
        const rawMessage =
          error instanceof Error ? error.message : "Failed to connect calendar";
        const friendlyMessage = getFriendlyOAuthErrorMessage(rawMessage);
        setMessage(friendlyMessage);

        toast({
          title: "Connection Failed",
          description: friendlyMessage,
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  const getProviderName = () => {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  const providerCalendarLabel = `${getProviderName()} Calendar`;
  const hasCustomReturn = returnPath !== DEFAULT_RETURN_PATH;
  const isPostJobReturn = returnPath === POST_A_JOB_PATH;
  const errorReturnPath =
    peekCalendarConnectReturn() ?? DEFAULT_RETURN_PATH;
  const hasErrorCustomReturn = errorReturnPath !== DEFAULT_RETURN_PATH;
  const isPostJobErrorReturn = errorReturnPath === POST_A_JOB_PATH;

  const handleContinue = () => {
    navigate(returnPath);
  };

  const handleErrorReturn = () => {
    if (isPostJobErrorReturn) {
      setCalendarConnectReopenModal();
    }
    navigate(errorReturnPath);
  };

  const handleTryAgain = () => {
    if (isPostJobErrorReturn) {
      setCalendarConnectReopenModal();
      navigate(POST_A_JOB_PATH);
      return;
    }
    window.location.reload();
  };

  const errorReturnButtonLabel = isPostJobErrorReturn
    ? "Back to Post a Job"
    : hasErrorCustomReturn
      ? "Go back"
      : "Return to Getting started";

  if (status === "processing") {
    return (
      <OAuthCallbackShell>
        <ImportModalProgressPanel
          mode="oauth"
          providerName={providerCalendarLabel}
        />
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
              {isPostJobReturn
                ? "Redirecting you back to Post a Job…"
                : hasCustomReturn
                  ? "Redirecting you back to continue…"
                  : "Redirecting you to Getting started…"}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleContinue}
            className={cn(
              "h-12 w-full rounded-full font-bold shadow-md hover:opacity-95",
              isPostJobReturn
                ? "bg-brand-gradient text-brand-foreground shadow-brand-cta"
                : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {isPostJobReturn
              ? "Continue to Post a Job"
              : hasCustomReturn
                ? "Continue"
                : "Continue to Getting started"}
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
          <p className="mt-2 text-xs text-muted-foreground">
            {isPostJobErrorReturn
              ? "You can continue editing your job post. Connecting a calendar is required before publishing."
              : "Please try connecting again or contact support if the issue persists."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleErrorReturn}
            className="h-12 flex-1 rounded-full"
          >
            {errorReturnButtonLabel}
          </Button>
          <Button
            type="button"
            onClick={handleTryAgain}
            className="h-12 flex-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white shadow-md hover:opacity-95"
          >
            Try again
          </Button>
        </div>
      </div>
    </OAuthCallbackShell>
  );
}
