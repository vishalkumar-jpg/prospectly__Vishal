CREATE TABLE "prospectly"."recruitment_job_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"sharer_id" uuid,
	"sharer_code" varchar(50) NOT NULL,
	"platform" varchar(30) NOT NULL,
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recruitment_job_shares_sharer_code_unique" UNIQUE("sharer_code")
);
--> statement-breakpoint
CREATE TABLE "prospectly"."recruitment_job_share_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"share_id" uuid NOT NULL,
	"event_type" varchar(30) NOT NULL,
	"ip_hash" varchar(64),
	"user_agent" text,
	"referrer" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_shares" ADD CONSTRAINT "recruitment_job_shares_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_shares" ADD CONSTRAINT "recruitment_job_shares_sharer_id_users_id_fk" FOREIGN KEY ("sharer_id") REFERENCES "prospectly"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_share_events" ADD CONSTRAINT "recruitment_job_share_events_share_id_recruitment_job_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "prospectly"."recruitment_job_shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_shares_job" ON "prospectly"."recruitment_job_shares" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_shares_sharer" ON "prospectly"."recruitment_job_shares" USING btree ("sharer_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_shares_sharer_code" ON "prospectly"."recruitment_job_shares" USING btree ("sharer_code");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_shares_platform" ON "prospectly"."recruitment_job_shares" USING btree ("platform");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recruitment_job_shares_job_sharer_platform_unique" ON "prospectly"."recruitment_job_shares" USING btree ("job_id","sharer_id","platform");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_share_events_share" ON "prospectly"."recruitment_job_share_events" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_share_events_type" ON "prospectly"."recruitment_job_share_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_share_events_created" ON "prospectly"."recruitment_job_share_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_share_events_ip" ON "prospectly"."recruitment_job_share_events" USING btree ("ip_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recruitment_job_share_events_share_event_ip_unique" ON "prospectly"."recruitment_job_share_events" USING btree ("share_id","event_type","ip_hash");