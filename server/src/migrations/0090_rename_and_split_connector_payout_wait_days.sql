ALTER TABLE "prospectly"."recruitment_job_prices" RENAME COLUMN "int_payout_waits_period" TO "int_payout_waits";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" RENAME COLUMN "ext_payout_waits_period" TO "ext_payout_waits";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" RENAME COLUMN "connector_payout_wait_days" TO "int_connector_payout_wait_days";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" ADD COLUMN "ext_connector_payout_wait_days" integer;