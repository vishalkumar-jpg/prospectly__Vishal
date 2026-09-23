import { z } from "zod";
import type { JobFormData } from "./types";
import {
  assessmentStepSchema,
  connectorPayoutStepSchema,
  descriptionStepSchema,
  detailsStepSchema,
  makeDetailsStepSchema,
  budgetStepSchema,
  methodStepSchema,
  notifyStepSchema,
  skillsStepSchema,
  successFeesStepSchema,
} from "./wizard-step-schemas";

export type StepErrors = Record<string, string>;

/** Options passed to step validation. */
export interface StepValidationOptions {
  /** When false, countries are optional on the details step. */
  requireCountries?: boolean;
}

function collectZodStepErrors(result: {
  success: false;
  error: z.ZodError;
}): StepErrors {
  const errors: StepErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field && typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

function findFieldIssueMessage({
  issues,
  fieldName,
}: {
  issues: z.ZodIssue[];
  fieldName: string;
}): string | undefined {
  for (const issue of issues) {
    const f = issue.path[0];
    if (typeof f === "string" && f === fieldName) {
      return issue.message;
    }
  }
  return undefined;
}

function getBudgetFieldError({
  fieldName,
  formData,
}: {
  fieldName: string;
  formData: JobFormData;
}): string | undefined {
  const result = budgetStepSchema.safeParse({
    salaryCurrency: formData.salaryCurrency,
    salaryRangeMin: formData.salaryRangeMin,
    salaryRangeMax: formData.salaryRangeMax,
    flatReferralAmount: formData.flatReferralAmount,
    salaryRangeNotes: formData.salaryRangeNotes,
  });
  if (result.success) return undefined;
  return findFieldIssueMessage({
    issues: result.error.issues,
    fieldName,
  });
}

function getSuccessFeesFieldError({
  fieldName,
  formData,
}: {
  fieldName: string;
  formData: JobFormData;
}): string | undefined {
  const result = successFeesStepSchema.safeParse({
    hasSuccessFee: formData.hasSuccessFee,
    successFeeAmount: formData.successFeeAmount,
    probationPeriodDays: formData.probationPeriodDays,
  });
  if (result.success) return undefined;
  return findFieldIssueMessage({
    issues: result.error.issues,
    fieldName,
  });
}

function getConnectorPayoutFieldError({
  fieldName,
  formData,
}: {
  fieldName: string;
  formData: JobFormData;
}): string | undefined {
  const result = connectorPayoutStepSchema.safeParse({
    intPayoutWaits: formData.intPayoutWaits,
    extPayoutWaits: formData.extPayoutWaits,
    intConnectorPayoutWaitDays: formData.intConnectorPayoutWaitDays,
    extConnectorPayoutWaitDays: formData.extConnectorPayoutWaitDays,
  });
  if (result.success) return undefined;
  return findFieldIssueMessage({
    issues: result.error.issues,
    fieldName,
  });
}

const SCHEMA_FIELD_STEP_MAP: Record<string, z.ZodObject<z.ZodRawShape>> = {
  method: methodStepSchema,
  details: detailsStepSchema,
  skills: skillsStepSchema,
  description: descriptionStepSchema,
};

function getSchemaFieldError({
  stepName,
  fieldName,
  formData,
  options,
}: {
  stepName: string;
  fieldName: string;
  formData: JobFormData;
  options?: StepValidationOptions;
}): string | undefined {
  const schema =
    stepName === "details"
      ? makeDetailsStepSchema(options?.requireCountries !== false)
      : SCHEMA_FIELD_STEP_MAP[stepName];
  if (!schema) return undefined;

  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const fieldSchema = shape[fieldName];
  if (!fieldSchema) return undefined;

  const value = (formData as unknown as Record<string, unknown>)[fieldName];
  const result = fieldSchema.safeParse(value);
  if (result.success) return undefined;
  return result.error.issues[0]?.message;
}

/**
 * Validate a wizard step against its Zod schema.
 * Returns a `Record<fieldName, errorMessage>` — empty object means valid.
 */
function resolveStepValidationSchema({
  stepName,
  options,
}: {
  stepName: string;
  options?: StepValidationOptions;
}): z.ZodType | null {
  if (stepName === "payment" || stepName === "confirm") return null;
  if (stepName === "method") return methodStepSchema;
  if (stepName === "details") {
    return makeDetailsStepSchema(options?.requireCountries !== false);
  }
  if (stepName === "skills") return skillsStepSchema;
  if (stepName === "description") return descriptionStepSchema;
  if (stepName === "budget") return budgetStepSchema;
  if (stepName === "connectorPayout") return connectorPayoutStepSchema;
  if (stepName === "successFees") return successFeesStepSchema;
  if (stepName === "notify") return notifyStepSchema;
  if (stepName === "assessment") return assessmentStepSchema;
  return null;
}

export function validateStep(
  stepName: string,
  formData: JobFormData,
  options?: StepValidationOptions
): StepErrors {
  const schema = resolveStepValidationSchema({ stepName, options });
  if (!schema) return {};

  const result = schema.safeParse(formData);
  if (result.success) return {};
  return collectZodStepErrors(result);
}

/**
 * First Zod error message for a single field on a step (same schemas as validateStep).
 * Budget uses full-object parse so cross-field rules (max > min) match Continue.
 */
function resolveStepFieldError({
  stepName,
  fieldName,
  formData,
  options,
}: {
  stepName: string;
  fieldName: string;
  formData: JobFormData;
  options?: StepValidationOptions;
}): string | undefined {
  if (stepName === "budget") {
    return getBudgetFieldError({ fieldName, formData });
  }
  if (stepName === "successFees") {
    return getSuccessFeesFieldError({ fieldName, formData });
  }
  if (stepName === "connectorPayout") {
    return getConnectorPayoutFieldError({ fieldName, formData });
  }
  return getSchemaFieldError({ stepName, fieldName, formData, options });
}

export function getStepFieldError(
  stepName: string,
  fieldName: string,
  formData: JobFormData,
  options?: StepValidationOptions
): string | undefined {
  return resolveStepFieldError({ stepName, fieldName, formData, options });
}
