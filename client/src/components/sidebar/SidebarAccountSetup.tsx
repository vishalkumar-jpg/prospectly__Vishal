import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import {
  getBankSetupLabel,
  getBankVisualState,
  getCalendarVisualState,
  getContactsVisualState,
  SidebarSetupItemVisualState,
  useSidebarAccountSetup,
} from "@/hooks/useSidebarAccountSetup";

type SetupRowDisplayState = "done" | "pending";

const ROW_CLASS: Record<SetupRowDisplayState, string> = {
  done: "text-brand-rose",
  pending: "text-muted-foreground",
};

const DOT_CLASS: Record<SetupRowDisplayState, string> = {
  done: "bg-brand-rose",
  pending: "bg-border",
};

type SetupRowProps = {
  label: string;
  isDone: boolean;
  onClick: () => void;
};

const SetupRow = ({ label, isDone, onClick }: SetupRowProps) => {
  const displayState: SetupRowDisplayState = isDone ? "done" : "pending";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md py-0.5 text-left text-xs transition-colors",
        "hover:bg-secondary/60",
        ROW_CLASS[displayState]
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          DOT_CLASS[displayState]
        )}
        aria-hidden
      />
      <span className="leading-snug">{label}</span>
    </button>
  );
};

const SETUP_ROW_SKELETON_WIDTHS = ["w-[72%]", "w-[68%]", "w-[80%]"] as const;

const PROGRESS_BAR_WIDTH_CLASS: Record<number, string> = {
  33: "w-[33%]",
  67: "w-[67%]",
  100: "w-full",
};

const getProgressBarWidthClass = (progressPct: number): string =>
  PROGRESS_BAR_WIDTH_CLASS[progressPct] ?? "w-0";

const SidebarAccountSetupSkeleton = () => (
  <SidebarFooter className="border-t border-border p-4">
    <div aria-busy aria-label="Loading account setup">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-[5.75rem]" />
        <Skeleton className="h-3 w-8" />
      </div>

      <Skeleton className="mb-2 h-2 w-full rounded" />

      <div className="flex flex-col gap-1">
        {SETUP_ROW_SKELETON_WIDTHS.map((widthClass) => (
          <div key={widthClass} className="flex items-center gap-1.5 py-0.5">
            <Skeleton className="h-1.5 w-1.5 shrink-0 rounded-full" />
            <Skeleton className={cn("h-3 rounded-md", widthClass)} />
          </div>
        ))}
      </div>
    </div>
  </SidebarFooter>
);

type SidebarAccountSetupProps = {
  onOpenStripeModal: () => void;
  onOpenCalendarModal: () => void;
  onNavigate?: () => void;
};

export const SidebarAccountSetup = ({
  onOpenStripeModal,
  onOpenCalendarModal,
  onNavigate,
}: SidebarAccountSetupProps) => {
  const navigate = useNavigate();
  const { state, isMobile } = useSidebar();
  const [isListExpanded, setIsListExpanded] = useState(false);
  const {
    contactsImported,
    calendarConnected,
    bankState,
    progressPct,
    loading,
    importStep,
  } = useSidebarAccountSetup();

  if (state === "collapsed" && !isMobile) {
    return null;
  }

  if (loading) {
    return <SidebarAccountSetupSkeleton />;
  }

  const isSetupComplete = progressPct >= 100;
  const showChecklist = !isSetupComplete || isListExpanded;

  const goToImport = () => {
    navigate(`/getting-started?step=${importStep}`);
    onNavigate?.();
  };

  const handleCalendarClick = () => {
    onOpenCalendarModal();
    onNavigate?.();
  };

  const handleBankClick = () => {
    onOpenStripeModal();
    onNavigate?.();
  };

  const setupRows = [
    {
      label: contactsImported ? "Contacts imported" : "Import contacts",
      visualState: getContactsVisualState(contactsImported),
      onClick: goToImport,
    },
    {
      label: calendarConnected ? "Calendar connected" : "Connect calendar",
      visualState: getCalendarVisualState(calendarConnected),
      onClick: handleCalendarClick,
    },
    {
      label: getBankSetupLabel(bankState),
      visualState: getBankVisualState(bankState),
      onClick: handleBankClick,
    },
  ];

  return (
    <SidebarFooter className="border-t border-border p-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-muted-foreground">
            Account Setup
          </p>
          {isSetupComplete ? (
            <button
              type="button"
              onClick={() => setIsListExpanded((open) => !open)}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 transition-colors",
                "hover:bg-secondary/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst/40"
              )}
              aria-expanded={isListExpanded}
              aria-label="Toggle account setup checklist"
            >
              <span className="text-xs font-extrabold tabular-nums text-amber-600 dark:text-amber-500">
                {`${progressPct}%`}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                  isListExpanded && "rotate-180"
                )}
                aria-hidden
              />
            </button>
          ) : (
            <span className="text-xs font-extrabold tabular-nums text-amber-600 dark:text-amber-500">
              {`${progressPct}%`}
            </span>
          )}
        </div>

        <div
          className={cn(
            "mb-2 h-2 overflow-hidden rounded bg-secondary",
            !showChecklist && "mb-0"
          )}
        >
          {progressPct > 0 ? (
            <div
              className={cn(
                "relative h-full rounded bg-gradient-to-r from-brand-amethyst to-brand-rose transition-[width] duration-500 ease-out",
                getProgressBarWidthClass(progressPct)
              )}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded bg-gradient-to-b from-white/30 to-transparent"
                aria-hidden
              />
            </div>
          ) : null}
        </div>

        {showChecklist ? (
          <div className="flex flex-col gap-1">
            {setupRows.map((row) => (
              <SetupRow
                key={row.label}
                label={row.label}
                // ActionRequired (partial bank) uses pending styling — intentional two-state UI.
                isDone={row.visualState === SidebarSetupItemVisualState.Done}
                onClick={row.onClick}
              />
            ))}
          </div>
        ) : null}
      </div>
    </SidebarFooter>
  );
};
