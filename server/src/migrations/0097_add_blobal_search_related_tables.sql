SET search_path TO prospectly;

CREATE TABLE "prospectly"."recruitment_job_facet_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"facet_kind" varchar(20) NOT NULL,
	"value" varchar(120) NOT NULL,
	"display_value" varchar(120) NOT NULL,
	"count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "prospectly"."recruitment_saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(60) NOT NULL,
	"criteria" jsonb NOT NULL,
	"criteria_version" smallint DEFAULT 1 NOT NULL,
	"source" varchar(20) DEFAULT 'advanced' NOT NULL,
	"result_count_at_save" integer,
	"last_run_at" timestamp with time zone,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "prospectly"."contact_resumes" ADD COLUMN "education_level" varchar(20);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD COLUMN "employment_type" varchar(20);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_facet_counts" ADD CONSTRAINT "recruitment_job_facet_counts_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_facet_counts" ADD CONSTRAINT "recruitment_job_facet_counts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_facet_counts" ADD CONSTRAINT "recruitment_job_facet_counts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_saved_searches" ADD CONSTRAINT "recruitment_saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "prospectly"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_saved_searches" ADD CONSTRAINT "recruitment_saved_searches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_saved_searches" ADD CONSTRAINT "recruitment_saved_searches_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_recruitment_job_facet_counts_job_value" ON "prospectly"."recruitment_job_facet_counts" USING btree ("job_id","facet_kind","value") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_facet_counts_kind_value" ON "prospectly"."recruitment_job_facet_counts" USING btree ("facet_kind","value");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_saved_search_user_title" ON "prospectly"."recruitment_saved_searches" USING btree ("user_id",lower("title")) WHERE "prospectly"."recruitment_saved_searches"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_saved_search_user_recent" ON "prospectly"."recruitment_saved_searches" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_contact_resumes_education_level" ON "prospectly"."contact_resumes" USING btree ("education_level") WHERE "prospectly"."contact_resumes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_contact_resume_search_embedding" ON "prospectly"."contact_resume_search" USING hnsw ("embedding" vector_cosine_ops);