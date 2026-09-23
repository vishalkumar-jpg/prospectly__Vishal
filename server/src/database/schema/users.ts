import {
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  varchar,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";

export const users = prospectlySchema.table(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    firstName: varchar("first_name", { length: 50 }),
    lastName: varchar("last_name", { length: 50 }),
    fullName: varchar("full_name", { length: 100 }),
    password: varchar("password"),
    type: text("type").notNull().default("user"),
    bio: text("bio"),
    company: varchar("company", { length: 150 }),
    jobTitle: varchar("job_title", { length: 100 }),
    linkedinUrl: varchar("linkedin_url", { length: 255 }),
    profilePhotoUrl: text("profile_photo_url"),
    location: varchar("location", { length: 100 }),
    industry: varchar("industry", { length: 100 }),
    phone: varchar("phone", { length: 30 }),
    websiteUrl: varchar("website_url", { length: 255 }),
    // Business profile fields
    products: text("products"),
    uniqueSellingProposition: text("unique_selling_proposition"),
    targetMarket: text("target_market"),
    companySize: text("company_size"),
    revenueRange: text("revenue_range"),
    keyCredentials: text("key_credentials"),
    isVerified: boolean("is_verified").default(false),
    isActive: boolean("is_active").default(true),
    stripeCustomerId: varchar("stripe_customer_id", { length: 50 }),
    stripePrimaryPaymentMethodId: varchar("stripe_primary_payment_method_id", {
      length: 50,
    }),
    // Stripe Global Payouts recipient account (v2 Accounts API, `acct_…`).
    // v2 ids (esp. test mode `*_test_*`) can be long — keep generous length.
    stripeRecipientAccountId: varchar("stripe_recipient_account_id", {
      length: 255,
    }),
    // Default payout method (local bank account) on the recipient account.
    stripePayoutMethodId: varchar("stripe_payout_method_id", {
      length: 255,
    }),
    // True once the `bank_accounts.local` capability is active (onboarding done).
    stripeRecipientOnboardingComplete: boolean(
      "stripe_recipient_onboarding_complete"
    ).default(false),
    // ISO 3166-1 alpha-2 payout country (US, IN, PH, MX, ZA). Drives the
    // recipient's local settlement currency for Global Payouts.
    country: varchar("country", { length: 2 }),
    // Recipient's local payout currency (uppercase ISO 4217), derived from country.
    payoutCurrency: varchar("payout_currency", { length: 3 }),
    trustScore: integer("trust_score").default(0),
    creditBalance: numeric("credit_balance", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    maxConcurrentRequests: integer("max_concurrent_requests")
      .default(1)
      .notNull(),
    maxEnrichmentRequest: integer("max_enrichment_request")
      .default(2)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastLoginAt: timestamp("last_login_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    maxConcurrentRequestsIdx: index("idx_users_max_concurrent_requests").on(
      table.maxConcurrentRequests
    ),
    maxEnrichmentRequestIdx: index("idx_users_max_enrichment_request").on(
      table.maxEnrichmentRequest
    ),
    countryIdx: index("idx_users_country").on(table.country),
    /** pg_trgm GIN for contact listing search on original importer `ILIKE` (requires extension pg_trgm). */
    searchFullNameTrgmIdx: index("idx_users_search_full_name_gin_trgm")
      .using("gin", table.fullName.op("gin_trgm_ops"))
      .where(sql`deleted_at IS NULL`),
  })
);

export type User = typeof users.$inferSelect;
