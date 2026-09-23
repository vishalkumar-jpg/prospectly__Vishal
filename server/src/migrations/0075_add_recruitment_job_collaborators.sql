CREATE TABLE "prospectly"."recruitment_job_collaborators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"collaborator_user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"invited_by" uuid,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_collaborators" ADD CONSTRAINT "recruitment_job_collaborators_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_collaborators" ADD CONSTRAINT "recruitment_job_collaborators_collaborator_user_id_users_id_fk" FOREIGN KEY ("collaborator_user_id") REFERENCES "prospectly"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_collaborators" ADD CONSTRAINT "recruitment_job_collaborators_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "prospectly"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_collaborators" ADD CONSTRAINT "recruitment_job_collaborators_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_collaborators" ADD CONSTRAINT "recruitment_job_collaborators_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_collaborators" ADD CONSTRAINT "recruitment_job_collaborators_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_recruitment_job_collaborators_job_user" ON "prospectly"."recruitment_job_collaborators" USING btree ("job_id","collaborator_user_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_collaborators_job_id" ON "prospectly"."recruitment_job_collaborators" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_job_collaborators_collaborator_user_id" ON "prospectly"."recruitment_job_collaborators" USING btree ("collaborator_user_id");