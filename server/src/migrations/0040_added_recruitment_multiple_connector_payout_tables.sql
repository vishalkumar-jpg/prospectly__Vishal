CREATE TABLE "prospectly"."recruitment_connector_origins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"share_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "prospectly"."recruitment_candidate_connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"connector_user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"share_percent" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" DROP CONSTRAINT "recruitment_job_candidates_connector_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "prospectly"."idx_recruitment_job_candidates_connector_user_id";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_payout_history" ADD COLUMN "is_marketplace_deal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_connector_origins" ADD CONSTRAINT "recruitment_connector_origins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "prospectly"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_connector_origins" ADD CONSTRAINT "recruitment_connector_origins_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_connector_origins" ADD CONSTRAINT "recruitment_connector_origins_share_id_recruitment_job_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "prospectly"."recruitment_job_shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_connector_origins" ADD CONSTRAINT "recruitment_connector_origins_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_connectors" ADD CONSTRAINT "recruitment_candidate_connectors_candidate_id_recruitment_job_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "prospectly"."recruitment_job_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_connectors" ADD CONSTRAINT "recruitment_candidate_connectors_connector_user_id_users_id_fk" FOREIGN KEY ("connector_user_id") REFERENCES "prospectly"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_candidate_connectors" ADD CONSTRAINT "recruitment_candidate_connectors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_recruitment_connector_origins_user_id" ON "prospectly"."recruitment_connector_origins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_connector_origins_share_id" ON "prospectly"."recruitment_connector_origins" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_connector_origins_job_id" ON "prospectly"."recruitment_connector_origins" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_recruitment_candidate_connectors_candidate_connector" ON "prospectly"."recruitment_candidate_connectors" USING btree ("candidate_id","connector_user_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_recruitment_candidate_connectors_connector_user_id" ON "prospectly"."recruitment_candidate_connectors" USING btree ("connector_user_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_candidate_connectors_candidate_id" ON "prospectly"."recruitment_candidate_connectors" USING btree ("candidate_id");--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_candidates" DROP COLUMN "connector_user_id";