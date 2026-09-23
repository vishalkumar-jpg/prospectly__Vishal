import { Button } from "@/components/ui/button";
import { Briefcase, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionToggleProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function SectionToggle({
  activeSection,
  onSectionChange,
}: SectionToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 flex-shrink-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSectionChange("prospecting")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
          activeSection === "prospecting"
            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Target className="h-4 w-4" />
        <span className="font-semibold">Prospecting</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSectionChange("recruitment")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
          activeSection === "recruitment"
            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Briefcase className="h-4 w-4" />
        <span className="font-semibold">Recruitment</span>
      </Button>
    </div>
  );
}
