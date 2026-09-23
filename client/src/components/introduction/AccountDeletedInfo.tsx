import React from "react";
import { AlertCircle } from "lucide-react";

interface AccountDeletedInfoProps {
  className?: string;
  variant?: "blue" | "purple" | "rose";
}

export const AccountDeletedInfo: React.FC<AccountDeletedInfoProps> = ({
  className = "",
  variant = "blue",
}) => {
  const variantStyles = {
    blue: {
      bg: "bg-brand-sky/10",
      text: "text-brand-sky",
      border: "border-brand-sky/20",
    },
    purple: {
      bg: "bg-brand-amethyst/10",
      text: "text-brand-amethyst",
      border: "border-brand-amethyst/20",
    },
    rose: {
      bg: "bg-brand-rose/10",
      text: "text-brand-rose",
      border: "border-brand-rose/20",
    },
  } as const;

  const {
    bg: bgColor,
    text: textColor,
    border: borderColor,
  } = variantStyles[variant];

  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-lg border ${bgColor} ${borderColor} ${className}`}
    >
      <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${textColor}`} />
      <div className="space-y-1">
        <p className={`text-[12px] font-semibold leading-tight ${textColor}`}>
          Account Purged
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          This user's account has been deleted. Historical details may no longer
          be available.
        </p>
      </div>
    </div>
  );
};
