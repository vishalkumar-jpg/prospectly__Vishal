import { useEffect, RefObject } from "react";

export function useDialogFocus(
  isOpen: boolean,
  dialogContentRef: RefObject<HTMLDivElement>
) {
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const closeButton =
        dialogContentRef.current?.querySelector<HTMLButtonElement>(
          "button:has(span.sr-only)"
        );
      closeButton?.focus();
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, dialogContentRef]);
}
