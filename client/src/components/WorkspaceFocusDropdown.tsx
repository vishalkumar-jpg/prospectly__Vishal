import { useState } from "react";
import { Briefcase, Check, DoorOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModuleSwitchOverlay } from "@/components/ModuleSwitchOverlay";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceFocus } from "@/hooks/useWorkspaceFocus";
import { useRecruitingHomeActivity } from "@/hooks/useWorkspaceHomeDestination";
import { resolveWorkspaceHomeDestination } from "@/lib/workspace-home";
import {
  PRIMARY_WORKSPACE_OPTIONS,
  type PrimaryWorkspace,
} from "@/lib/workspace-focus";

const ICON: Record<PrimaryWorkspace, typeof Briefcase> = {
  recruiting: Briefcase,
  prospecting: DoorOpen,
};

const COLOR_CLASS: Record<PrimaryWorkspace, string> = {
  recruiting: "text-brand-amethyst",
  prospecting: "text-brand-sky",
};

const TRIGGER_CLASS: Record<PrimaryWorkspace, string> = {
  recruiting:
    "border-brand-amethyst/40 bg-brand-amethyst/10 text-brand-amethyst",
  prospecting: "border-brand-sky/40 bg-brand-sky/10 text-brand-sky",
};

const SELECTED_BG: Record<PrimaryWorkspace, string> = {
  recruiting: "bg-brand-amethyst/10",
  prospecting: "bg-brand-sky/10",
};

export function WorkspaceFocusDropdown() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { focus, showFocusSwitcher, setFocus, canAccessRecruiting, isPending } =
    useWorkspaceFocus();
  const activity = useRecruitingHomeActivity(canAccessRecruiting);
  const [switchingTo, setSwitchingTo] = useState<PrimaryWorkspace | null>(null);
  const [switchStep, setSwitchStep] = useState("Loading your workspace…");

  if (!showFocusSwitcher) return null;

  const ActiveIcon = ICON[focus];
  const activeLabel =
    PRIMARY_WORKSPACE_OPTIONS.find((o) => o.id === focus)?.label ?? "Workspace";
  const isSwitching = switchingTo != null;

  const handleSelect = (next: PrimaryWorkspace) => {
    if (next === focus || isSwitching) return;

    setSwitchingTo(next);
    setSwitchStep("Checking your access…");

    const stageTimer = window.setTimeout(() => {
      setSwitchStep("Finding where to take you…");
    }, 700);

    void (async () => {
      try {
        await setFocus(next);
      } catch {
        window.clearTimeout(stageTimer);
        setSwitchingTo(null);
        toast({
          title: "Couldn't switch workspaces",
          description: "Your workspace was not changed. Try again.",
          variant: "destructive",
        });
        return;
      }

      try {
        const flags =
          next === "recruiting"
            ? await activity.ensureResolved()
            : { hasPostedJobs: false };

        const destination = resolveWorkspaceHomeDestination({
          primary: next,
          hasPostedJobs: flags.hasPostedJobs,
        });

        window.clearTimeout(stageTimer);
        const openingLabel = destination.label.replace(/^Go to /i, "");
        setSwitchStep(`Opening ${openingLabel}…`);

        navigate(destination.path);

        window.setTimeout(() => {
          setSwitchingTo(null);
        }, 450);
      } catch {
        window.clearTimeout(stageTimer);
        setSwitchingTo(null);
        toast({
          title: "Couldn't load your home screen",
          description:
            "Opening the default workspace view. Try switching again.",
          variant: "destructive",
        });
        navigate(
          resolveWorkspaceHomeDestination({
            primary: next,
            hasPostedJobs: false,
          }).path,
        );
      }
    })();
  };

  return (
    <>
      {switchingTo ? (
        <ModuleSwitchOverlay target={switchingTo} stepMessage={switchStep} />
      ) : null}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Workspace"
          aria-label={`Workspace: ${activeLabel}`}
          disabled={isPending || isSwitching}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-[11px] border transition-all",
            "md:w-[9.75rem] md:px-3",
            "hover:-translate-y-px hover:shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            TRIGGER_CLASS[focus]
          )}
        >
          <ActiveIcon className="h-4 w-4 shrink-0" />
          <span className="hidden whitespace-nowrap text-xs font-semibold md:inline">
            {activeLabel}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[9.75rem] min-w-[9.75rem] space-y-1 rounded-xl p-1.5"
      >
        {PRIMARY_WORKSPACE_OPTIONS.map((option) => {
          const Icon = ICON[option.id];
          const selected = focus === option.id;
          return (
            <DropdownMenuItem
              key={option.id}
              disabled={isPending || isSwitching}
              className={cn(
                "cursor-pointer gap-2 rounded-lg px-2.5 py-2.5",
                selected && SELECTED_BG[option.id]
              )}
              onClick={() => handleSelect(option.id)}
            >
              <Icon
                className={cn("h-4 w-4 shrink-0", COLOR_CLASS[option.id])}
              />
              <span className="min-w-0 flex-1 whitespace-nowrap text-xs font-semibold text-foreground">
                {option.label}
              </span>
              {selected ? (
                <Check
                  className={cn("h-3.5 w-3.5 shrink-0", COLOR_CLASS[option.id])}
                />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
