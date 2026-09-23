ALTER TABLE "prospectly"."user_configurations" ADD COLUMN "requester_pipeline_filter_stages" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" ADD COLUMN "connector_pipeline_filter_stages" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" ADD COLUMN "recruiter_pipeline_filter_stages" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" ADD COLUMN "my_pipeline_filter_stages" jsonb DEFAULT '[]'::jsonb;