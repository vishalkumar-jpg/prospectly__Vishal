ALTER TABLE "prospectly"."user_configurations" ADD COLUMN "user_filter" jsonb DEFAULT '{"requester":[],"connector":[],"recruiter":[],"my_pipeline":[]}'::jsonb;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" DROP COLUMN "requester_pipeline_filter_stages";--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" DROP COLUMN "connector_pipeline_filter_stages";--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" DROP COLUMN "recruiter_pipeline_filter_stages";--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" DROP COLUMN "my_pipeline_filter_stages";
