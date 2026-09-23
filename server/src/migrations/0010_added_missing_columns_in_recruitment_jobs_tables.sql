ALTER TABLE "prospectly"."recruitment_jobs" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD COLUMN "creation_method" varchar(20) DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD COLUMN "company_website" varchar(500);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD CONSTRAINT "recruitment_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD CONSTRAINT "recruitment_jobs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;