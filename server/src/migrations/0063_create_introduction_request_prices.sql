CREATE TABLE IF NOT EXISTS "prospectly"."introduction_request_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_request_id" uuid NOT NULL,
	"bounty_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"provider_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"processing_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "prospectly"."introduction_request_prices" ADD CONSTRAINT "introduction_request_prices_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "prospectly"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."introduction_request_prices" ADD CONSTRAINT "introduction_request_prices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."introduction_request_prices" ADD CONSTRAINT "introduction_request_prices_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_introduction_request_prices_introduction_request_id" ON "prospectly"."introduction_request_prices" USING btree ("introduction_request_id");--> statement-breakpoint