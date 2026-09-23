import { z } from "zod";

const DISPOSABLE_EMAIL_DOMAINS: readonly string[] = [
  "mailinator.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "fakeinbox.com",
  "getnada.com",
  "maildrop.cc",
  "sharklasers.com",
  "dispostable.com",
  "mintemail.com",
];

export const consentCandidateEmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .refine(
    (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    "Please enter a valid email"
  )
  .refine((email) => {
    const domain = email.toLowerCase().split("@")[1];
    return domain ? !DISPOSABLE_EMAIL_DOMAINS.includes(domain) : false;
  }, "Disposable email addresses are not allowed");

const uploadedFileSchema = z.object({
  clientId: z.string().min(1),
  fileName: z.string().min(1),
  filePath: z.string().min(1, "File still uploading"),
  mimeType: z.string().min(1),
  fileType: z.string().min(1),
  size: z.number().nonnegative(),
  email: consentCandidateEmailSchema,
});

export const connectorResumeUploadSchema = z
  .object({
    files: z
      .array(uploadedFileSchema)
      .min(1, "Select at least one resume")
      .max(10, "Maximum 10 resumes per upload"),
    piiConsent: z.boolean().refine((v) => v === true, {
      message: "Confirmation is required",
    }),
  })
  .superRefine((data, ctx) => {
    const seen = new Map<string, number>();
    data.files.forEach((file, index) => {
      const normalized = file.email.trim().toLowerCase();
      if (!normalized) return;
      if (seen.has(normalized)) {
        const firstIdx = seen.get(normalized)!;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["files", index, "email"],
          message: "Duplicate email in this upload",
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["files", firstIdx, "email"],
          message: "Duplicate email in this upload",
        });
      } else {
        seen.set(normalized, index);
      }
    });
  });

export type ConnectorResumeUploadFormValues = z.infer<
  typeof connectorResumeUploadSchema
>;
