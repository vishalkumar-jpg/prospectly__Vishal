ALTER TABLE "contacts" DROP CONSTRAINT "contacts_original_importer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "introduction_requests" DROP CONSTRAINT "introduction_requests_requester_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "introduction_requests" DROP CONSTRAINT "introduction_requests_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "introduction_requests" DROP CONSTRAINT "introduction_requests_requester_bounty_stages_id_bounty_stages_id_fk";
--> statement-breakpoint
ALTER TABLE "introduction_requests" DROP CONSTRAINT "introduction_requests_accepted_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_stages" DROP CONSTRAINT "payment_stages_transaction_id_introduction_transactions_id_fk";
--> statement-breakpoint
ALTER TABLE "introduction_feedback" DROP CONSTRAINT "introduction_feedback_introduction_id_introduction_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "introduction_feedback" DROP CONSTRAINT "introduction_feedback_feedback_from_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "introduction_feedback" DROP CONSTRAINT "introduction_feedback_feedback_to_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "introduction_potential_connectors" DROP CONSTRAINT "introduction_potential_connectors_request_id_introduction_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "introduction_potential_connectors" DROP CONSTRAINT "introduction_potential_connectors_potential_connector_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "meeting_status_updates" DROP CONSTRAINT "meeting_status_updates_updated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "scheduled_meetings" DROP CONSTRAINT "scheduled_meetings_requester_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "payout_history" DROP CONSTRAINT "payout_history_connector_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "payout_history" DROP CONSTRAINT "payout_history_introduction_request_id_introduction_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "payout_history" DROP CONSTRAINT "payout_history_introduction_transaction_id_introduction_transactions_id_fk";
--> statement-breakpoint
ALTER TABLE "contact_imports" DROP CONSTRAINT "contact_imports_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "contact_imports" DROP CONSTRAINT "contact_imports_integration_id_calendar_integrations_id_fk";
--> statement-breakpoint
ALTER TABLE "contact_imports" DROP CONSTRAINT "contact_imports_token_id_contact_provider_tokens_id_fk";
--> statement-breakpoint
ALTER TABLE "user_subscription" DROP CONSTRAINT "user_subscription_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "subscription_transactions" DROP CONSTRAINT "subscription_transactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "subscription_transactions" DROP CONSTRAINT "subscription_transactions_subscription_id_user_subscription_id_fk";
--> statement-breakpoint
ALTER TABLE "referral_audit_log" DROP CONSTRAINT "referral_audit_log_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "referral_audit_log" DROP CONSTRAINT "referral_audit_log_invite_id_user_invites_id_fk";
--> statement-breakpoint
ALTER TABLE "referral_audit_log" DROP CONSTRAINT "referral_audit_log_referral_progress_id_referral_progress_id_fk";
--> statement-breakpoint
ALTER TABLE "user_credit_history" DROP CONSTRAINT "user_credit_history_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "introduction_fulfillment_attempts" DROP CONSTRAINT "introduction_fulfillment_attempts_introduction_request_id_introduction_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "introduction_fulfillment_attempts" DROP CONSTRAINT "introduction_fulfillment_attempts_connector_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "marketplace_shares" DROP CONSTRAINT "marketplace_shares_sharer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_stages" ALTER COLUMN "transaction_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_original_importer_id_users_id_fk" FOREIGN KEY ("original_importer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_requester_bounty_stages_id_bounty_stages_id_fk" FOREIGN KEY ("requester_bounty_stages_id") REFERENCES "public"."bounty_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_stages" ADD CONSTRAINT "payment_stages_transaction_id_introduction_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."introduction_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_feedback" ADD CONSTRAINT "introduction_feedback_introduction_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_id") REFERENCES "public"."introduction_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_feedback" ADD CONSTRAINT "introduction_feedback_feedback_from_user_id_users_id_fk" FOREIGN KEY ("feedback_from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_feedback" ADD CONSTRAINT "introduction_feedback_feedback_to_user_id_users_id_fk" FOREIGN KEY ("feedback_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_potential_connectors" ADD CONSTRAINT "introduction_potential_connectors_request_id_introduction_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_potential_connectors" ADD CONSTRAINT "introduction_potential_connectors_potential_connector_id_users_id_fk" FOREIGN KEY ("potential_connector_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_status_updates" ADD CONSTRAINT "meeting_status_updates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_meetings" ADD CONSTRAINT "scheduled_meetings_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_history" ADD CONSTRAINT "payout_history_connector_id_users_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_history" ADD CONSTRAINT "payout_history_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_history" ADD CONSTRAINT "payout_history_introduction_transaction_id_introduction_transactions_id_fk" FOREIGN KEY ("introduction_transaction_id") REFERENCES "public"."introduction_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_integration_id_calendar_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."calendar_integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_token_id_contact_provider_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."contact_provider_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_transactions" ADD CONSTRAINT "subscription_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_transactions" ADD CONSTRAINT "subscription_transactions_subscription_id_user_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscription"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_audit_log" ADD CONSTRAINT "referral_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_audit_log" ADD CONSTRAINT "referral_audit_log_invite_id_user_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."user_invites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_audit_log" ADD CONSTRAINT "referral_audit_log_referral_progress_id_referral_progress_id_fk" FOREIGN KEY ("referral_progress_id") REFERENCES "public"."referral_progress"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credit_history" ADD CONSTRAINT "user_credit_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_fulfillment_attempts" ADD CONSTRAINT "introduction_fulfillment_attempts_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_fulfillment_attempts" ADD CONSTRAINT "introduction_fulfillment_attempts_connector_id_users_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_shares" ADD CONSTRAINT "marketplace_shares_sharer_id_users_id_fk" FOREIGN KEY ("sharer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;