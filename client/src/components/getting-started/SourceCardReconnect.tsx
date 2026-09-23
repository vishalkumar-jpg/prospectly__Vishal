import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { importModalAccentGradientBr } from "@/components/getting-started/import-modal/modalStyles";

export interface GettingStartedSourceCardReconnectProps {
  name: string;
  onReconnect: () => void;
}

export function GettingStartedSourceCardReconnect({
  name,
  onReconnect,
}: GettingStartedSourceCardReconnectProps) {
  const handleReconnectClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onReconnect();
  };

  return (
    <Button
      type="button"
      aria-label={`Reconnect to ${name}`}
      className={cn(
        "h-auto scale-100 rounded-lg border-0 px-2 py-1.5 text-xs font-bold text-white shadow-none transition-transform",
        importModalAccentGradientBr,
        "hover:scale-[1.04] hover:brightness-105"
      )}
      onClick={handleReconnectClick}
    >
      Reconnect
    </Button>
  );
}
