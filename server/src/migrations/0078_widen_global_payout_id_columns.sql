ALTER TABLE "prospectly"."payout_history" ALTER COLUMN "recipient_account_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "prospectly"."payout_history" ALTER COLUMN "stripe_outbound_payment_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "prospectly"."users" ALTER COLUMN "stripe_recipient_account_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "prospectly"."users" ALTER COLUMN "stripe_payout_method_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ALTER COLUMN "recipient_account_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ALTER COLUMN "stripe_outbound_payment_id" SET DATA TYPE varchar(255);