ALTER TABLE "prospectly"."recruitment_payout_history" RENAME COLUMN "connector_user_id" TO "recipient_id";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" RENAME COLUMN "connector_amount" TO "recipient_amount";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" RENAME COLUMN "connector_stripe_account_id" TO "recipient_payment_account_id";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" RENAME COLUMN "stripe_transfer_id" TO "transfer_id";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" RENAME COLUMN "stripe_payout_id" TO "external_payout_id";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" DROP CONSTRAINT "recruitment_payout_history_connector_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" DROP CONSTRAINT "recruitment_payout_history_candidate_id_recruitment_job_candidates_id_fk";
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" DROP CONSTRAINT "recruitment_payout_history_interview_transaction_id_recruitment_interview_transactions_id_fk";
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" DROP CONSTRAINT "recruitment_payout_history_interview_meeting_id_recruitment_interview_meetings_id_fk";
--> statement-breakpoint
DROP INDEX "prospectly"."uq_recruitment_payout_candidate_job_connector";--> statement-breakpoint
DROP INDEX "prospectly"."idx_recruitment_payout_candidate_id";--> statement-breakpoint
DROP INDEX "prospectly"."idx_recruitment_payout_connector_user_id";--> statement-breakpoint
DROP INDEX "prospectly"."idx_recruitment_payout_status";--> statement-breakpoint
DROP INDEX "prospectly"."idx_recruitment_payout_processing_status";--> statement-breakpoint
DROP INDEX "prospectly"."idx_recruitment_payout_stripe_transfer";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ALTER COLUMN "interview_transaction_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ALTER COLUMN "interview_meeting_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD COLUMN "payout_type" varchar(20) DEFAULT 'connector' NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD COLUMN "currency" varchar(10) DEFAULT 'usd' NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_candidate_id_recruitment_job_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "prospectly"."recruitment_job_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_interview_transaction_id_recruitment_interview_transactions_id_fk" FOREIGN KEY ("interview_transaction_id") REFERENCES "prospectly"."recruitment_interview_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD CONSTRAINT "recruitment_payout_history_interview_meeting_id_recruitment_interview_meetings_id_fk" FOREIGN KEY ("interview_meeting_id") REFERENCES "prospectly"."recruitment_interview_meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_recruitment_payout_candidate_job_recipient" ON "prospectly"."recruitment_payout_history" USING btree ("candidate_id","job_id","recipient_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_recipient_id" ON "prospectly"."recruitment_payout_history" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_status_active" ON "prospectly"."recruitment_payout_history" USING btree ("status") WHERE status != 'completed' AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_processing_active" ON "prospectly"."recruitment_payout_history" USING btree ("processing_status") WHERE processing_status NOT IN ('completed', 'failed') AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_deferred" ON "prospectly"."recruitment_payout_history" USING btree ("recipient_id","processing_status") WHERE deleted_at IS NULL AND processing_status = 'onboarding_pending';--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_transfer" ON "prospectly"."recruitment_payout_history" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_external_payout" ON "prospectly"."recruitment_payout_history" USING btree ("external_payout_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_type" ON "prospectly"."recruitment_payout_history" USING btree ("payout_type");