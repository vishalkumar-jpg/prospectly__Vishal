import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SkillBadge } from "./SkillBadge";
import { SkillInput } from "./SkillInput";

interface SkillsCardProps {
  title: string;
  skills: string[];
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
  input: string;
  setInput: (value: string) => void;
  color: "teal" | "cyan";
  icon: React.ReactNode;
  maxArray: number;
  stepError?: string;
  isEditMode?: boolean;
  /** Whether to show the required `*` marker. Defaults to true. */
  isRequired?: boolean;
}

export function SkillsCard({
  title,
  skills,
  onAddSkill,
  onRemoveSkill,
  input,
  setInput,
  color,
  icon,
  maxArray,
  stepError,
  isEditMode,
  isRequired = true,
}: SkillsCardProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl border-2 shadow-brand-card",
        stepError
          ? "border-destructive/40"
          : skills.length > 0
            ? color === "teal"
              ? "border-brand-success/30"
              : "border-brand-sky/30"
            : "border-border"
      )}
    >
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {icon}
          <span className="min-w-0">
            {title}{" "}
            {isRequired && <span className="text-brand-rose text-sm">*</span>}
          </span>
          <Badge variant="secondary" className="ml-auto text-xs shrink-0">
            {skills.length} / {maxArray}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isEditMode && (
          <>
            <SkillInput
              value={input}
              onChange={setInput}
              onAdd={onAddSkill}
              placeholder="Type a skill and press Enter..."
              disabled={skills.length >= maxArray}
              maxArray={maxArray}
              currentCount={skills.length}
              color={color}
            />
            {skills.length >= maxArray && (
              <p className="text-xs text-destructive">
                Maximum of {maxArray} {title.toLowerCase()} reached
              </p>
            )}
          </>
        )}
        <div
          className={cn(
            "thin-scroll max-h-52 min-h-[2.5rem] rounded-md border border-border/60 bg-muted/20 p-2",
            color === "teal" && "border-brand-success/30",
            color === "cyan" && "border-brand-sky/30"
          )}
        >
          <div className="flex flex-wrap gap-2 content-start">
            {skills.map((skill) => (
              <SkillBadge
                key={skill}
                skill={skill}
                onRemove={() => onRemoveSkill(skill)}
                isEditMode={isEditMode}
                color={color}
              />
            ))}
            {skills.length === 0 && (
              <span className="text-sm text-muted-foreground italic">
                No {title.toLowerCase()} added yet
              </span>
            )}
          </div>
        </div>
        {stepError && <p className="text-xs text-destructive">{stepError}</p>}
      </CardContent>
    </Card>
  );
}
