ALTER TABLE "prospectly"."payout_history" ADD COLUMN "recipient_received_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "prospectly"."payout_history" ADD COLUMN "payout_fee_breakdown" jsonb;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD COLUMN "recipient_received_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD COLUMN "payout_fee_breakdown" jsonb;