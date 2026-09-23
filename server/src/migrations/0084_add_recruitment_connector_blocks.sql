CREATE TABLE IF NOT EXISTS "prospectly"."recruitment_connector_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_email_hash" varchar(64) NOT NULL,
	"connector_user_id" uuid NOT NULL,
	"contact_id" bigint,
	"reason" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_connector_blocks" ADD CONSTRAINT "unique_recruitment_connector_block_email_connector" UNIQUE("candidate_email_hash","connector_user_id");--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_connector_blocks" ADD CONSTRAINT "recruitment_connector_blocks_connector_user_id_users_id_fk" FOREIGN KEY ("connector_user_id") REFERENCES "prospectly"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_connector_blocks" ADD CONSTRAINT "recruitment_connector_blocks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "prospectly"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recruitment_connector_blocks_connector" ON "prospectly"."recruitment_connector_blocks" USING btree ("connector_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recruitment_connector_blocks_email_hash" ON "prospectly"."recruitment_connector_blocks" USING btree ("candidate_email_hash");
