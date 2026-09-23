import { z } from "zod";
import { OUTCOME_VALUES } from "@/constants/interview-outcomes";

export const interviewOutcomeSchema = z
  .object({
    outcome: z.enum(OUTCOME_VALUES, {
      required_error: "Please select an outcome",
    }),
    comment: z.string().max(500, "Comment must be 500 characters or less").default(""),
  })
  .superRefine((data, ctx) => {
    if (
      (data.outcome === "no_show" || data.outcome === "cancelled") &&
      !data.comment.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide a reason",
        path: ["comment"],
      });
    }
  });

export type InterviewOutcomeFormValues = z.infer<typeof interviewOutcomeSchema>;
