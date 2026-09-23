import { z } from "zod";

const RESUME_MIME_TYPES = [
  "application/pdf",
] as const;

const linkedinProfileUrlFormatSchema = z
  .string()
  .trim()
  .url("Please enter a valid URL")
  .refine(
    (url) => {
      try {
        const { hostname, pathname } = new URL(url);
        return (
          (hostname === "linkedin.com" || hostname === "www.linkedin.com") &&
          (pathname.startsWith("/in/") || pathname.startsWith("/pub/"))
        );
      } catch {
        return false;
      }
    },
    "Please enter a valid LinkedIn profile URL"
  );

export const applyJobLinkedinUrlSchema = linkedinProfileUrlFormatSchema;

/** Trims input; returns first linkedinUrl field error or null when empty/valid. */
export function getApplyJobLinkedinFieldError(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const parsed = linkedinProfileUrlFormatSchema.safeParse(trimmed);
  if (parsed.success) return null;
  const issues = parsed.error.flatten().formErrors;
  return issues[0] ?? null;
}

const RESUME_MIME_LIST = RESUME_MIME_TYPES as readonly string[];

export const applyJobSchema = z.object({
  linkedinUrl: z.union([z.literal(""), linkedinProfileUrlFormatSchema]),
  resumeFile: z
    .custom<File | undefined>(
      (val) => val === undefined || val instanceof File,
      { message: "Resume is required" }
    )
    .superRefine((val, ctx) => {
      if (val === undefined || !(val instanceof File)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Resume is required",
        });
        return;
      }
      if (val.size > 10 * 1024 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Resume must be under 10MB",
        });
      }
      if (!RESUME_MIME_LIST.includes(val.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please upload a PDF file",
        });
      }
    }),
});

export type ApplyJobFormValues = z.infer<typeof applyJobSchema>;

/** Returns first resumeFile field error message or undefined. */
export function getApplyJobResumeFieldError(file: File): string | undefined {
  const parsed = applyJobSchema.shape.resumeFile.safeParse(file);
  if (parsed.success) return undefined;
  return parsed.error.issues[0]?.message;
}
