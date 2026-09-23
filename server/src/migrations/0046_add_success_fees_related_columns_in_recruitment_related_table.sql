ALTER TABLE "prospectly"."recruitment_job_pricing" RENAME COLUMN "stripe_fee" TO "provider_fee";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD COLUMN "probation_period_days" integer;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_pricing" ADD COLUMN "has_success_fee" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_pricing" ADD COLUMN "success_fee_amount" numeric(10, 2);