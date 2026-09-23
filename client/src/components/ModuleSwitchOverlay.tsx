import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Briefcase, DoorOpen } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import type { PrimaryWorkspace } from "@/lib/workspace-focus";

const MODULE_ICON: Record<PrimaryWorkspace, typeof Briefcase> = {
  recruiting: Briefcase,
  prospecting: DoorOpen,
};

const MODULE_LABEL: Record<PrimaryWorkspace, string> = {
  recruiting: "Recruiting",
  prospecting: "Prospecting",
};

type ModuleSwitchOverlayProps = {
  target: PrimaryWorkspace;
  stepMessage: string;
};

export function ModuleSwitchOverlay({
  target,
  stepMessage,
}: ModuleSwitchOverlayProps) {
  const Icon = MODULE_ICON[target];
  const label = MODULE_LABEL[target];

  return (
    <DialogPrimitive.Root open modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl motion-reduce:backdrop-blur-none"
          aria-hidden
        />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 outline-none"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
          aria-busy="true"
          aria-live="polite"
        >
          <DialogPrimitive.Title className="sr-only">
            Switching to {label}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {stepMessage}
          </DialogPrimitive.Description>

          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--brand-amethyst)),hsl(var(--brand-rose)))] text-primary-foreground shadow-lg motion-safe:animate-pulse"
            aria-hidden
          >
            <Icon className="h-7 w-7" strokeWidth={2} />
          </div>
          <p className="text-lg font-bold text-foreground" aria-hidden>
            Switching to {label}
          </p>
          <p className="min-h-[18px] text-sm text-muted-foreground" aria-hidden>
            {stepMessage}
          </p>
          <Loader size="md" className="gap-0 py-0" />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
