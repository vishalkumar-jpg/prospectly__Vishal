import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Briefcase, Building2, MapPin, Target, Globe } from "lucide-react";
import {
  useIndustries,
  useDepartments,
} from "@/hooks/useRecruitmentMasterData";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, WORK_TYPES } from "./constants";
import {
  JOB_FIELD_LIMITS,
  getStepFieldError,
  type StepErrors,
} from "./validation";
import type { JobFormData, UpdateJobFormData } from "./types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import CountryMultiSelect from "@/pages/recruitment/components/CountryMultiSelect";

interface DetailsStepProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  /** Read-only (e.g. view closed job): all fields non-interactive */
  readOnly?: boolean;
  stepErrors?: StepErrors;
  onUpdateStepFieldError?: (field: string, message: string | undefined) => void;
  requireCountries?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function DetailsStep({
  formData,
  updateFormData,
  readOnly = false,
  stepErrors = {},
  onUpdateStepFieldError,
  requireCountries = true,
}: DetailsStepProps) {
  // Edit mode keeps these editable; only view (readOnly) locks them.
  const selectLocked = readOnly;
  const cardPickLocked = readOnly;
  const [industrySearch, setIndustrySearch] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const debouncedIndustrySearch = useDebounce(industrySearch, 300);
  const debouncedDepartmentSearch = useDebounce(departmentSearch, 300);

  const { industries, loading: industriesLoading } = useIndustries(
    debouncedIndustrySearch
  );
  const { departments, loading: departmentsLoading } = useDepartments(
    debouncedDepartmentSearch
  );

  /** On field change, update value and live-validate this field (Zod) */
  const handleFieldChange = (
    field: string,
    value: string | string[] | Partial<JobFormData>
  ) => {
    const update =
      typeof value === "string" || Array.isArray(value)
        ? { [field]: value }
        : value;
    updateFormData(update);
    const prospective = { ...formData, ...update } as JobFormData;
    const msg = getStepFieldError("details", field, prospective, {
      requireCountries,
    });
    onUpdateStepFieldError?.(field, msg);
  };

  return (
    <div className="space-y-6">
      <div className="mb-4 text-left sm:mb-6 lg:mb-8">
        <h2 className="text-2xl font-extrabold text-foreground">Job Details</h2>
        <p className="mt-2 text-muted-foreground">
          Define the position you&apos;re hiring for
        </p>
      </div>

      <div className="w-full space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-amethyst" />
            Company Name <span className="text-brand-rose">*</span>
          </Label>
          <Input
            placeholder="e.g., Acme Corporation"
            value={formData.companyName}
            onChange={(e) => handleFieldChange("companyName", e.target.value)}
            maxLength={JOB_FIELD_LIMITS.companyName.max}
            readOnly={readOnly}
            disabled={readOnly}
            className={cn(
              "h-12 border-input bg-background focus:border-brand-amethyst",
              stepErrors.companyName &&
                "border-destructive focus:border-destructive"
            )}
          />
          {stepErrors.companyName ? (
            <p className="text-xs text-destructive">{stepErrors.companyName}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {JOB_FIELD_LIMITS.companyName.min}–
              {JOB_FIELD_LIMITS.companyName.max} characters
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-brand-amethyst" />
            Job Title <span className="text-brand-rose">*</span>
          </Label>
          <Input
            placeholder="e.g., Senior Software Engineer"
            value={formData.title}
            onChange={(e) => handleFieldChange("title", e.target.value)}
            maxLength={JOB_FIELD_LIMITS.title.max}
            readOnly={readOnly}
            disabled={readOnly}
            className={cn(
              "h-12 border-input bg-background focus:border-brand-amethyst",
              stepErrors.title && "border-destructive focus:border-destructive"
            )}
          />
          {stepErrors.title ? (
            <p className="text-xs text-destructive">{stepErrors.title}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {JOB_FIELD_LIMITS.title.min}–{JOB_FIELD_LIMITS.title.max}{" "}
              characters
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Industry <span className="text-brand-rose">*</span>
            </Label>
            <SearchableSelect
              value={formData.industry}
              onValueChange={(v) => {
                handleFieldChange("industry", v);
              }}
              items={industries}
              loading={industriesLoading}
              placeholder="Select industry"
              searchPlaceholder="Search industries..."
              searchValue={industrySearch}
              onSearchChange={setIndustrySearch}
              error={stepErrors.industry}
              disabled={selectLocked}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Department <span className="text-brand-rose">*</span>
            </Label>
            <SearchableSelect
              value={formData.department}
              onValueChange={(v) => {
                handleFieldChange("department", v);
              }}
              items={departments}
              loading={departmentsLoading}
              placeholder="Select department"
              searchPlaceholder="Search departments..."
              searchValue={departmentSearch}
              onSearchChange={setDepartmentSearch}
              error={stepErrors.department}
              disabled={selectLocked}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4 text-brand-amethyst" />
              Experience Level <span className="text-brand-rose">*</span>
            </Label>
            <Select
              value={formData.experienceLevel || undefined}
              onValueChange={(v) => handleFieldChange("experienceLevel", v)}
              disabled={cardPickLocked}
            >
              <SelectTrigger
                className={cn(
                  "h-12",
                  stepErrors.experienceLevel &&
                    "border-destructive focus:border-destructive"
                )}
                aria-invalid={stepErrors.experienceLevel ? true : undefined}
              >
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label} ({level.years})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stepErrors.experienceLevel && (
              <p className="text-xs text-destructive mt-1">
                {stepErrors.experienceLevel}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-brand-amethyst" />
              Work Type <span className="text-brand-rose">*</span>
            </Label>
            <Select
              value={formData.workType || undefined}
              onValueChange={(v) => handleFieldChange("workType", v)}
              disabled={cardPickLocked}
            >
              <SelectTrigger
                className={cn(
                  "h-12",
                  stepErrors.workType &&
                    "border-destructive focus:border-destructive"
                )}
                aria-invalid={stepErrors.workType ? true : undefined}
              >
                <SelectValue placeholder="Select work type" />
              </SelectTrigger>
              <SelectContent>
                {WORK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                    <span className="text-muted-foreground">
                      {" "}
                      — {type.description}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stepErrors.workType && (
              <p className="text-xs text-destructive mt-1">
                {stepErrors.workType}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-brand-amethyst" />
              Employment Type
            </Label>
            <Select
              value={formData.employmentType || undefined}
              onValueChange={(v) => handleFieldChange("employmentType", v)}
              disabled={cardPickLocked}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select employment type" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                    <span className="text-muted-foreground">
                      {" "}
                      — {type.description}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Optional. Leave blank if the terms are not settled yet.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2 min-w-0">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-amethyst" />
              Location <span className="text-brand-rose">*</span>
            </Label>
            <Input
              placeholder="San Francisco, CA or Remote (US)"
              value={formData.location}
              onChange={(e) => handleFieldChange("location", e.target.value)}
              maxLength={JOB_FIELD_LIMITS.location.max}
              readOnly={readOnly}
              disabled={readOnly}
              className={cn(
                "h-12 w-full min-w-0 border-input bg-background text-sm focus:border-brand-amethyst",
                stepErrors.location &&
                  "border-destructive focus:border-destructive"
              )}
            />
            {stepErrors.location ? (
              <p className="text-xs text-destructive">{stepErrors.location}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {JOB_FIELD_LIMITS.location.min}–{JOB_FIELD_LIMITS.location.max}{" "}
                characters
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-brand-amethyst" />
              Country <span className="text-brand-rose">*</span>
            </Label>
            <CountryMultiSelect
              value={formData.countries}
              onChange={(codes) => handleFieldChange("countries", codes)}
              disabled={readOnly}
              hasError={!!stepErrors.countries}
            />
            {stepErrors.countries ? (
              <p className="text-xs text-destructive">{stepErrors.countries}</p>
            ) : formData.countries.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Select one or more countries for this role
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
