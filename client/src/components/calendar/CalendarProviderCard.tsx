import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SourceBrandIconGoogle,
  SourceBrandIconMicrosoft,
} from "@/components/getting-started/sourceBrandIcons";
import type { AnyType } from "@/types/common";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

export type CalendarProvider = "google" | "microsoft";
export type CalendarProviderButtonVariant = "default" | "brand";

const calProviderSpring =
  "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]";

const CALENDAR_PROVIDER_META: Record<
  CalendarProvider,
  {
    providerName: string;
    providerDescription: string;
    tags: string[];
    blockedTitle: string;
    connectTitle: string;
    iconBgClass: string;
    accentAfterClass: string;
  }
> = {
  google: {
    providerName: "Google Calendar",
    providerDescription: "Full integration with Google Meet support",
    tags: ["Two-way sync", "Meet included"],
    blockedTitle:
      "Microsoft Calendar is already connected. Disconnect Microsoft to connect Google.",
    connectTitle: "Disconnect Microsoft Calendar first to connect Google.",
    iconBgClass: "bg-[#FEF3E2]",
    accentAfterClass:
      "after:bg-[linear-gradient(90deg,#4285F4,#34A853,#FBBC05,#EA4335)]",
  },
  microsoft: {
    providerName: "Microsoft Calendar",
    providerDescription: "Outlook & Office 365 with Teams support",
    tags: ["Office 365", "Teams"],
    blockedTitle:
      "Google Calendar is already connected. Disconnect Google to connect Microsoft.",
    connectTitle: "Disconnect Google Calendar first to connect Microsoft.",
    iconBgClass: "bg-[#E8F0FE]",
    accentAfterClass:
      "after:bg-[linear-gradient(90deg,#F25022,#7FBA00,#00A4EF,#FFB900)]",
  },
};

export function getCalendarProviderFlags({
  integrations,
  provider,
}: {
  integrations: AnyType[];
  provider: CalendarProvider;
}) {
  const googleIntegration = integrations.find(
    (i: AnyType) => i.provider === "google"
  );
  const microsoftIntegration = integrations.find(
    (i: AnyType) => i.provider === "microsoft"
  );
  const isGoogle = provider === "google";
  const integration = isGoogle ? googleIntegration : microsoftIntegration;
  const blockedByOther = isGoogle
    ? Boolean(microsoftIntegration && !googleIntegration)
    : Boolean(googleIntegration && !microsoftIntegration);
  const cardInteractive = !integration && !blockedByOther;
  return { integration, blockedByOther, cardInteractive };
}

function getCalendarProviderCardClassName({
  integration,
  blockedByOther,
  cardInteractive,
  accentAfterClass,
}: {
  integration: AnyType | undefined;
  blockedByOther: boolean;
  cardInteractive: boolean;
  accentAfterClass: string;
}) {
  return cn(
    "relative flex items-center gap-3.5 overflow-hidden rounded-[14px] border-[1.5px] bg-card p-[18px]",
    calProviderSpring,
    integration
      ? "border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/30"
      : blockedByOther
        ? "cursor-not-allowed border-border opacity-70"
        : "cursor-pointer border-border hover:-translate-y-[3px] hover:border-sky-500/35 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
    "after:content-[''] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:opacity-0 after:transition-opacity after:duration-300",
    cardInteractive && "hover:after:opacity-100",
    accentAfterClass
  );
}

function CalendarProviderCardConnected({
  integration,
  provider,
  onDisconnectRequest,
}: {
  integration: AnyType;
  provider: CalendarProvider;
  onDisconnectRequest?: (provider: CalendarProvider) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Connected
      </div>
      <div className="text-[11px] text-muted-foreground">
        {integration.providerEmail}
      </div>
      {onDisconnectRequest ? (
        <button
          type="button"
          onClick={() => onDisconnectRequest(provider)}
          className="cursor-pointer border-none bg-transparent text-[11px] text-red-600 underline hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          Disconnect
        </button>
      ) : null}
    </div>
  );
}

function CalendarProviderCardConnectButton({
  provider,
  blockedByOther,
  connectTitle,
  isConnecting,
  connectingProvider,
  connectCalendar,
  buttonVariant = "default",
}: {
  provider: CalendarProvider;
  blockedByOther: boolean;
  connectTitle: string;
  isConnecting: boolean;
  connectingProvider: CalendarProvider | null;
  connectCalendar: (provider: CalendarProvider) => void;
  buttonVariant?: CalendarProviderButtonVariant;
}) {
  return (
    <Button
      type="button"
      className={cn(
        "h-9 shrink-0 rounded-[10px] border-0 px-[18px] text-[13px] font-bold sm:w-auto",
        buttonVariant === "brand"
          ? "bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
          : "bg-gradient-to-br from-sky-500 to-[#0A66C2] text-white shadow-none hover:brightness-105"
      )}
      title={blockedByOther ? connectTitle : undefined}
      onClick={(e) => {
        e.stopPropagation();
        connectCalendar(provider);
      }}
      disabled={connectingProvider !== null || blockedByOther}
    >
      {isConnecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          Connect
          <ExternalLink className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export function CalendarProviderCard({
  provider,
  integration,
  blockedByOther,
  cardInteractive,
  connectingProvider,
  connectCalendar,
  onDisconnectRequest,
  buttonVariant = "default",
}: {
  provider: CalendarProvider;
  integration: AnyType | undefined;
  blockedByOther: boolean;
  cardInteractive: boolean;
  connectingProvider: CalendarProvider | null;
  connectCalendar: (provider: CalendarProvider) => void;
  onDisconnectRequest?: (provider: CalendarProvider) => void;
  buttonVariant?: CalendarProviderButtonVariant;
}) {
  const meta = CALENDAR_PROVIDER_META[provider];
  const isConnecting = connectingProvider === provider;

  const handleCardActivate = () => {
    if (!connectingProvider) connectCalendar(provider);
  };

  const handleCardKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    handleCardActivate();
  };

  return (
    <div
      role={cardInteractive ? "button" : undefined}
      tabIndex={cardInteractive ? 0 : undefined}
      title={blockedByOther ? meta.blockedTitle : undefined}
      className={getCalendarProviderCardClassName({
        integration,
        blockedByOther,
        cardInteractive,
        accentAfterClass: meta.accentAfterClass,
      })}
      onClick={cardInteractive ? handleCardActivate : undefined}
      onKeyDown={cardInteractive ? handleCardKeyDown : undefined}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]",
          meta.iconBgClass
        )}
      >
        {provider === "google" ? (
          <SourceBrandIconGoogle className="h-6 w-6" />
        ) : (
          <SourceBrandIconMicrosoft className="h-6 w-6" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="mb-0.5 text-[15px] font-bold text-foreground">
          {meta.providerName}
        </h4>
        <p className="text-xs text-muted-foreground">
          {meta.providerDescription}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {meta.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                buttonVariant === "brand"
                  ? "bg-muted text-foreground/70"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      {integration ? (
        <CalendarProviderCardConnected
          integration={integration}
          provider={provider}
          onDisconnectRequest={onDisconnectRequest}
        />
      ) : (
        <CalendarProviderCardConnectButton
          provider={provider}
          blockedByOther={blockedByOther}
          connectTitle={meta.connectTitle}
          isConnecting={isConnecting}
          connectingProvider={connectingProvider}
          connectCalendar={connectCalendar}
          buttonVariant={buttonVariant}
        />
      )}
    </div>
  );
}
