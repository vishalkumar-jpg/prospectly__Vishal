CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX "idx_contacts_linkedin" ON "prospectly"."contacts" USING btree ("linkedin");
--> statement-breakpoint
CREATE INDEX "idx_contacts_active_created_id_desc" ON "prospectly"."contacts" USING btree (
    "created_at" DESC NULLS LAST,
    "id" DESC NULLS LAST
)
WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "idx_contacts_search_first_name_gin_trgm" ON "prospectly"."contacts" USING gin ("first_name" gin_trgm_ops)
WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "idx_contacts_search_last_name_gin_trgm" ON "prospectly"."contacts" USING gin ("last_name" gin_trgm_ops)
WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "idx_contacts_search_linkedin_gin_trgm" ON "prospectly"."contacts" USING gin ("linkedin" gin_trgm_ops)
WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "idx_contacts_search_display_full_name_gin_trgm" ON "prospectly"."contacts" USING gin (
    btrim(
        coalesce("first_name", '') || ' ' || coalesce("last_name", '')
    ) gin_trgm_ops
)
WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "idx_users_search_full_name_gin_trgm" ON "prospectly"."users" USING gin ("full_name" gin_trgm_ops)
WHERE deleted_at IS NULL;