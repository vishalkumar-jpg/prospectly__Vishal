CREATE TYPE "prospectly"."assessment_question_type" AS ENUM('single_choice', 'multi_choice', 'text');--> statement-breakpoint
CREATE TABLE "prospectly"."recruitment_assessment_question_bank" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_text" text NOT NULL,
	"question_type" "prospectly"."assessment_question_type" DEFAULT 'single_choice' NOT NULL,
	"options" jsonb,
	"correct_answer" jsonb,
	"points" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "prospectly"."recruitment_job_assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"source_bank_question_id" uuid,
	"question_text" text NOT NULL,
	"question_type" "prospectly"."assessment_question_type" NOT NULL,
	"options" jsonb,
	"correct_answer" jsonb,
	"points" integer,
	"order_index" integer NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "prospectly"."recruitment_candidate_assessment_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_candidate_id" uuid NOT NULL,
	"job_question_id" uuid,
	"question_text_snapshot" text NOT NULL,
	"question_type" "prospectly"."assessment_question_type" NOT NULL,
	"options_snapshot" jsonb,
	"correct_answer_snapshot" jsonb,
	"answer" jsonb NOT NULL,
	"is_correct" boolean,
	"points_awarded" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "unique_recruitment_candidate_assessment_response" UNIQUE("job_candidate_id","job_question_id")
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_settings" ADD COLUMN "has_assessment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_assessment_question_bank" ADD CONSTRAINT "recruitment_assessment_question_bank_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_assessment_question_bank" ADD CONSTRAINT "recruitment_assessment_question_bank_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_assessment_questions" ADD CONSTRAINT "recruitment_job_assessment_questions_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_assessment_questions" ADD CONSTRAINT "recruitment_job_assessment_questions_source_bank_question_id_recruitment_assessment_question_bank_id_fk" FOREIGN KEY ("source_bank_question_id") REFERENCES "prospectly"."recruitment_assessment_question_bank"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_assessment_questions" ADD CONSTRAINT "recruitment_job_assessment_questions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_assessment_questions" ADD CONSTRAINT "recruitment_job_assessment_questions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_assessment_responses" ADD CONSTRAINT "recruitment_candidate_assessment_responses_job_candidate_id_recruitment_job_candidates_id_fk" FOREIGN KEY ("job_candidate_id") REFERENCES "prospectly"."recruitment_job_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_assessment_responses" ADD CONSTRAINT "recruitment_candidate_assessment_responses_job_question_id_recruitment_job_assessment_questions_id_fk" FOREIGN KEY ("job_question_id") REFERENCES "prospectly"."recruitment_job_assessment_questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_assessment_responses" ADD CONSTRAINT "recruitment_candidate_assessment_responses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_assessment_responses" ADD CONSTRAINT "recruitment_candidate_assessment_responses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_recruitment_assessment_question_bank_created_by" ON "prospectly"."recruitment_assessment_question_bank" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_assessment_questions_job_id" ON "prospectly"."recruitment_job_assessment_questions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_assessment_questions_source_bank_question_id" ON "prospectly"."recruitment_job_assessment_questions" USING btree ("source_bank_question_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_candidate_assessment_responses_job_candidate_id" ON "prospectly"."recruitment_candidate_assessment_responses" USING btree ("job_candidate_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_candidate_assessment_responses_job_question_id" ON "prospectly"."recruitment_candidate_assessment_responses" USING btree ("job_question_id");