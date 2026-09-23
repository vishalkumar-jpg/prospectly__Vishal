import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  importModalAccentGradient,
  importModalAccentGradientHover,
  importModalCtaShadow,
} from "@/components/getting-started/import-modal/modalStyles";

type ImportModalPrimaryCtaProps = {
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function ImportModalPrimaryCta({
  children,
  className,
  type = "button",
  ...props
}: ImportModalPrimaryCtaProps) {
  return (
    <button
      type={type}
      className={cn(
        "w-full rounded-xl px-3 py-3 text-[15px] font-bold text-white transition-transform",
        importModalAccentGradient,
        importModalCtaShadow,
        importModalAccentGradientHover,
        "hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
