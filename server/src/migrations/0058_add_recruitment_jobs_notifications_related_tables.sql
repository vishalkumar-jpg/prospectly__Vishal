CREATE TABLE "prospectly"."recruitment_job_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"notify_on_create" boolean DEFAULT false NOT NULL,
	"organisation_ids" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "prospectly"."recruitment_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_settings" ADD CONSTRAINT "recruitment_job_settings_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_settings" ADD CONSTRAINT "recruitment_job_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_settings" ADD CONSTRAINT "recruitment_job_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_notifications" ADD CONSTRAINT "recruitment_notifications_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_notifications" ADD CONSTRAINT "recruitment_notifications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_notifications" ADD CONSTRAINT "recruitment_notifications_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recruitment_job_settings_job_id" ON "prospectly"."recruitment_job_settings" USING btree ("job_id") WHERE "prospectly"."recruitment_job_settings"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recruitment_notifications_job_type" ON "prospectly"."recruitment_notifications" USING btree ("job_id","type") WHERE "prospectly"."recruitment_notifications"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_recruitment_notifications_job_id" ON "prospectly"."recruitment_notifications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_notifications_status" ON "prospectly"."recruitment_notifications" USING btree ("status");