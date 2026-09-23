import type { DragEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ImportModalUploadZoneProps {
  isDragOver: boolean;
  hasFile: boolean;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  /** e.g. open file dialog when clicking empty zone */
  onClick?: () => void;
  /** When `onClick` is set, used for the drop zone control */
  browseLabel?: string;
  children: ReactNode;
  className?: string;
}

export function ImportModalUploadZone({
  isDragOver,
  hasFile,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
  browseLabel = "Browse for ZIP file",
  children,
  className,
}: ImportModalUploadZoneProps) {
  return (
    <div
      role={onClick ? "button" : "presentation"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? browseLabel : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "mb-4 cursor-pointer rounded-[14px] border-2 border-dashed border-border px-5 py-7 text-center transition-colors",
        "hover:border-gs-amethyst/60 hover:bg-gs-amethyst/[0.04]",
        isDragOver && "border-gs-amethyst bg-gs-amethyst/[0.06]",
        hasFile && "border-gs-success bg-gs-success/[0.06]",
        className
      )}
    >
      {children}
    </div>
  );
}
