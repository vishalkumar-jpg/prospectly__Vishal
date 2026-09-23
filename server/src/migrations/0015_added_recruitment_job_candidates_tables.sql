CREATE TABLE "prospectly"."recruitment_job_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_user_id" uuid NOT NULL,
	"share_id" uuid,
	"sharer_code" varchar(50),
	"stage_id" integer,
	"linkedin_url" varchar(255),
	"resume_media_id" uuid,
	"contact_id" bigint,
	"anonymous_label" varchar(50),
	"stage_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "unique_recruitment_job_candidate_user" UNIQUE("job_id","candidate_user_id")
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD CONSTRAINT "recruitment_job_candidates_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD CONSTRAINT "recruitment_job_candidates_candidate_user_id_users_id_fk" FOREIGN KEY ("candidate_user_id") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD CONSTRAINT "recruitment_job_candidates_share_id_recruitment_job_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "prospectly"."recruitment_job_shares"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD CONSTRAINT "recruitment_job_candidates_stage_id_recruitment_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "prospectly"."recruitment_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD CONSTRAINT "recruitment_job_candidates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD CONSTRAINT "recruitment_job_candidates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_candidates_job_id" ON "prospectly"."recruitment_job_candidates" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_candidates_candidate_user_id" ON "prospectly"."recruitment_job_candidates" USING btree ("candidate_user_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_candidates_stage_id" ON "prospectly"."recruitment_job_candidates" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_candidates_share_id" ON "prospectly"."recruitment_job_candidates" USING btree ("share_id");