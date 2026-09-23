import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPERIENCE_LEVELS, WORK_TYPES, EMPLOYMENT_TYPES } from "../constants";
import type { JobFormData, UpdateJobFormData } from "../types";

interface JobDetailsMetadataFieldsProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
}

export function JobDetailsMetadataFields({
  formData,
  updateFormData,
}: JobDetailsMetadataFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor="experience-level">Experience Level</Label>
        <Select
          value={formData.experienceLevel}
          onValueChange={(v) => updateFormData({ experienceLevel: v })}
        >
          <SelectTrigger id="experience-level">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_LEVELS.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="work-type">Work Type</Label>
        <Select
          value={formData.workType}
          onValueChange={(v) => updateFormData({ workType: v })}
        >
          <SelectTrigger id="work-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORK_TYPES.map((w) => (
              <SelectItem key={w.value} value={w.value}>
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="employment-type">Employment Type</Label>
        <Select
          value={formData.employmentType || ""}
          onValueChange={(v) => updateFormData({ employmentType: v })}
        >
          <SelectTrigger id="employment-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="job-location">Location</Label>
        <Input
          id="job-location"
          value={formData.location}
          onChange={(e) => updateFormData({ location: e.target.value })}
        />
      </div>
    </div>
  );
}
