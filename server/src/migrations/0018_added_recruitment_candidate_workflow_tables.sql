CREATE TABLE "prospectly"."recruitment_candidate_workflow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"rejected_at" timestamp with time zone,
	"rejection_category" varchar(100),
	"rejection_note" varchar(500),
	"requester_shortlisted" boolean,
	"requester_shortlisted_at" timestamp with time zone,
	"interview_scheduled_at" timestamp with time zone,
	"interview_meeting_link" varchar(500),
	"interview_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "unique_recruitment_candidate_workflow_candidate" UNIQUE("candidate_id")
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_workflow" ADD CONSTRAINT "recruitment_candidate_workflow_candidate_id_recruitment_job_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "prospectly"."recruitment_job_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_workflow" ADD CONSTRAINT "recruitment_candidate_workflow_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_workflow" ADD CONSTRAINT "recruitment_candidate_workflow_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_recruitment_candidate_workflow_candidate_id" ON "prospectly"."recruitment_candidate_workflow" USING btree ("candidate_id");