import * as React from "react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  importModalDialogContentClassName,
  importModalBodyClassName,
  importModalCloseButtonClassName,
} from "@/components/getting-started/import-modal/modalStyles";
import { X } from "lucide-react";

export interface ImportModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Announced to screen readers (content is unlabeled visually). */
  accessibilityTitle: string;
  children: ReactNode;
  /** Merged onto DialogContent after `dialogContentClassName` (shell size/radius/shadow). */
  className?: string;
  /**
   * Full DialogContent layout class (e.g. `importModalTabbedDialogContentClassName(wide)`).
   * Defaults to compact 480px shell.
   */
  dialogContentClassName?: string;
  bodyClassName?: string;
  mobileFullscreen?: boolean;
}

export const ImportModalShell = React.forwardRef<
  HTMLDivElement,
  ImportModalShellProps
>(function ImportModalShell(
  {
    open,
    onOpenChange,
    accessibilityTitle,
    children,
    className,
    dialogContentClassName = importModalDialogContentClassName,
    bodyClassName,
    mobileFullscreen = true,
  },
  ref
) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={ref}
        className={cn(dialogContentClassName, className)}
        mobileFullscreen={mobileFullscreen}
        hideCloseButton
      >
        <DialogTitle className="sr-only">{accessibilityTitle}</DialogTitle>
        <DialogClose
          type="button"
          className={importModalCloseButtonClassName}
          aria-label="Close"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          <span className="sr-only">Close</span>
        </DialogClose>
        <div className={cn(importModalBodyClassName, bodyClassName)}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
});
