import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { importModalLinkedInBrandGradient } from "@/components/getting-started/import-modal/modalStyles";

type ImportModalBrandedButtonProps = {
  children: ReactNode;
  variant?: "linkedin";
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function ImportModalBrandedButton({
  children,
  variant = "linkedin",
  className,
  type = "button",
  ...props
}: ImportModalBrandedButtonProps) {
  return (
    <Button
      type={type}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[10px] px-6 py-2.5 text-sm font-bold text-white transition-transform",
        variant === "linkedin" && importModalLinkedInBrandGradient,
        "hover:scale-[1.03] hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
