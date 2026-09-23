import { z } from "zod";

export const businessProfileSchema = z.object({
  products: z
    .string()
    .trim()
    .max(500, "Products must not exceed 500 characters")
    .optional()
    .or(z.literal("")),
  uniqueSellingProposition: z
    .string()
    .trim()
    .max(300, "Unique selling proposition must not exceed 300 characters")
    .optional()
    .or(z.literal("")),
  targetMarket: z
    .string()
    .trim()
    .max(300, "Target market must not exceed 300 characters")
    .optional()
    .or(z.literal("")),
  companySize: z.string().trim().optional().or(z.literal("")),
  revenueRange: z.string().trim().optional().or(z.literal("")),
  keyCredentials: z
    .string()
    .trim()
    .max(800, "Key credentials must not exceed 800 characters")
    .optional()
    .or(z.literal("")),
});

export type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;
