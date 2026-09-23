CREATE TABLE IF NOT EXISTS "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_request_id" uuid NOT NULL,
	"filed_by_user_id" uuid NOT NULL,
	"dispute_type" text NOT NULL,
	"dispute_category" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"expected_outcome" text,
	"evidence_urls" text[],
	"disputed_amount" numeric(10, 2),
	"requested_refund_amount" numeric(10, 2),
	"against_user_id" uuid,
	"resolution_notes" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_action" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_introduction_request_id_introduction_requests_id_fk') THEN
        ALTER TABLE "disputes" ADD CONSTRAINT "disputes_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_filed_by_user_id_users_id_fk') THEN
        ALTER TABLE "disputes" ADD CONSTRAINT "disputes_filed_by_user_id_users_id_fk" FOREIGN KEY ("filed_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_against_user_id_users_id_fk') THEN
        ALTER TABLE "disputes" ADD CONSTRAINT "disputes_against_user_id_users_id_fk" FOREIGN KEY ("against_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_resolved_by_users_id_fk') THEN
        ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_disputes_introduction_request" ON "disputes" USING btree ("introduction_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_disputes_filed_by_user" ON "disputes" USING btree ("filed_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_disputes_against_user" ON "disputes" USING btree ("against_user_id");--> statement-breakpoint