CREATE EXTENSION IF NOT EXISTS vector SCHEMA prospectly;
SET search_path TO prospectly;

CREATE TABLE "prospectly"."recruitment_job_pool_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"contact_id" bigint NOT NULL,
	"connector_user_id" uuid NOT NULL,
	"match_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cosine_similarity" numeric(5, 4),
	"llm_score" numeric(5, 2),
	"matched_signals" jsonb DEFAULT '[]',
	"concerns" jsonb DEFAULT '[]',
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp with time zone,
	"consent_token" varchar(2048),
	"consent_sent_at" timestamp with time zone,
	"consent_responded_at" timestamp with time zone,
	"consent_decline_reason" varchar(100),
	"consent_decline_notes" varchar(1000),
	"connector_decline_reason" varchar(500),
	"connector_declined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unique_job_pool_match_job_contact_connector" UNIQUE("job_id","contact_id","connector_user_id")
);
--> statement-breakpoint
ALTER TABLE "prospectly"."contacts" ADD COLUMN "skills" jsonb;--> statement-breakpoint
ALTER TABLE "prospectly"."contacts" ADD COLUMN "embedding" vector(768);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD COLUMN "embedding" vector(768);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD COLUMN "connector_user_id" uuid;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_pool_matches" ADD CONSTRAINT "recruitment_job_pool_matches_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_pool_matches" ADD CONSTRAINT "recruitment_job_pool_matches_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "prospectly"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_pool_matches" ADD CONSTRAINT "recruitment_job_pool_matches_connector_user_id_users_id_fk" FOREIGN KEY ("connector_user_id") REFERENCES "prospectly"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_pool_matches_connector_status" ON "prospectly"."recruitment_job_pool_matches" USING btree ("connector_user_id","status");--> statement-breakpoint
CREATE INDEX "idx_job_pool_matches_job_id" ON "prospectly"."recruitment_job_pool_matches" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_pool_matches_contact_id" ON "prospectly"."recruitment_job_pool_matches" USING btree ("contact_id");--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD CONSTRAINT "recruitment_job_candidates_connector_user_id_users_id_fk" FOREIGN KEY ("connector_user_id") REFERENCES "prospectly"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contacts_embedding" ON "prospectly"."contacts" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_candidates_connector_user_id" ON "prospectly"."recruitment_job_candidates" USING btree ("connector_user_id");