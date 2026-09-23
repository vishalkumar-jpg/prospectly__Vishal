CREATE TABLE "prospectly"."recruitment_interview_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"recruiter_id" uuid NOT NULL,
	"connector_user_id" uuid,
	"bounty_amount" numeric(10, 2) NOT NULL,
	"stripe_fee" numeric(10, 2) NOT NULL,
	"processing_fee" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"intent_id" varchar(100),
	"payment_method_id" varchar(100),
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"charge_amount" numeric(10, 2),
	"receipt_url" text,
	"payment_error" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_transactions" ADD CONSTRAINT "recruitment_interview_transactions_candidate_id_recruitment_job_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "prospectly"."recruitment_job_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_transactions" ADD CONSTRAINT "recruitment_interview_transactions_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_transactions" ADD CONSTRAINT "recruitment_interview_transactions_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_transactions" ADD CONSTRAINT "recruitment_interview_transactions_connector_user_id_users_id_fk" FOREIGN KEY ("connector_user_id") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_transactions" ADD CONSTRAINT "recruitment_interview_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_transactions" ADD CONSTRAINT "recruitment_interview_transactions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_interview_txn_candidate_id" ON "prospectly"."recruitment_interview_transactions" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_interview_txn_job_id" ON "prospectly"."recruitment_interview_transactions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_interview_txn_intent_id" ON "prospectly"."recruitment_interview_transactions" USING btree ("intent_id");--> statement-breakpoint
CREATE INDEX "idx_interview_txn_status" ON "prospectly"."recruitment_interview_transactions" USING btree ("status");