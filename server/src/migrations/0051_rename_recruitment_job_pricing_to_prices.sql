ALTER TABLE "prospectly"."recruitment_job_pricing" RENAME TO "recruitment_job_prices";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" DROP CONSTRAINT "recruitment_job_pricing_job_id_recruitment_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" DROP CONSTRAINT "recruitment_job_pricing_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" DROP CONSTRAINT "recruitment_job_pricing_updated_by_users_id_fk";
--> statement-breakpoint
DROP INDEX "prospectly"."idx_recruitment_job_pricing_job_id";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" ADD CONSTRAINT "recruitment_job_prices_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" ADD CONSTRAINT "recruitment_job_prices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_prices" ADD CONSTRAINT "recruitment_job_prices_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recruitment_job_prices_job_id" ON "prospectly"."recruitment_job_prices" USING btree ("job_id");