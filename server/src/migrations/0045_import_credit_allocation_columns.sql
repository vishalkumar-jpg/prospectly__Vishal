ALTER TABLE "prospectly"."user_credit_awards" ADD COLUMN "contacts_at_award" integer;--> statement-breakpoint
UPDATE "prospectly"."user_credit_awards" SET "contacts_at_award" = "enriched_contacts_at_award" WHERE "contacts_at_award" IS NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."user_credit_awards" ALTER COLUMN "contacts_at_award" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."user_credit_awards" DROP COLUMN "enriched_contacts_at_award";--> statement-breakpoint