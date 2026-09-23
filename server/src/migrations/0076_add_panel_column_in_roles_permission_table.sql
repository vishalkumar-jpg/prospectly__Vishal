CREATE TYPE "prospectly"."panel" AS ENUM('admin', 'user');
--> statement-breakpoint
ALTER TABLE "prospectly"."role_permission"
ADD COLUMN "panel" "prospectly"."panel" DEFAULT 'admin' NOT NULL;
--> statement-breakpoint
ALTER TABLE "prospectly"."roles"
ADD COLUMN "panel" "prospectly"."panel" DEFAULT 'admin' NOT NULL;