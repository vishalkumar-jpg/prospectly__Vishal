import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Info, Lock, Sparkles, Star } from "lucide-react";
import { SKILL_SUGGESTIONS } from "./constants";
import {
  getStepFieldError,
  JOB_FIELD_LIMITS,
  type StepErrors,
} from "./validation";
import { useDepartments } from "@/hooks/useRecruitmentMasterData";
import type { JobFormData, UpdateJobFormData } from "./types";
import { SkillSuggestions } from "./components/SkillSuggestions";
import { SkillsCard } from "./components/SkillsCard";

interface SkillsStepProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  isEditMode?: boolean;
  readOnly?: boolean;
  stepErrors?: StepErrors;
  onUpdateStepFieldError?: (field: string, message: string | undefined) => void;
}

export default function SkillsStep({
  formData,
  updateFormData,
  isEditMode,
  readOnly = false,
  stepErrors = {},
  onUpdateStepFieldError,
}: SkillsStepProps) {
  // View mode stays read-only; edit mode allows skill updates (triggers rematch).
  const skillsLocked = readOnly;
  const { departments } = useDepartments();
  const [requiredInput, setRequiredInput] = useState("");
  const [preferredInput, setPreferredInput] = useState("");

  const addSkill = (skill: string, type: "required" | "preferred") => {
    const trimmed = skill.trim().slice(0, JOB_FIELD_LIMITS.skill.max);
    if (!trimmed) return;
    const list =
      type === "required" ? formData.requiredSkills : formData.preferredSkills;
    const maxArray =
      type === "required"
        ? JOB_FIELD_LIMITS.requiredSkills.maxArray
        : JOB_FIELD_LIMITS.preferredSkills.maxArray;
    if (list.length >= maxArray) return;
    const isDuplicate = list.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) return;
    if (type === "required") {
      const next = [...formData.requiredSkills, trimmed];
      updateFormData({ requiredSkills: next });
      const prospective = { ...formData, requiredSkills: next };
      onUpdateStepFieldError?.(
        "requiredSkills",
        getStepFieldError("skills", "requiredSkills", prospective)
      );
    } else {
      const next = [...formData.preferredSkills, trimmed];
      updateFormData({ preferredSkills: next });
      const prospective = { ...formData, preferredSkills: next };
      onUpdateStepFieldError?.(
        "preferredSkills",
        getStepFieldError("skills", "preferredSkills", prospective)
      );
    }
  };

  const removeSkill = (skill: string, type: "required" | "preferred") => {
    if (type === "required") {
      const next = formData.requiredSkills.filter((s) => s !== skill);
      updateFormData({ requiredSkills: next });
      const prospective = { ...formData, requiredSkills: next };
      onUpdateStepFieldError?.(
        "requiredSkills",
        getStepFieldError("skills", "requiredSkills", prospective)
      );
    } else {
      const next = formData.preferredSkills.filter((s) => s !== skill);
      updateFormData({ preferredSkills: next });
      const prospective = { ...formData, preferredSkills: next };
      onUpdateStepFieldError?.(
        "preferredSkills",
        getStepFieldError("skills", "preferredSkills", prospective)
      );
    }
  };

  const departmentSlug =
    departments.find((d) => String(d.id) === formData.department)?.slug || "";
  const suggestions =
    SKILL_SUGGESTIONS[departmentSlug] || SKILL_SUGGESTIONS.default;
  const allAdded = [...formData.requiredSkills, ...formData.preferredSkills];

  return (
    <div className="space-y-6">
      <div className="text-left mb-4 sm:mb-6 lg:mb-8">
        <h2 className="text-2xl font-extrabold text-foreground">
          Required &amp; Preferred Skills
          {skillsLocked && (
            <Badge variant="secondary" className="ml-2 text-xs align-middle">
              <Lock className="h-3 w-3 mr-1" />
              Read-only
            </Badge>
          )}
        </h2>
        <p className="text-muted-foreground mt-2">
          {skillsLocked
            ? "Skills cannot be modified after posting"
            : "Add at least 1 required skill to continue"}
        </p>
      </div>

      <div className="w-full space-y-6">
        {/* Required Skills */}
        <SkillsCard
          title="Required Skills"
          skills={formData.requiredSkills}
          onAddSkill={(skill) => addSkill(skill, "required")}
          onRemoveSkill={(skill) => removeSkill(skill, "required")}
          input={requiredInput}
          setInput={setRequiredInput}
          color="teal"
          icon={<Star className="h-4 w-4 text-brand-success shrink-0" />}
          maxArray={JOB_FIELD_LIMITS.requiredSkills.maxArray}
          stepError={stepErrors.requiredSkills}
          isEditMode={skillsLocked}
        />

        {/* Preferred Skills */}
        <SkillsCard
          title="Preferred Skills"
          skills={formData.preferredSkills}
          onAddSkill={(skill) => addSkill(skill, "preferred")}
          onRemoveSkill={(skill) => removeSkill(skill, "preferred")}
          input={preferredInput}
          setInput={setPreferredInput}
          color="cyan"
          icon={<Sparkles className="h-4 w-4 text-brand-sky shrink-0" />}
          maxArray={JOB_FIELD_LIMITS.preferredSkills.maxArray}
          stepError={stepErrors.preferredSkills}
          isEditMode={skillsLocked}
          isRequired={false}
        />

        {/* Suggestions */}
        {!skillsLocked && (
          <SkillSuggestions
            suggestions={suggestions}
            allAdded={allAdded}
            onAddSkill={addSkill}
            departmentName={
              departments.find((d) => String(d.id) === formData.department)
                ?.name
            }
          />
        )}
      </div>
    </div>
  );
}
