import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Star, Sparkles } from "lucide-react";

interface SkillSuggestionsProps {
  suggestions: string[];
  allAdded: string[];
  onAddSkill: (skill: string, type: "required" | "preferred") => void;
  departmentName?: string;
}

export function SkillSuggestions({
  suggestions,
  allAdded,
  onAddSkill,
  departmentName,
}: SkillSuggestionsProps) {
  const filteredSuggestions = suggestions.filter(
    (s) => !allAdded.some((a) => a.toLowerCase() === s.toLowerCase())
  );

  if (filteredSuggestions.length === 0) return null;

  return (
    <div className="border border-border rounded-xl p-3 sm:p-4 bg-secondary/50">
      <Label className="text-sm font-medium mb-3 block text-muted-foreground">
        Suggested for {departmentName || "this role"} — click to add as required
        or preferred
      </Label>
      <div className="flex flex-wrap gap-2">
        {filteredSuggestions.map((skill) => (
          <div key={skill} className="flex gap-0.5">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-brand-success/10 hover:border-brand-success/40 rounded-r-none border-r-0 transition-colors duration-150"
              onClick={() => onAddSkill(skill, "required")}
              title="Add as required"
            >
              <Star className="h-3 w-3 mr-1 text-brand-success" />
              {skill}
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-brand-sky/10 hover:border-brand-sky/40 rounded-l-none px-1.5 transition-colors duration-150"
              onClick={() => onAddSkill(skill, "preferred")}
              title="Add as preferred"
            >
              <Sparkles className="h-3 w-3 text-brand-sky" />
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
