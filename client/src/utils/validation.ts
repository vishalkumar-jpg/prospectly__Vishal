import { z } from "zod";
import { sanitizeInput, isValidEmail, isValidPhone } from "./security";

// Base validation schemas
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .transform(sanitizeInput)
  .refine(isValidEmail, "Invalid email format");

export const phoneSchema = z
  .string()
  .optional()
  .refine((val) => !val || isValidPhone(val), "Invalid phone number format")
  .transform((val) => (val ? sanitizeInput(val) : val));

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .transform(sanitizeInput)
  .refine((val) => !/[<>]/.test(val), "Name cannot contain special characters");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/(?=.*[a-z])/, "Password must contain at least one lowercase letter")
  .regex(/(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
  .regex(/(?=.*\d)/, "Password must contain at least one number")
  .regex(
    /(?=.*[@$!%*?&])/,
    "Password must contain at least one special character"
  );

// Bank account validation schemas
export const bankAccountNameSchema = z
  .string()
  .min(1, "Account name is required")
  .max(50, "Account name must be less than 50 characters")
  .transform(sanitizeInput)
  .refine(
    (val) => !/[<>]/.test(val),
    "Account name cannot contain special characters"
  );

export const bankNameSchema = z
  .string()
  .min(1, "Bank name is required")
  .max(100, "Bank name must be less than 100 characters")
  .transform(sanitizeInput)
  .refine(
    (val) => !/[<>]/.test(val),
    "Bank name cannot contain special characters"
  );

export const accountNumberSchema = z
  .string()
  .min(4, "Account number must be at least 4 digits")
  .max(20, "Account number must be less than 20 digits")
  .regex(/^\d+$/, "Account number must contain only digits");

export const routingNumberSchema = z
  .string()
  .length(9, "Routing number must be exactly 9 digits")
  .regex(/^\d{9}$/, "Routing number must contain only digits");

export const bankAccountSchema = z.object({
  name: bankAccountNameSchema,
  bankName: bankNameSchema,
  accountNumber: accountNumberSchema,
  routingNumber: routingNumberSchema,
  accountType: z.enum(["checking", "savings"]),
});

// Chat/Message validation schemas
export const messageSchema = z
  .string()
  .min(1, "Message cannot be empty")
  .max(1000, "Message must be less than 1000 characters")
  .transform(sanitizeInput)
  .refine((val) => !/[<>]/.test(val), "Message cannot contain HTML tags");

export const titleSchema = z
  .string()
  .min(1, "Title is required")
  .max(200, "Title must be less than 200 characters")
  .transform(sanitizeInput)
  .refine(
    (val) => !/[<>]/.test(val),
    "Title cannot contain special characters"
  );

// Contact validation schemas
export const contactEmailSchema = emailSchema;

export const contactPhoneSchema = phoneSchema;

export const contactNameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .transform(sanitizeInput)
  .refine((val) => !/[<>]/.test(val), "Name cannot contain special characters");

export const linkedinUrlSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || val.includes("linkedin.com"),
    "Must be a valid LinkedIn URL"
  )
  .transform((val) => (val ? sanitizeInput(val) : val));

export const contactSchema = z.object({
  firstName: contactNameSchema,
  lastName: contactNameSchema,
  email: contactEmailSchema,
  phone: contactPhoneSchema,
  linkedin: linkedinUrlSchema,
  company: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeInput(val) : val)),
  title: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeInput(val) : val)),
});

// Admin validation schemas
export const adminEmailSchema = emailSchema;

export const adminPasswordSchema = passwordSchema;

export const adminRoleSchema = z.enum(["admin", "moderator", "user"]);

// Campaign validation schemas
export const campaignNameSchema = z
  .string()
  .min(1, "Campaign name is required")
  .max(100, "Campaign name must be less than 100 characters")
  .transform(sanitizeInput)
  .refine(
    (val) => !/[<>]/.test(val),
    "Campaign name cannot contain special characters"
  );

export const campaignDescriptionSchema = z
  .string()
  .optional()
  .transform((val) => (val ? sanitizeInput(val) : val))
  .refine(
    (val) => !val || !/[<>]/.test(val),
    "Description cannot contain HTML tags"
  );

// Estimated value / Referral payout validation schema
export const estimatedValueSchema = z.string().refine((val) => {
  if (val === "") return true;
  return /^\d+(\.\d+)?$/.test(val) && !val.endsWith(".");
}, "Invalid Estimated value");

// Referral payout validation schema (strict: whole numbers only, >= 10, <= 999999)
export const bountyAmountSchema = z
  .string()
  .min(1, "Please enter a referral payout amount.")
  .refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num);
  }, "Please enter a valid number.")
  .refine((val) => {
    const num = parseFloat(val);
    return Number.isInteger(num);
  }, "Referral payout amount must be a whole number (no decimals allowed).")
  .refine((val) => {
    const num = parseFloat(val);
    return num >= 10;
  }, "Referral payout amount must be at least $10.")
  .refine((val) => {
    const num = parseFloat(val);
    return num <= 999999;
  }, "Referral payout amount cannot exceed $999,999.");

// Domain validation schema
// Supports multi-level TLDs like .co.in, .co.uk, .com.au
export const domainSchema = z
  .string()
  .trim()
  .min(1, "Domain is required")
  .regex(
    /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/,
    "Please enter a valid domain name"
  );

// Generic sanitized string schema
export const sanitizedStringSchema = (minLength = 0, maxLength = 500) =>
  z
    .string()
    .min(minLength, `Minimum ${minLength} characters required`)
    .max(maxLength, `Maximum ${maxLength} characters allowed`)
    .transform(sanitizeInput)
    .refine((val) => !/[<>]/.test(val), "Cannot contain HTML tags");

// Validation helper functions
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        errors: result.error.issues.map((err) => err.message),
      };
    }
  } catch {
    return {
      success: false,
      errors: ["Validation failed: Invalid input format"],
    };
  }
}

export function validateForm<T>(
  schema: z.ZodSchema<T>,
  formData: Record<string, unknown>
):
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> } {
  try {
    const result = schema.safeParse(formData);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const fieldErrors: Record<string, string[]> = {};
      result.error.issues.forEach((err) => {
        const field = err.path.join(".");
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(err.message);
      });
      return { success: false, errors: fieldErrors };
    }
  } catch {
    return {
      success: false,
      errors: { general: ["Validation failed: Invalid form data"] },
    };
  }
}
