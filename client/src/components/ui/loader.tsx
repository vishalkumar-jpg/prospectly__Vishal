import { cn } from "@/lib/utils";

interface LoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullPage?: boolean;
}

const dotSize: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

const dotGap: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "gap-1.5",
  md: "gap-[9px]",
  lg: "gap-3",
};

const wrapperPadding: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "py-6",
  md: "py-12",
  lg: "py-16",
};

const captionSize: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
};

const captionGap: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

export function Loader({
  message,
  size = "md",
  className,
  fullPage = false,
}: LoaderProps) {
  const dots = (
    <div
      className={cn("inline-flex items-center", dotGap[size])}
      role="status"
      aria-label={message ?? "Loading"}
    >
      <span
        className={cn(
          "rounded-full bg-brand-amethyst animate-loader-pulse",
          dotSize[size]
        )}
      />
      <span
        className={cn(
          "rounded-full bg-brand-rose animate-loader-pulse [animation-delay:0.2s]",
          dotSize[size]
        )}
      />
      <span
        className={cn(
          "rounded-full bg-brand-sky animate-loader-pulse [animation-delay:0.4s]",
          dotSize[size]
        )}
      />
    </div>
  );

  const caption = message ? (
    <p
      className={cn(
        "text-muted-foreground font-medium text-center",
        captionSize[size]
      )}
    >
      {message}
    </p>
  ) : null;

  if (fullPage) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-[1000] flex flex-col items-center justify-center",
          "bg-background/75 backdrop-blur-md",
          captionGap[size],
          className
        )}
        data-testid="loader"
      >
        {dots}
        {caption}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        wrapperPadding[size],
        captionGap[size],
        className
      )}
      data-testid="loader"
    >
      {dots}
      {caption}
    </div>
  );
}

/** Bottom-of-list indicator for infinite scroll / load-more. */
export function LoadMoreLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center justify-center py-6", className)}
      data-testid="load-more-loader"
    >
      <Loader size="sm" className="py-0 gap-0" />
    </div>
  );
}
