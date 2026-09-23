CREATE TABLE "prospectly"."recruitment_timeline_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "recruitment_timeline_snapshots_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "prospectly"."recruitment_timeline_snapshots" ADD CONSTRAINT "recruitment_timeline_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "prospectly"."users"("id") ON DELETE cascade ON UPDATE no action;