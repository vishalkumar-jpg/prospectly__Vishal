ALTER TABLE "prospectly"."user_configurations" ADD COLUMN "workspace_focus" varchar(20) DEFAULT 'both' NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" ADD CONSTRAINT "user_configurations_workspace_focus_check" CHECK ("workspace_focus" IN ('prospecting', 'recruiting', 'both')) NOT VALID;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" VALIDATE CONSTRAINT "user_configurations_workspace_focus_check";
