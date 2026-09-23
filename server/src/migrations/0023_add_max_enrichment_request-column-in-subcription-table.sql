ALTER TABLE "prospectly"."subscription_plan" ADD COLUMN "max_enrichment_request" integer;--> statement-breakpoint
ALTER TABLE "prospectly"."users" ADD COLUMN "max_enrichment_request" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_users_max_enrichment_request" ON "prospectly"."users" USING btree ("max_enrichment_request");