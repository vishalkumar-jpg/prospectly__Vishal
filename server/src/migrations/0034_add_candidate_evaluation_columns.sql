ALTER TABLE "prospectly"."recruitment_job_candidates" ADD COLUMN "match_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD COLUMN "matched_skills" jsonb;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD COLUMN "missing_skills" jsonb;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD COLUMN "analysis_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD COLUMN "analysis_status" varchar(20);--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" ADD COLUMN "analysis_note" text;