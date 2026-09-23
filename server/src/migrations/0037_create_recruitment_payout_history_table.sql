CREATE TABLE "prospectly"."recruitment_payout_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"connector_user_id" uuid NOT NULL,
	"recruiter_id" uuid NOT NULL,
	"interview_transaction_id" uuid,
	"interview_meeting_id" uuid,
	"gross_amount" numeric(10, 2) NOT NULL,
	"connector_amount" numeric(10, 2) NOT NULL,
	"platform_amount" numeric(10, 2) NOT NULL,
	"connector_stripe_account_id" varchar(50),
	"stripe_transfer_id" varchar(50),
	"stripe_payout_id" varchar(50),
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"credits_applied" numeric(10, 2) DEFAULT '0' NOT NULL,
	"credits_remaining_after" numeric(10, 2) DEFAULT '0' NOT NULL,
	"commission_after_credits" numeric(10, 2) DEFAULT '0' NOT NULL,
	"processing_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"processing_started_at" timestamp with time zone,
	"processing_completed_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0,
	"last_retry_at" timestamp with time zone,
	"queue_job_id" varchar(100),
	"error_message" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meetings" ADD COLUMN "interview_outcome" varchar(30);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meetings" ADD COLUMN "interview_outcome_comment" text;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meetings" ADD COLUMN "interview_outcome_marked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meetings" ADD COLUMN "interview_outcome_marked_by" uuid;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_candidate_id_recruitment_job_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "prospectly"."recruitment_job_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_connector_user_id_users_id_fk" FOREIGN KEY ("connector_user_id") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_interview_transaction_id_recruitment_interview_transactions_id_fk" FOREIGN KEY ("interview_transaction_id") REFERENCES "prospectly"."recruitment_interview_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_interview_meeting_id_recruitment_interview_meetings_id_fk" FOREIGN KEY ("interview_meeting_id") REFERENCES "prospectly"."recruitment_interview_meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_recruitment_payout_candidate_job_connector" ON "prospectly"."recruitment_payout_history" USING btree ("candidate_id","job_id","connector_user_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_candidate_id" ON "prospectly"."recruitment_payout_history" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_job_id" ON "prospectly"."recruitment_payout_history" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_connector_user_id" ON "prospectly"."recruitment_payout_history" USING btree ("connector_user_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_status" ON "prospectly"."recruitment_payout_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_processing_status" ON "prospectly"."recruitment_payout_history" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_stripe_transfer" ON "prospectly"."recruitment_payout_history" USING btree ("stripe_transfer_id");--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_meetings" ADD CONSTRAINT "recruitment_interview_meetings_interview_outcome_marked_by_users_id_fk" FOREIGN KEY ("interview_outcome_marked_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;