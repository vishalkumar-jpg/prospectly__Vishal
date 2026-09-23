CREATE TABLE "prospectly"."ai_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action_type" varchar(64),
	"provider" varchar(32) NOT NULL,
	"model" varchar(128) NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"status" varchar(16) NOT NULL,
	"error_message" text,
	"response_time_ms" integer NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prospectly"."ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "prospectly"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_usage_logs_user_id" ON "prospectly"."ai_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_logs_action_type" ON "prospectly"."ai_usage_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_logs_created_at" ON "prospectly"."ai_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_logs_provider" ON "prospectly"."ai_usage_logs" USING btree ("provider");