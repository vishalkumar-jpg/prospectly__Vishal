CREATE TABLE "prospectly"."recruitment_job_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"salary_range_min" numeric(12, 2) DEFAULT '0' NOT NULL,
	"salary_range_max" numeric(12, 2) DEFAULT '0' NOT NULL,
	"salary_currency" varchar(10) DEFAULT 'USD',
	"salary_period" varchar(20) DEFAULT 'yearly',
	"bounty_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"stripe_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"processing_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_pricing" ADD CONSTRAINT "recruitment_job_pricing_job_id_recruitment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "prospectly"."recruitment_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_pricing" ADD CONSTRAINT "recruitment_job_pricing_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_job_pricing" ADD CONSTRAINT "recruitment_job_pricing_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recruitment_job_pricing_job_id" ON "prospectly"."recruitment_job_pricing" USING btree ("job_id");--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" DROP COLUMN "salary_range_min";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" DROP COLUMN "salary_range_max";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" DROP COLUMN "salary_currency";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" DROP COLUMN "salary_period";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" DROP COLUMN "bounty_amount";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_transactions" DROP COLUMN "bounty_amount";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_transactions" DROP COLUMN "stripe_fee";--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_interview_transactions" DROP COLUMN "processing_fee";