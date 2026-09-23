import { useState, useCallback, type KeyboardEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  clampSalaryInteger,
  formatSalaryInteger,
} from "@/lib/formatted-integer";
import { getSalaryCurrencySymbol } from "@/lib/salary-currency";
import { SALARY_MAX_CAP, BLOCKED_KEYS } from "../constants";
import type { JobFormData, UpdateJobFormData } from "../types";

interface JobDetailsSalaryFieldsProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
}

export function JobDetailsSalaryFields({
  formData,
  updateFormData,
}: JobDetailsSalaryFieldsProps) {
  const [errors, setErrors] = useState<{
    salaryRangeMin?: string;
    salaryRangeMax?: string;
  }>({});

  const blockInvalidKeys = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_KEYS.includes(e.key)) e.preventDefault();
  }, []);

  const handleSalaryChange = useCallback(
    (field: "salaryRangeMin" | "salaryRangeMax", raw: string) => {
      const value = clampSalaryInteger(raw, SALARY_MAX_CAP);
      if (value === null) return;

      const newMin =
        field === "salaryRangeMin" ? value : formData.salaryRangeMin;
      const newMax =
        field === "salaryRangeMax" ? value : formData.salaryRangeMax;

      const newErrors: typeof errors = {};

      if (newMin <= 0) {
        newErrors.salaryRangeMin = "Minimum salary is required";
      }
      if (newMin > 0 && newMax <= 0) {
        newErrors.salaryRangeMax = "Maximum salary is required";
      } else if (newMax > 0 && newMax <= newMin) {
        newErrors.salaryRangeMax = "Must be greater than minimum salary";
      }

      setErrors(newErrors);
      updateFormData({ [field]: value });
    },
    [formData.salaryRangeMin, formData.salaryRangeMax, updateFormData]
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="salary-min">Salary Min</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {getSalaryCurrencySymbol(formData.salaryCurrency)}
          </span>
          <Input
            id="salary-min"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={formatSalaryInteger(
              formData.salaryRangeMin,
              formData.salaryCurrency
            )}
            onKeyDown={blockInvalidKeys}
            onChange={(e) =>
              handleSalaryChange("salaryRangeMin", e.target.value)
            }
            className={cn(
              "pl-8",
              errors.salaryRangeMin && "border-destructive"
            )}
          />
        </div>
        {errors.salaryRangeMin && (
          <p className="text-xs text-destructive">{errors.salaryRangeMin}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="salary-max">Salary Max</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {getSalaryCurrencySymbol(formData.salaryCurrency)}
          </span>
          <Input
            id="salary-max"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={formatSalaryInteger(
              formData.salaryRangeMax,
              formData.salaryCurrency
            )}
            onKeyDown={blockInvalidKeys}
            onChange={(e) =>
              handleSalaryChange("salaryRangeMax", e.target.value)
            }
            className={cn(
              "pl-8",
              errors.salaryRangeMax && "border-destructive"
            )}
          />
        </div>
        {errors.salaryRangeMax && (
          <p className="text-xs text-destructive">{errors.salaryRangeMax}</p>
        )}
      </div>
    </div>
  );
}
