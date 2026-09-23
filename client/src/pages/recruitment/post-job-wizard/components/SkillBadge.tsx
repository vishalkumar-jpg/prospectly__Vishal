import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface SkillBadgeProps {
  skill: string;
  onRemove: () => void;
  isEditMode?: boolean;
  color: "teal" | "cyan";
}

export function SkillBadge({
  skill,
  onRemove,
  isEditMode,
  color,
}: SkillBadgeProps) {
  const colorClasses = {
    teal: "bg-brand-success/10 text-brand-success hover:bg-brand-success/20 focus-visible:ring-brand-success",
    cyan: "bg-brand-sky/10 text-brand-sky hover:bg-brand-sky/20 focus-visible:ring-brand-sky",
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditMode) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRemove();
    }
  };
  const handleClick = () => {
    if (isEditMode) return;
    onRemove();
  };

  return (
    <Badge
      variant="secondary"
      tabIndex={isEditMode ? -1 : 0}
      role={isEditMode ? undefined : "button"}
      aria-label={isEditMode ? undefined : `Remove ${skill}`}
      aria-disabled={isEditMode || undefined}
      className={cn(
        `${colorClasses[color]} px-3 py-1.5 text-sm transition-colors duration-200`,
        !isEditMode &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isEditMode ? "cursor-default" : "cursor-pointer"
      )}
      onClick={isEditMode ? undefined : handleClick}
      onKeyDown={isEditMode ? undefined : handleKeyDown}
    >
      {skill}
      {!isEditMode && <X className="h-3 w-3 ml-1.5" />}
    </Badge>
  );
}
