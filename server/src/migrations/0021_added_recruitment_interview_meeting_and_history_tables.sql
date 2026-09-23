CREATE TABLE "prospectly"."recruitment_interview_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"recruiter_id" uuid NOT NULL,
	"candidate_user_id" uuid NOT NULL,
	"meeting_date" timestamp with time zone,
	"meeting_duration" integer DEFAULT 30,
	"meeting_platform" varchar(30),
	"meeting_link" text,
	"calendar_event_id" varchar(255),
	"calendar_provider" varchar(30),
	"status" varchar(30) DEFAULT 'invite_sent' NOT NULL,
	"interview_notes" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "prospectly"."recruitment_interview_meeting_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"previous_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"performed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_workflow" ADD COLUMN "interview_booking_token" varchar(500);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_workflow" ADD COLUMN "interview_booking_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meetings" ADD CONSTRAINT "recruitment_interview_meetings_candidate_id_recruitment_job_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "prospectly"."recruitment_job_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meetings" ADD CONSTRAINT "recruitment_interview_meetings_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meetings" ADD CONSTRAINT "recruitment_interview_meetings_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meetings" ADD CONSTRAINT "recruitment_interview_meetings_candidate_user_id_users_id_fk" FOREIGN KEY ("candidate_user_id") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meetings" ADD CONSTRAINT "recruitment_interview_meetings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meetings" ADD CONSTRAINT "recruitment_interview_meetings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meeting_history" ADD CONSTRAINT "recruitment_interview_meeting_history_meeting_id_recruitment_interview_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "prospectly"."recruitment_interview_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meeting_history" ADD CONSTRAINT "recruitment_interview_meeting_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_interview_meeting_candidate_id" ON "prospectly"."recruitment_interview_meetings" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_interview_meeting_job_id" ON "prospectly"."recruitment_interview_meetings" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_interview_meeting_recruiter_id" ON "prospectly"."recruitment_interview_meetings" USING btree ("recruiter_id");--> statement-breakpoint
CREATE INDEX "idx_interview_meeting_status" ON "prospectly"."recruitment_interview_meetings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_interview_meeting_history_meeting_id" ON "prospectly"."recruitment_interview_meeting_history" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_interview_meeting_history_event_type" ON "prospectly"."recruitment_interview_meeting_history" USING btree ("event_type");