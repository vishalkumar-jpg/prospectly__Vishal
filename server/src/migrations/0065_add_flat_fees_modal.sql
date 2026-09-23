ALTER TABLE "prospectly"."recruitment_job_prices" ADD COLUMN "pricing_model" varchar(20) DEFAULT 'per_interview' NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" ADD COLUMN "flat_referral_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" ADD COLUMN "flat_publish_fee_percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" ADD COLUMN "flat_charged_at_publish_amount" numeric(10, 2);