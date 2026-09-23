import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Headphones, X, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH_CLASS = "w-full sm:w-[380px]";

interface HelpSupportSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLiveChat?: () => void;
}

function getConferenceLink(value: unknown): string | null {
  if (typeof value === "string" && value.startsWith("http")) return value;
  if (value && typeof value === "object" && "url" in value)
    return String((value as { url: string }).url);
  if (value && typeof value === "object" && "link" in value)
    return String((value as { link: string }).link);
  return null;
}

export function HelpSupportSidebar({
  open,
  onOpenChange,
}: HelpSupportSidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["system-configuration", "conference_link"],
    queryFn: () => api.systemConfiguration.getBySlug("conference_link"),
    enabled: open,
  });

  const conferenceLink =
    config?.value != null ? getConferenceLink(config.value) : null;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  const handleJoinMeeting = () => {
    if (conferenceLink)
      window.open(conferenceLink, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300"
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed top-0 right-0 h-full flex flex-col bg-white border-l border-border z-[101]",
          "transform transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
          SIDEBAR_WIDTH_CLASS
        )}
        role="dialog"
        aria-label="Help & Support"
        aria-modal="true"
      >
        <header className="shrink-0 bg-gray-100 dark:bg-muted px-4 py-3 flex items-center justify-between gap-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <Headphones
              className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-500"
              aria-hidden
            />
            <h2 className="text-base font-bold truncate text-foreground">
              Help & Support
            </h2>
          </div>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="shrink-0 grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Button>
        </header>

        <div className="flex-1 flex flex-col p-4 overflow-auto bg-white">
          <div className="rounded-xl bg-white border border-border shadow-md p-6 flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 bg-gradient-to-r from-teal-500 to-green-500"
              aria-hidden
            >
              PS
            </div>
            <h3 className="text-lg font-bold mt-4 text-foreground">
              Hi, I'm Prospectly Support!
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your dedicated support specialist
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Click the button below to start a meeting with us.
            </p>
            <Button
              onClick={handleJoinMeeting}
              disabled={isLoading || !conferenceLink}
              className="mt-4 w-full gap-2 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0"
            >
              <Video className="h-4 w-4" />
              Join Meeting
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
