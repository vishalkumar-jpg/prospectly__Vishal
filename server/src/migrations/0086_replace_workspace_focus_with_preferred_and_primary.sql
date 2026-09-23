ALTER TABLE "prospectly"."user_configurations" DROP CONSTRAINT IF EXISTS "user_configurations_workspace_focus_check";--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" DROP COLUMN IF EXISTS "workspace_focus";--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" ADD COLUMN "preferred_workspace" varchar(20) DEFAULT 'recruiting' NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" ADD CONSTRAINT "user_configurations_preferred_workspace_check" CHECK ("preferred_workspace" IN ('prospecting', 'recruiting', 'both')) NOT VALID;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" VALIDATE CONSTRAINT "user_configurations_preferred_workspace_check";--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" ADD COLUMN "primary_workspace" varchar(20) DEFAULT 'recruiting' NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" ADD CONSTRAINT "user_configurations_primary_workspace_check" CHECK ("primary_workspace" IN ('prospecting', 'recruiting')) NOT VALID;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" VALIDATE CONSTRAINT "user_configurations_primary_workspace_check";--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" ADD CONSTRAINT "user_configurations_workspace_consistency_check" CHECK ("preferred_workspace" = 'both' OR "primary_workspace" = "preferred_workspace") NOT VALID;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" VALIDATE CONSTRAINT "user_configurations_workspace_consistency_check";
