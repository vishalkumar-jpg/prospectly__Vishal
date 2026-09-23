import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ImportModalTextButtonProps = {
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function ImportModalTextButton({
  children,
  className,
  type = "button",
  ...props
}: ImportModalTextButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "mt-2.5 w-full border-0 bg-transparent text-center text-xs text-muted-foreground underline underline-offset-2 transition-colors",
        "hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
