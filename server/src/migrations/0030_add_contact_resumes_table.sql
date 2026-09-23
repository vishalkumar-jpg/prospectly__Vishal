CREATE TABLE "prospectly"."contact_resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"candidate_id" uuid,
	"contact_id" bigint,
	"uploaded_by" uuid,
	"job_title" varchar(255),
	"skills" jsonb,
	"total_years_exp" numeric(4, 1),
	"ai_summary" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "prospectly"."contact_resumes" ADD CONSTRAINT "contact_resumes_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "prospectly"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."contact_resumes" ADD CONSTRAINT "contact_resumes_candidate_id_recruitment_job_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "prospectly"."recruitment_job_candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."contact_resumes" ADD CONSTRAINT "contact_resumes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "prospectly"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."contact_resumes" ADD CONSTRAINT "contact_resumes_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "prospectly"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."contact_resumes" ADD CONSTRAINT "contact_resumes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."contact_resumes" ADD CONSTRAINT "contact_resumes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_contact_resumes_media_id" ON "prospectly"."contact_resumes" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "idx_contact_resumes_candidate_id" ON "prospectly"."contact_resumes" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_contact_resumes_contact_id" ON "prospectly"."contact_resumes" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_contact_resumes_uploaded_by" ON "prospectly"."contact_resumes" USING btree ("uploaded_by");