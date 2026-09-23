CREATE EXTENSION IF NOT EXISTS vector SCHEMA prospectly;
SET search_path TO prospectly;

CREATE TABLE "prospectly"."contact_resume_search" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_resume_id" uuid NOT NULL,
	"profile_text" text,
	"resume_text" text,
	"embedding" vector(768),
	"embedding_model" varchar(60),
	"search_doc_hash" varchar(64),
	"search_vector" "tsvector" GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce("profile_text", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("resume_text", '')), 'B')
) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "prospectly"."contact_resume_search" ADD CONSTRAINT "contact_resume_search_contact_resume_id_contact_resumes_id_fk" FOREIGN KEY ("contact_resume_id") REFERENCES "prospectly"."contact_resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."contact_resume_search" ADD CONSTRAINT "contact_resume_search_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."contact_resume_search" ADD CONSTRAINT "contact_resume_search_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_contact_resume_search_resume_id" ON "prospectly"."contact_resume_search" USING btree ("contact_resume_id");--> statement-breakpoint
CREATE INDEX "idx_contact_resume_search_vector" ON "prospectly"."contact_resume_search" USING gin ("search_vector") WHERE deleted_at IS NULL;