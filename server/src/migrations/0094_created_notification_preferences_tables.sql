CREATE TABLE "prospectly"."notification_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"group_key" varchar(64) NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prospectly"."user_notification_preferences" (
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_notification_preferences_user_id_category_id_pk" PRIMARY KEY("user_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "prospectly"."email_suppressions" (
	"email" varchar(255) PRIMARY KEY NOT NULL,
	"reason" varchar(30) NOT NULL,
	"source" varchar(30),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prospectly"."user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "prospectly"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectly"."user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_category_id_notification_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "prospectly"."notification_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_categories_key_unique" ON "prospectly"."notification_categories" USING btree ("key");