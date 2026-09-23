import { pgSchema } from "drizzle-orm/pg-core";

/**
 * Custom schema definition for Prospectly application.
 * Using a custom schema instead of 'public' improves security by preventing
 * broad PUBLIC role permissions that could lead to privilege escalation.
 */
export const prospectlySchema = pgSchema("prospectly");
