CREATE TABLE "prospectly"."recruitment_bounty_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"salary_min" numeric(12, 2) NOT NULL,
	"salary_max" numeric(12, 2) NOT NULL,
	"salary_period" varchar(20) DEFAULT 'yearly' NOT NULL,
	"bounty_amount" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
