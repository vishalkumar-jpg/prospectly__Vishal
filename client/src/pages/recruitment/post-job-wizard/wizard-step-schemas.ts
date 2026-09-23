import { z } from "zod";
import { SALARY_CURRENCIES } from "@/lib/salary-currency";
import {
  CONNECTOR_PAYOUT_WAIT_MAX_DAYS,
  PAYMENT_MAX_CAP,
  PROBATION_MAX_DAYS,
  SALARY_MAX_CAP,
  SALARY_NOTES_MAX,
  SUCCESS_FEE_MAX,
} from "./constants";
import { richTextLength } from "@/lib/rich-text";
import { isCentPrecise } from "@/lib/formatted-decimal";

export const JOB_FIELD_LIMITS = {
  title: { min: 5, max: 255 },
  companyName: { min: 5, max: 255 },
  location: { min: 5, max: 255 },
  companyWebsite: { max: 500 },
  sourceUrl: { max: 2000 },
  description: { min: 50, max: 5000 },
  requirements: { min: 50, max: 5000 },
  responsibilities: { min: 50, max: 5000 },
  benefits: { min: 50, max: 5000 },
  skill: { min: 1, max: 50 },
  requiredSkills: { minArray: 1, maxArray: 50 },
  preferredSkills: { minArray: 0, maxArray: 50 },
} as const;

// Type for the long-form Job Description fields (rendered in the Description accordion)
export type JobDescriptionFieldKey =
  | "description"
  | "requirements"
  | "responsibilities"
  | "benefits";

const nonEmptyTrimmed = (field: string) =>
  z.string().refine((v) => v.trim().length > 0, `${field} is required`);

export const methodStepSchema = z.object({
  creationMethod: z.enum(["url", "pdf", "manual"], {
    message: "Please select a creation method",
  }),
});

const payoutCountryCodeSchema = z.enum(["US", "IN", "PH", "MX", "ZA"]);

function countriesFieldSchema(requireAtLeastOne: boolean) {
  const base = z.array(payoutCountryCodeSchema);
  return requireAtLeastOne ? base.min(1, "Select at least one country") : base;
}

export function makeDetailsStepSchema(requireCountries = true) {
  return z.object({
    title: z
      .string()
      .refine((v) => v.trim().length > 0, "Job title is required")
      .refine(
        (v) => v.trim().length >= JOB_FIELD_LIMITS.title.min,
        `Job title must be at least ${JOB_FIELD_LIMITS.title.min} characters`
      )
      .refine(
        (v) => v.trim().length <= JOB_FIELD_LIMITS.title.max,
        `Job title must be at most ${JOB_FIELD_LIMITS.title.max} characters`
      ),
    companyName: z
      .string()
      .refine((v) => v.trim().length > 0, "Company name is required")
      .refine(
        (v) => v.trim().length >= JOB_FIELD_LIMITS.companyName.min,
        `Company name must be at least ${JOB_FIELD_LIMITS.companyName.min} characters`
      )
      .refine(
        (v) => v.trim().length <= JOB_FIELD_LIMITS.companyName.max,
        `Company name must be at most ${JOB_FIELD_LIMITS.companyName.max} characters`
      ),
    experienceLevel: nonEmptyTrimmed("Experience level"),
    industry: nonEmptyTrimmed("Industry"),
    department: nonEmptyTrimmed("Department"),
    workType: nonEmptyTrimmed("Work type"),
    // Optional: a posting whose terms are not settled is left blank, not guessed.
    employmentType: z.string().optional(),
    location: z
      .string()
      .refine((v) => v.trim().length > 0, "Location is required")
      .refine(
        (v) => v.trim().length >= JOB_FIELD_LIMITS.location.min,
        `Location must be at least ${JOB_FIELD_LIMITS.location.min} characters`
      )
      .refine(
        (v) => v.trim().length <= JOB_FIELD_LIMITS.location.max,
        `Location must be at most ${JOB_FIELD_LIMITS.location.max} characters`
      ),
    countries: countriesFieldSchema(requireCountries),
  });
}

export const detailsStepSchema = makeDetailsStepSchema(true);

export const skillItemSchema = z
  .string()
  .trim()
  .min(
    JOB_FIELD_LIMITS.skill.min,
    `Each skill must be at least ${JOB_FIELD_LIMITS.skill.min} character`
  )
  .max(
    JOB_FIELD_LIMITS.skill.max,
    `Each skill must be at most ${JOB_FIELD_LIMITS.skill.max} characters`
  );

