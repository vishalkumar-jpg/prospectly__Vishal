ALTER TABLE "prospectly"."recruitment_job_prices" RENAME COLUMN "int_payout_waits_probation" TO "int_payout_waits_period";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" RENAME COLUMN "ext_payout_waits_probation" TO "ext_payout_waits_period";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" ADD COLUMN "connector_payout_wait_days" integer;