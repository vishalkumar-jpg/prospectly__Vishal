CREATE TABLE "prospectly"."recruitment_email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"email_type" varchar(50) NOT NULL,
	"provider_id" varchar(100),
	"recipient_email" varchar(255) NOT NULL,
	"subject" varchar(255),
	"email_body" text,
	"status" varchar(30) DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"detail_at" timestamp with time zone,
	"detail_type" varchar(50),
	"detail_reason" text,
	"event_type" varchar(50),
	"event_at" timestamp with time zone,
	"raw_events" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_email_logs" ADD CONSTRAINT "recruitment_email_logs_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_email_logs" ADD CONSTRAINT "recruitment_email_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_email_logs" ADD CONSTRAINT "recruitment_email_logs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_recruitment_email_logs_job_id" ON "prospectly"."recruitment_email_logs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_email_logs_status" ON "prospectly"."recruitment_email_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_recruitment_email_logs_job_status" ON "prospectly"."recruitment_email_logs" USING btree ("job_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_recruitment_email_logs_provider_id" ON "prospectly"."recruitment_email_logs" USING btree ("provider_id");