CREATE TABLE "prospectly"."recruitment_job_price_change_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"job_price_id" uuid NOT NULL,
	"field_key" varchar(50) NOT NULL,
	"old_value" numeric(10, 2),
	"new_value" numeric(10, 2),
	"snapshot" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_price_change_history" ADD CONSTRAINT "recruitment_job_price_change_history_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_price_change_history" ADD CONSTRAINT "recruitment_job_price_change_history_job_price_id_recruitment_job_prices_id_fk" FOREIGN KEY ("job_price_id") REFERENCES "prospectly"."recruitment_job_prices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_price_change_history" ADD CONSTRAINT "recruitment_job_price_change_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_price_change_history" ADD CONSTRAINT "recruitment_job_price_change_history_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_price_change_history_job_id" ON "prospectly"."recruitment_job_price_change_history" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_price_change_history_field_key" ON "prospectly"."recruitment_job_price_change_history" USING btree ("field_key");