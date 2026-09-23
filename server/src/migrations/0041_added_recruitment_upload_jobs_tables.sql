CREATE TABLE "prospectly"."recruitment_upload_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"connector_user_id" uuid NOT NULL,
	"resume_media_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"status" varchar(30) DEFAULT 'queued' NOT NULL,
	"failure_reason" varchar(500),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"pool_match_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unique_upload_job_job_media" UNIQUE("job_id","resume_media_id")
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_upload_jobs" ADD CONSTRAINT "recruitment_upload_jobs_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_upload_jobs" ADD CONSTRAINT "recruitment_upload_jobs_connector_user_id_users_id_fk" FOREIGN KEY ("connector_user_id") REFERENCES "prospectly"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_upload_jobs" ADD CONSTRAINT "recruitment_upload_jobs_resume_media_id_media_id_fk" FOREIGN KEY ("resume_media_id") REFERENCES "prospectly"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_upload_jobs" ADD CONSTRAINT "recruitment_upload_jobs_pool_match_id_recruitment_job_pool_matches_id_fk" FOREIGN KEY ("pool_match_id") REFERENCES "prospectly"."recruitment_job_pool_matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_upload_jobs_connector_status" ON "prospectly"."recruitment_upload_jobs" USING btree ("connector_user_id","status");--> statement-breakpoint
CREATE INDEX "idx_upload_jobs_job_id" ON "prospectly"."recruitment_upload_jobs" USING btree ("job_id");