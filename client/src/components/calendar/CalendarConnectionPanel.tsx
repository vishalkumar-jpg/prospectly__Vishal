import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { AnyType } from "@/types/common";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GettingStartedStepSectionHeader } from "@/components/getting-started/connectSection";
import { cn } from "@/lib/utils";
import {
  CalendarProviderCard,
  getCalendarProviderFlags,
  type CalendarProvider,
  type CalendarProviderButtonVariant,
} from "@/components/calendar/CalendarProviderCard";
import { CalendarConnectionFeatureBoxes } from "@/components/calendar/CalendarConnectionFeatureBoxes";
import { useToast } from "@/hooks/use-toast";

export interface CalendarConnectionPanelProps {
  title?: string;
  description?: string;
  integrations: AnyType[];
  connectCalendar: (provider: CalendarProvider) => void;
  connectingProvider: CalendarProvider | null;
  disconnectCalendar?: (provider: CalendarProvider) => Promise<boolean>;
  showFeatureBoxes?: boolean;
  showHeader?: boolean;
  className?: string;
  gridLayout?: "page" | "singleColumn";
  buttonVariant?: CalendarProviderButtonVariant;
}

export function CalendarConnectionPanel({
  title = "Connect Your Calendar",
  description = "Enable seamless scheduling for your meetings",
  integrations,
  connectCalendar,
  connectingProvider,
  disconnectCalendar,
  showFeatureBoxes = false,
  showHeader = true,
  className,
  gridLayout = "page",
  buttonVariant = "default",
}: CalendarConnectionPanelProps) {
  const { toast } = useToast();
  const [pendingDisconnectProvider, setPendingDisconnectProvider] =
    useState<CalendarProvider | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const googleFlags = getCalendarProviderFlags({
    integrations,
    provider: "google",
  });
  const microsoftFlags = getCalendarProviderFlags({
    integrations,
    provider: "microsoft",
  });

  const handleDisconnectConfirm = async () => {
    if (!pendingDisconnectProvider || !disconnectCalendar) return;
    setIsDisconnecting(true);
    try {
      const didDisconnect = await disconnectCalendar(pendingDisconnectProvider);
      if (didDisconnect) {
        setPendingDisconnectProvider(null);
      }
    } catch {
      toast({
        title: "Disconnection Failed",
        description: "Unable to disconnect calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const onDisconnectRequest = disconnectCalendar
    ? (provider: CalendarProvider) => setPendingDisconnectProvider(provider)
    : undefined;

  return (
    <div className={className}>
      {showHeader ? (
        <GettingStartedStepSectionHeader
          title={title}
          description={description}
        />
      ) : null}
      <div className="flex flex-col gap-4">
        <div
          className={cn(
            "grid grid-cols-1 gap-3",
            gridLayout === "page" && "md:grid-cols-2"
          )}
        >
          <CalendarProviderCard
            provider="google"
            integration={googleFlags.integration}
            blockedByOther={googleFlags.blockedByOther}
            cardInteractive={googleFlags.cardInteractive}
            connectingProvider={connectingProvider}
            connectCalendar={connectCalendar}
            onDisconnectRequest={onDisconnectRequest}
            buttonVariant={buttonVariant}
          />
          <CalendarProviderCard
            provider="microsoft"
            integration={microsoftFlags.integration}
            blockedByOther={microsoftFlags.blockedByOther}
            cardInteractive={microsoftFlags.cardInteractive}
            connectingProvider={connectingProvider}
            connectCalendar={connectCalendar}
            onDisconnectRequest={onDisconnectRequest}
            buttonVariant={buttonVariant}
          />
        </div>
        {showFeatureBoxes ? <CalendarConnectionFeatureBoxes /> : null}
      </div>

      {disconnectCalendar ? (
        <AlertDialog
          open={pendingDisconnectProvider !== null}
          onOpenChange={(open) => {
            if (!open) setPendingDisconnectProvider(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Calendar?</AlertDialogTitle>
              <AlertDialogDescription>
                This will disconnect your{" "}
                {pendingDisconnectProvider === "google"
                  ? "Google"
                  : "Microsoft"}{" "}
                Calendar.
                <br />
                <br />
                <strong>Your meeting history will be preserved.</strong> You can
                reconnect anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDisconnecting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void handleDisconnectConfirm();
                }}
                disabled={isDisconnecting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  "Disconnect Calendar"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
