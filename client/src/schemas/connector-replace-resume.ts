import { z } from "zod";
import { getApplyJobResumeFieldError } from "@/schemas/recruitment-apply-job";

export const connectorReplaceResumeSchema = z.object({
  resumeFile: z.custom<File | undefined>().superRefine((val, ctx) => {
    if (val === undefined || !(val instanceof File)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Resume is required",
      });
      return;
    }
    const fieldError = getApplyJobResumeFieldError(val);
    if (fieldError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: fieldError,
      });
    }
  }),
  piiConsent: z.boolean().refine((val) => val === true, {
    message: "Please confirm you have permission to share this resume.",
  }),
});

export type ConnectorReplaceResumeFormValues = z.infer<
  typeof connectorReplaceResumeSchema
>;
