ALTER TABLE "prospectly"."recruitment_job_pricing" ADD COLUMN "int_payout_waits_probation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_pricing" ADD COLUMN "ext_payout_waits_probation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD COLUMN "hire_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_transactions" ADD COLUMN "transaction_type" varchar(30) DEFAULT 'interview_cost' NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD COLUMN "cancellation_reason" varchar(30);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_connectors" ADD COLUMN "classification_type" varchar(20);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_connectors" ADD COLUMN "is_active_employee" boolean;--> statement-breakpoint
CREATE INDEX "idx_interview_txn_type" ON "prospectly"."recruitment_interview_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_interview_txn_candidate_type" ON "prospectly"."recruitment_interview_transactions" USING btree ("candidate_id","transaction_type") WHERE deleted_at IS NULL;