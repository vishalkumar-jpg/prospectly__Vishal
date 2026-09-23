import { z } from "zod";
import { sanitizeInput } from "@/utils/security";

export const editContactSchema = z.object({
  firstName: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (!val || val.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "First name is required",
        });
        return;
      }
      if (val.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "First name must be between 1 and 50 characters",
        });
        return;
      }
      if (val.length > 50) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "First name must be between 1 and 50 characters",
        });
        return;
      }
    })
    .transform(sanitizeInput),
  lastName: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (!val || val.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Last name is required",
        });
        return;
      }
      if (val.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Last name must be between 1 and 50 characters",
        });
        return;
      }
      if (val.length > 50) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Last name must be between 1 and 50 characters",
        });
        return;
      }
    })
    .transform(sanitizeInput),
  email: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      // Allow empty string - skip validation
      if (!val || val === "") {
        return;
      }
      // Check email format using Zod's standard email validation
      const emailParse = z.string().email().safeParse(val);
      if (!emailParse.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Email must be a valid email address",
        });
        return;
      }
    })
    .transform((val) => (val ? sanitizeInput(val) : val)),
  company: z
    .string()
    .trim()
    .refine((val) => val === "" || val.length <= 50, {
      message: "Company must not exceed 50 characters",
    })
    .transform((val) => (val ? sanitizeInput(val) : val)),
  title: z
    .string()
    .trim()
    .refine((val) => val === "" || val.length <= 50, {
      message: "Title must not exceed 50 characters",
    })
    .transform((val) => (val ? sanitizeInput(val) : val)),
  linkedin: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      // Allow empty string - skip validation
      if (!val || val === "") {
        return;
      }
      // Check max length first
      if (val.length > 255) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "LinkedIn URL must not exceed 255 characters",
        });
        return;
      }
      // Check URL format
      const urlParse = z.string().url().safeParse(val);
      if (!urlParse.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "LinkedIn URL must be a valid URL",
        });
        return;
      }
      // Check for linkedin.com domain
      if (!val.toLowerCase().includes("linkedin.com")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "LinkedIn URL must contain linkedin.com",
        });
        return;
      }
    })
    .transform((val) => (val ? sanitizeInput(val) : val)),
});

export type EditContactFormData = z.infer<typeof editContactSchema>;
