import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-app-overlay=""
    // z-[70] sits above sticky topbars that use z-[60] (e.g. BookMeetingPublic,
    // PublicJobPage). Without this, mobile-fullscreen dialogs render flush to
    // the viewport top and the topbar covers their header.
    className={cn(
      "fixed inset-0 z-[70] bg-black/40 backdrop-blur-[4px] data-[state=open]:animate-modal-overlay-in data-[state=closed]:animate-modal-overlay-out motion-reduce:animate-none",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    mobileFullscreen?: boolean;
    /** When true, omit the default top-right close control (use a custom one, e.g. import modal v4). */
    hideCloseButton?: boolean;
  }
>(
  (
    { className, children, mobileFullscreen, hideCloseButton, ...props },
    ref
  ) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // z-[70] matches DialogOverlay so the dialog sits above sticky
          // topbars (z-[60]) — required for mobile-fullscreen dialogs to render
          // above page chrome.
          "fixed left-[50%] top-[50%] z-[70] grid w-full max-w-lg gap-4 bg-background p-6 shadow-lg motion-reduce:translate-x-[-50%] motion-reduce:translate-y-[-50%] data-[state=open]:animate-modal-spring-in data-[state=closed]:animate-modal-spring-out motion-reduce:animate-none sm:rounded-2xl",
          mobileFullscreen &&
            "max-sm:inset-0 max-sm:left-0 max-sm:top-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-full max-sm:min-w-full max-sm:max-w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none max-sm:content-start max-sm:overflow-y-auto max-sm:motion-reduce:translate-x-0 max-sm:motion-reduce:translate-y-0 max-sm:data-[state=open]:animate-modal-spring-in-fs max-sm:data-[state=closed]:animate-modal-spring-out-fs",
          className
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 z-[1] grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
