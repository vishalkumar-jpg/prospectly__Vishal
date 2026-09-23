CREATE TABLE "prospectly"."contact_import_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_slug" varchar(255) NOT NULL,
	"reminder_day" integer NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(50) NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "contact_import_reminders_reminder_day_non_negative_chk" CHECK ("prospectly"."contact_import_reminders"."reminder_day" >= 0)
);
--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" ADD COLUMN "has_imported_contacts" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "prospectly"."user_configurations" ADD COLUMN "last_reminder_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "prospectly"."contact_import_reminders" ADD CONSTRAINT "contact_import_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "prospectly"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_id_reminder_day_status_idx" ON "prospectly"."contact_import_reminders" USING btree ("user_id","reminder_day","status");--> statement-breakpoint
CREATE INDEX "deleted_at_idx" ON "prospectly"."contact_import_reminders" USING btree ("deleted_at");