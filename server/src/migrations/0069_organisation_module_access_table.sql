CREATE TYPE "prospectly"."user_module" AS ENUM('recruiting');--> statement-breakpoint
CREATE TABLE "prospectly"."organisation_module_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"module" "prospectly"."user_module" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "prospectly"."organisation_module_access" ADD CONSTRAINT "organisation_module_access_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "prospectly"."organisation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_module_unique" ON "prospectly"."organisation_module_access" USING btree ("organisation_id","module") WHERE "prospectly"."organisation_module_access"."deleted_at" IS NULL;