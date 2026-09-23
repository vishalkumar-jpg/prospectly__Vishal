import { z } from "zod";
import { isValidPhone } from "../utils/security";
import { PAYOUT_COUNTRIES } from "@/lib/stripe-connect";

const PAYOUT_COUNTRY_VALUES = PAYOUT_COUNTRIES.map((c) => c.value) as [
  string,
  ...string[],
];

// Zod schema matching backend UpdateProfileInformationDto validation rules
export const profileInformationSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .min(2, "First name must be between 2 and 50 characters")
    .max(50, "First name must be between 2 and 50 characters")
    .regex(
      /^[A-Za-z\s'-]+$/,
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    ),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .min(2, "Last name must be between 2 and 50 characters")
    .max(50, "Last name must be between 2 and 50 characters")
    .regex(
      /^[A-Za-z\s'-]+$/,
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    ),
  jobTitle: z
    .string()
    .trim()
    .max(50, "Job title must not exceed 50 characters")
    .optional()
    .or(z.literal("")),
  company: z
    .string()
    .trim()
    .max(50, "Company name must not exceed 50 characters")
    .optional()
    .or(z.literal("")),
  industry: z
    .string()
    .trim()
    .max(100, "Industry must not exceed 100 characters")
    .optional()
    .or(z.literal("")),
  location: z
    .string()
    .trim()
    .max(50, "Location must not exceed 50 characters")
    .optional()
    .or(z.literal("")),
  country: z
    .string()
    .trim()
    .min(1, "Country is required")
    .refine(
      (val) => PAYOUT_COUNTRY_VALUES.includes(val),
      "Country must be one of: US, IN, PH, MX, ZA"
    ),
  bio: z
    .string()
    .trim()
    .max(500, "Professional bio must not exceed 500 characters")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(30, "Phone must not exceed 30 characters")
    .optional()
    .refine((val) => !val || isValidPhone(val), "Invalid phone number format")
    .or(z.literal("")),
  linkedinUrl: z
    .string()
    .trim()
    .max(255, "LinkedIn URL must not exceed 255 characters")
    .refine(
      (val) => !val || val === "" || z.string().url().safeParse(val).success,
      "LinkedIn URL must be a valid URL"
    )
    .optional()
    .or(z.literal("")),
  websiteUrl: z
    .string()
    .trim()
    .max(255, "Website URL must not exceed 255 characters")
    .refine(
      (val) => !val || val === "" || z.string().url().safeParse(val).success,
      "Website URL must be a valid URL"
    )
    .optional()
    .or(z.literal("")),
  isUserUnsubscribe: z.boolean().optional(),
});

export type ProfileInformationFormData = z.infer<
  typeof profileInformationSchema
>;