export const skillsStepSchema = z.object({
  requiredSkills: z
    .array(skillItemSchema)
    .min(
      JOB_FIELD_LIMITS.requiredSkills.minArray,
      `Add at least ${JOB_FIELD_LIMITS.requiredSkills.minArray} required skill`
    )
    .max(
      JOB_FIELD_LIMITS.requiredSkills.maxArray,
      `Maximum ${JOB_FIELD_LIMITS.requiredSkills.maxArray} required skills`
    ),
  // Preferred skills are optional — only the max cap applies.
  preferredSkills: z
    .array(skillItemSchema)
    .max(
      JOB_FIELD_LIMITS.preferredSkills.maxArray,
      `Maximum ${JOB_FIELD_LIMITS.preferredSkills.maxArray} preferred skills`
    ),
});

// Rich-text fields store HTML — validate the visible text length, not markup.
const requiredTextArea = (
  field: string,
  limits: { min: number; max: number }
) =>
  z
    .string()
    .refine((v) => richTextLength(v) > 0, `${field} is required`)
    .refine(
      (v) => richTextLength(v) >= limits.min,
      `${field} must be at least ${limits.min} characters`
    )
    .refine(
      (v) => richTextLength(v) <= limits.max,
      `${field} must be at most ${limits.max} characters`
    );

const optionalTextArea = (
  field: string,
  limits: { min: number; max: number }
) =>
  z
    .string()
    .refine(
      (v) => richTextLength(v) === 0 || richTextLength(v) >= limits.min,
      `${field} must be at least ${limits.min} characters if provided`
    )
    .refine(
      (v) => richTextLength(v) <= limits.max,
      `${field} must be at most ${limits.max} characters`
    );

export const descriptionStepSchema = z.object({
  description: requiredTextArea("Description", JOB_FIELD_LIMITS.description),
  requirements: requiredTextArea("Requirements", JOB_FIELD_LIMITS.requirements),
  responsibilities: optionalTextArea(
    "Responsibilities",
    JOB_FIELD_LIMITS.responsibilities
  ),
  benefits: optionalTextArea("Benefits", JOB_FIELD_LIMITS.benefits),
});

/**
 * Budget & Pricing step. Salary range is optional ("both-or-neither"); the Flat
 * Referral Fee is required. Stripe/application/publish fees are computed
 * server-side and are never validated here.
 */
export const budgetStepSchema = z
  .object({
    salaryCurrency: z.enum(SALARY_CURRENCIES),
    // Salary range is optional (0 = not provided). Cross-field "both-or-neither"
    // rules are enforced in superRefine below.
    salaryRangeMin: z
      .number()
      .min(0)
      .max(
        SALARY_MAX_CAP,
        `Maximum salary is ${SALARY_MAX_CAP.toLocaleString()}`
      ),
    salaryRangeMax: z
      .number()
      .min(0)
      .max(
        SALARY_MAX_CAP,
        `Maximum salary is ${SALARY_MAX_CAP.toLocaleString()}`
      ),
    flatReferralAmount: z.number(),
    salaryRangeNotes: z
      .string()
      .max(
        SALARY_NOTES_MAX,
        `Notes must be at most ${SALARY_NOTES_MAX} characters`
      )
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Salary range is optional, but "both-or-neither": if one bound is entered
    // the other becomes required, and when both are present max must exceed min.
    const hasMin = data.salaryRangeMin > 0;
    const hasMax = data.salaryRangeMax > 0;
    if (hasMin && !hasMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryRangeMax"],
        message: "Maximum salary is required",
      });
    } else if (hasMax && !hasMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryRangeMin"],
        message: "Minimum salary is required",
      });
    } else if (hasMin && hasMax && data.salaryRangeMax <= data.salaryRangeMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryRangeMax"],
        message: "Maximum salary must be greater than minimum salary",
      });
    }

    if (
      !Number.isFinite(data.flatReferralAmount) ||
      data.flatReferralAmount < 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["flatReferralAmount"],
        message: "Flat Referral Fee is required",
      });
    } else if (!isCentPrecise(data.flatReferralAmount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["flatReferralAmount"],
        message: "Enter at most 2 decimal places",
      });
    } else if (data.flatReferralAmount > PAYMENT_MAX_CAP) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["flatReferralAmount"],
        message: `Maximum Flat Referral Fee is $${PAYMENT_MAX_CAP.toLocaleString()}`,
      });
    }
  });

/**
 * Success Fees step. When the recruiter opts in, the fee amount must be
 * present and within bounds. The probation period is optional — when supplied
 * it must not exceed PROBATION_MAX_DAYS. When opted out, the other fields are
 * ignored — they're stripped from the create payload.
 */
