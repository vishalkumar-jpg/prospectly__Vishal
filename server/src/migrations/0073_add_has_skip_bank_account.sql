ALTER TABLE "prospectly"."user_configurations" ADD COLUMN "has_skip_bank_account" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "prospectly"."user_configurations" SET "has_skip_bank_account" = false;
