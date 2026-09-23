ALTER TABLE "introduction_feedback" ALTER COLUMN "introduction_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "introduction_feedback" ALTER COLUMN "feedback_from_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "introduction_feedback" ALTER COLUMN "feedback_to_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "introduction_potential_connectors" ALTER COLUMN "request_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "introduction_potential_connectors" ALTER COLUMN "potential_connector_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_meetings" ALTER COLUMN "requester_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_imports" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscription" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_transactions" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_transactions" ALTER COLUMN "subscription_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "referral_audit_log" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_credit_history" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "introduction_fulfillment_attempts" ALTER COLUMN "introduction_request_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "introduction_fulfillment_attempts" ALTER COLUMN "connector_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace_shares" ALTER COLUMN "sharer_id" DROP NOT NULL;