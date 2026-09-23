CREATE TABLE "prospectly"."recruitment_candidate_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"stage_id" integer,
	"note" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_stage_history" ADD CONSTRAINT "recruitment_candidate_stage_history_candidate_id_recruitment_job_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "prospectly"."recruitment_job_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_stage_history" ADD CONSTRAINT "recruitment_candidate_stage_history_stage_id_recruitment_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "prospectly"."recruitment_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_stage_history" ADD CONSTRAINT "recruitment_candidate_stage_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_stage_history" ADD CONSTRAINT "recruitment_candidate_stage_history_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_recruitment_candidate_stage_history_candidate_id" ON "prospectly"."recruitment_candidate_stage_history" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_candidate_stage_history_stage_id" ON "prospectly"."recruitment_candidate_stage_history" USING btree ("stage_id");