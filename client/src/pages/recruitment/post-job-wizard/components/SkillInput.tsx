import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { JOB_FIELD_LIMITS } from "../validation";
import { cn } from "@/lib/utils";

interface SkillInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: (skill: string) => void;
  placeholder: string;
  disabled?: boolean;
  maxArray: number;
  currentCount: number;
  color: "teal" | "cyan";
}

export function SkillInput({
  value,
  onChange,
  onAdd,
  placeholder,
  disabled,
  maxArray,
  currentCount,
  color,
}: SkillInputProps) {
  const commitSkill = () => {
    const nextSkill = value.trim();
    if (disabled || !nextSkill || currentCount >= maxArray) return;
    onAdd(nextSkill);
    onChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();
    commitSkill();
  };

  const handleClick = () => {
    commitSkill();
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        maxLength={JOB_FIELD_LIMITS.skill.max}
        className="flex-1 min-w-0"
      />
      <Button
        type="button"
        size="sm"
        onClick={handleClick}
        disabled={disabled || !value.trim() || currentCount >= maxArray}
        aria-label="Add skill"
        className={cn(
          "transition-colors",
          color === "teal"
            ? "bg-brand-gradient text-brand-foreground hover:opacity-90"
            : "bg-brand-sky text-brand-foreground hover:bg-brand-sky/90"
        )}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
