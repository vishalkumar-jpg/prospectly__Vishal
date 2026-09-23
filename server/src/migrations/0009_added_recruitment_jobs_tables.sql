CREATE TABLE "prospectly"."recruitment_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"industry_id" integer,
	"department_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"experience_level" varchar(50),
	"work_type" varchar(50),
	"location" varchar(255),
	"required_skills" jsonb,
	"preferred_skills" jsonb,
	"requirements" text,
	"responsibilities" text,
	"benefits" text,
	"salary_range_min" numeric(12, 2) DEFAULT '0' NOT NULL,
	"salary_range_max" numeric(12, 2) DEFAULT '0' NOT NULL,
	"salary_currency" varchar(10) DEFAULT 'USD',
	"salary_period" varchar(20) DEFAULT 'yearly',
	"bounty_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" varchar(50) DEFAULT 'draft',
	"ai_generated" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD CONSTRAINT "recruitment_jobs_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "prospectly"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD CONSTRAINT "recruitment_jobs_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "prospectly"."industries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_jobs" ADD CONSTRAINT "recruitment_jobs_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "prospectly"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_recruitment_jobs_requester_id" ON "prospectly"."recruitment_jobs" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_jobs_status" ON "prospectly"."recruitment_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_recruitment_jobs_industry_id" ON "prospectly"."recruitment_jobs" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_jobs_department_id" ON "prospectly"."recruitment_jobs" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_recruitment_jobs_requester_status" ON "prospectly"."recruitment_jobs" USING btree ("requester_id","status");