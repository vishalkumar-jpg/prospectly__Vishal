import { z } from "zod";
import { JOB_FIELD_LIMITS, JobDescriptionFieldKey } from "./wizard-step-schemas";
export {
  JOB_FIELD_LIMITS,
} from "./wizard-step-schemas";
export type { JobDescriptionFieldKey } from "./wizard-step-schemas";
export {
  budgetStepSchema,
  descriptionStepSchema,
  detailsStepSchema,
  methodStepSchema,
  skillItemSchema,
  skillsStepSchema,
} from "./wizard-step-schemas";
export {
  getStepFieldError,
  validateStep,
  type StepErrors,
} from "./wizard-validation-helpers";

export const JOB_EXTRACTION_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
export const JOB_EXTRACTION_ALLOWED_MIMETYPES = [
  "application/pdf",
];
export const JOB_EXTRACTION_ALLOWED_EXTENSIONS = [".pdf"];

export const jobExtractionFileSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size <= JOB_EXTRACTION_MAX_SIZE,
    "File too large. Please upload a file smaller than 5MB."
  )
  .refine(
    (file) => JOB_EXTRACTION_ALLOWED_MIMETYPES.includes(file.type),
    "Invalid file type. Please upload a PDF file."
  );

/** Matches server ExtractJobFromUrlDto: max length + http/https URL. Empty after trim is valid (no inline error). */
export const jobExtractionUrlInputSchema = z
  .string()
  .trim()
  .max(
    JOB_FIELD_LIMITS.sourceUrl.max,
    `URL may be at most ${JOB_FIELD_LIMITS.sourceUrl.max.toLocaleString()} characters`
  )
  .superRefine((val, ctx) => {
    if (val.length === 0) return;
    try {
      const u = new URL(val);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "URL must start with http:// or https://",
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid URL (e.g. https://example.com/jobs/...)",
      });
    }
  });

export function getJobExtractionUrlInputError(raw: string): string | undefined {
  if (!raw.trim()) return undefined;
  const result = jobExtractionUrlInputSchema.safeParse(raw);
  if (!result.success) return result.error.issues[0]?.message;
  return undefined;
}

export function formatCharCount(current: number, max: number): string {
  return `${current.toLocaleString()} / ${max.toLocaleString()}`;
}

export function isNearLimit(current: number, max: number): boolean {
  return current / max > 0.9;
}

export function isOverLimit(current: number, max: number): boolean {
  return current > max;
}