export const successFeesStepSchema = z
  .object({
    hasSuccessFee: z.boolean(),
    successFeeAmount: z.number(),
    probationPeriodDays: z.number().int(),
  })
  .superRefine((data, ctx) => {
    if (!data.hasSuccessFee) return;

    if (!Number.isFinite(data.successFeeAmount) || data.successFeeAmount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["successFeeAmount"],
        message: "Success Fee Amount is required",
      });
    } else if (!isCentPrecise(data.successFeeAmount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["successFeeAmount"],
        message: "Enter at most 2 decimal places",
      });
    } else if (data.successFeeAmount > SUCCESS_FEE_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["successFeeAmount"],
        message: `Maximum Success Fee Amount is $${SUCCESS_FEE_MAX.toLocaleString()}`,
      });
    }

    if (
      Number.isFinite(data.probationPeriodDays) &&
      data.probationPeriodDays > PROBATION_MAX_DAYS
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["probationPeriodDays"],
        message: `Maximum Probation Period is ${PROBATION_MAX_DAYS} days`,
      });
    }
  });

/**
 * Connector Payout step. Connector payout timing is independent of the success
 * fee, and each connector type has its own toggle + waiting period. When a type
 * is set to wait, a positive waiting period (days from hire date) is required
 * for that type.
 */
export const connectorPayoutStepSchema = z
  .object({
    intPayoutWaits: z.boolean(),
    extPayoutWaits: z.boolean(),
    intConnectorPayoutWaitDays: z.number().int(),
    extConnectorPayoutWaitDays: z.number().int(),
  })
  .superRefine((data, ctx) => {
    const validate = (waits: boolean, days: number, path: string) => {
      if (!waits) return;
      if (!Number.isFinite(days) || days < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [path],
          message: "Enter the number of days connectors must wait",
        });
      } else if (days > CONNECTOR_PAYOUT_WAIT_MAX_DAYS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [path],
          message: `Maximum waiting period is ${CONNECTOR_PAYOUT_WAIT_MAX_DAYS} days`,
        });
      }
    };
    validate(
      data.intPayoutWaits,
      data.intConnectorPayoutWaitDays,
      "intConnectorPayoutWaitDays"
    );
    validate(
      data.extPayoutWaits,
      data.extConnectorPayoutWaitDays,
      "extConnectorPayoutWaitDays"
    );
  });

/** Assessment step limits (mirror the server caps). */
export const ASSESSMENT_QUESTION_TEXT_MAX = 500;
export const ASSESSMENT_MAX_QUESTIONS = 30;

/**
 * Assessment step. The whole section is optional — when `hasAssessment` is
 * false the step is always valid. When enabled, at least one question is
 * required and every question needs non-empty, in-bounds text.
 */
export const assessmentStepSchema = z
  .object({
    hasAssessment: z.boolean(),
    assessmentQuestions: z.array(
      z
        .object({
          questionText: z.string(),
          isRequired: z.boolean(),
        })
        .passthrough()
    ),
  })
  .superRefine((data, ctx) => {
    if (!data.hasAssessment) return;

    if (data.assessmentQuestions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assessmentQuestions"],
        message: "Add at least one question, or turn off the assessment",
      });
      return;
    }

    if (data.assessmentQuestions.length > ASSESSMENT_MAX_QUESTIONS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assessmentQuestions"],
        message: `You can add at most ${ASSESSMENT_MAX_QUESTIONS} questions`,
      });
    }

    data.assessmentQuestions.forEach((q, index) => {
      const text = q.questionText.trim();
      if (text.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assessmentQuestions"],
          message: `Question ${index + 1} needs text`,
        });
      } else if (text.length > ASSESSMENT_QUESTION_TEXT_MAX) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assessmentQuestions"],
          message: `Question ${index + 1} must be at most ${ASSESSMENT_QUESTION_TEXT_MAX} characters`,
        });
      }
    });
  });

/** Max organisations a recruiter can target in one notification (mirrors the server cap). */
export const MAX_NOTIFY_ORGANISATIONS = 50;

/**
 * Notify step. Opting in requires at least one organisation. When opted out,
 * `organisationIds` is ignored and stripped from the create payload.
 */
export const notifyStepSchema = z
  .object({
    notifyUsers: z.boolean(),
    organisationIds: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (!data.notifyUsers) return;
    if (data.organisationIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organisationIds"],
        message: "Select at least one organization to notify",
      });
    } else if (data.organisationIds.length > MAX_NOTIFY_ORGANISATIONS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organisationIds"],
        message: `You can select at most ${MAX_NOTIFY_ORGANISATIONS} organizations`,
      });
    }
  });
