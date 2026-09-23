DROP INDEX "prospectly"."idx_contacts_active_created_id_desc";
--> statement-breakpoint
DROP INDEX "prospectly"."idx_contacts_search_first_name_gin_trgm";
--> statement-breakpoint
DROP INDEX "prospectly"."idx_contacts_search_last_name_gin_trgm";
--> statement-breakpoint
DROP INDEX "prospectly"."idx_contacts_search_linkedin_gin_trgm";
--> statement-breakpoint
DROP INDEX "prospectly"."idx_contacts_search_display_full_name_gin_trgm";
--> statement-breakpoint
CREATE INDEX "idx_contacts_active_id_desc" ON "prospectly"."contacts" USING btree ("id" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "idx_contacts_search_first_name_gin_trgm" ON "prospectly"."contacts" USING gin ("first_name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "idx_contacts_search_last_name_gin_trgm" ON "prospectly"."contacts" USING gin ("last_name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "idx_contacts_search_linkedin_gin_trgm" ON "prospectly"."contacts" USING gin ("linkedin" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "idx_contacts_search_display_full_name_gin_trgm" ON "prospectly"."contacts" USING gin (
    (coalesce("first_name", '') || ' ' || coalesce("last_name", '')) gin_trgm_ops
);