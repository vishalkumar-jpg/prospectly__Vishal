CREATE UNIQUE INDEX "idx_marketplace_share_events_share_event_ip_unique" ON "marketplace_share_events" USING btree ("share_id","event_type","ip_hash");--> statement-breakpoint
