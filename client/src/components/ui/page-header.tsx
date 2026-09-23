import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-1 min-w-0", className)}>
      <h1 className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-brand-gradient">
        {title}
      </h1>
      {description ? (
        <p className="mt-[5px] text-[14px] text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

interface PageHeaderSectionProps {
  title: string;
  description?: string;
  stats?: ReactNode;
  statsClassName?: string;
  className?: string;
}

export function PageHeaderSection({
  title,
  description,
  stats,
  statsClassName,
  className,
}: PageHeaderSectionProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <PageHeader
        title={title}
        description={description}
        className="mb-0 lg:min-w-0 lg:flex-1"
      />
      {stats ? (
        <div className={cn("w-full shrink-0", statsClassName)}>{stats}</div>
      ) : null}
    </div>
  );
}
