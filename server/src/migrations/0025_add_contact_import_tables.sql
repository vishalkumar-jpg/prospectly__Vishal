CREATE TABLE "prospectly"."contact_file_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_type" varchar(10) NOT NULL,
	"total_records" integer DEFAULT 0 NOT NULL,
	"processed_records" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospectly"."contact_file_import_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"raw_data" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prospectly"."contacts"
ADD COLUMN "corporate_phone_number" varchar(30);
--> statement-breakpoint
ALTER TABLE "prospectly"."contact_file_imports"
ADD CONSTRAINT "contact_file_imports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "prospectly"."users"("id") ON DELETE
set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "prospectly"."contact_file_import_items"
ADD CONSTRAINT "contact_file_import_items_import_id_contact_file_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "prospectly"."contact_file_imports"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_contact_file_imports_created_by" ON "prospectly"."contact_file_imports" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "idx_contact_file_imports_status" ON "prospectly"."contact_file_imports" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "idx_contact_file_imports_created_at" ON "prospectly"."contact_file_imports" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "idx_contact_file_import_items_import_id" ON "prospectly"."contact_file_import_items" USING btree ("import_id");
--> statement-breakpoint
CREATE INDEX "idx_contact_file_import_items_status" ON "prospectly"."contact_file_import_items" USING btree ("status");