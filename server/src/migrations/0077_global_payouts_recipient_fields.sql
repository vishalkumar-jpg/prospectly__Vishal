DROP INDEX "prospectly"."idx_payout_history_stripe_transfer";--> statement-breakpoint
DROP INDEX "prospectly"."idx_payout_history_stripe_payout";--> statement-breakpoint
DROP INDEX "prospectly"."idx_recruitment_payout_transfer";--> statement-breakpoint
DROP INDEX "prospectly"."idx_recruitment_payout_external_payout";--> statement-breakpoint
ALTER TABLE "prospectly"."payout_history" ADD COLUMN "recipient_account_id" varchar(50);--> statement-breakpoint
ALTER TABLE "prospectly"."payout_history" ADD COLUMN "stripe_outbound_payment_id" varchar(50);--> statement-breakpoint
ALTER TABLE "prospectly"."payout_history" ADD COLUMN "destination_currency" varchar(3);--> statement-breakpoint
ALTER TABLE "prospectly"."users" ADD COLUMN "stripe_recipient_account_id" varchar(50);--> statement-breakpoint
ALTER TABLE "prospectly"."users" ADD COLUMN "stripe_payout_method_id" varchar(50);--> statement-breakpoint
ALTER TABLE "prospectly"."users" ADD COLUMN "stripe_recipient_onboarding_complete" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "prospectly"."users" ADD COLUMN "country" varchar(2);--> statement-breakpoint
ALTER TABLE "prospectly"."users" ADD COLUMN "payout_currency" varchar(3);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD COLUMN "recipient_account_id" varchar(50);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD COLUMN "stripe_outbound_payment_id" varchar(50);--> statement-breakpoint
CREATE INDEX "idx_payout_history_stripe_outbound_payment" ON "prospectly"."payout_history" USING btree ("stripe_outbound_payment_id");--> statement-breakpoint
CREATE INDEX "idx_users_country" ON "prospectly"."users" USING btree ("country");--> statement-breakpoint
CREATE INDEX "idx_recruitment_payout_outbound_payment" ON "prospectly"."recruitment_payout_history" USING btree ("stripe_outbound_payment_id");--> statement-breakpoint
ALTER TABLE "prospectly"."payout_history" DROP COLUMN "connector_stripe_account_id";--> statement-breakpoint
ALTER TABLE "prospectly"."payout_history" DROP COLUMN "stripe_transfer_id";--> statement-breakpoint
ALTER TABLE "prospectly"."payout_history" DROP COLUMN "stripe_payout_id";--> statement-breakpoint
ALTER TABLE "prospectly"."users" DROP COLUMN "stripe_connect_account_id";--> statement-breakpoint
ALTER TABLE "prospectly"."users" DROP COLUMN "stripe_connect_onboarding_complete";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" DROP COLUMN "recipient_payment_account_id";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" DROP COLUMN "transfer_id";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" DROP COLUMN "external_payout_id";