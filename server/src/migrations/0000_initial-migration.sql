CREATE SEQUENCE IF NOT EXISTS contacts_id_seq;
CREATE SEQUENCE IF NOT EXISTS contact_relationships_id_seq;
CREATE SEQUENCE IF NOT EXISTS contact_import_snapshots_id_seq;
CREATE SEQUENCE IF NOT EXISTS "contact_sensitive_data_id_seq";
CREATE SEQUENCE IF NOT EXISTS "contact_enrichments_id_seq";
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
  CREATE TYPE "public"."app_role" AS ENUM('admin', 'user', 'moderator', 'super_admin');
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trust_score_action_type') THEN
  CREATE TYPE "public"."trust_score_action_type" AS ENUM('ADD', 'SUBTRACT', 'SET');
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trust_score_triggered_by') THEN
  CREATE TYPE "public"."trust_score_triggered_by" AS ENUM('SYSTEM', 'ADMIN', 'USER_ACTION');
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_transaction_type') THEN
  CREATE TYPE "public"."credit_transaction_type" AS ENUM('earned', 'used');
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrichment_status') THEN
  CREATE TYPE "public"."enrichment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'insufficient_data');
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_tab_mode') THEN
  CREATE TYPE "public"."import_tab_mode" AS ENUM('automatic', 'manual', 'automatic-credentials');
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'linkedin_import_tab') THEN
  CREATE TYPE "public"."linkedin_import_tab" AS ENUM('instructions', 'upload_zip');
 END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" bigint PRIMARY KEY DEFAULT nextval('contacts_id_seq') NOT NULL,
	"first_name" varchar(50),
	"last_name" varchar(50),
	"gender" varchar(20),
	"title" varchar(100),
	"company" varchar(150),
	"phone_number" varchar(30),
	"email" varchar(255),
	"employees" varchar(100),
	"industry" varchar(100),
	"linkedin" varchar(255),
	"website" varchar(255),
	"city" varchar(50),
	"state" varchar(50),
	"country" varchar(60),
	"company_domain" varchar(255),
	"company_industry" varchar(100),
	"company_description" text,
	"company_type" varchar(100),
	"location" varchar(255),
	"company_linkedin_url" varchar(255),
	"profile_photo_url" text,
	"linkedin_connections" varchar(20),
	"source" varchar(30) DEFAULT 'manual',
	"original_importer_id" uuid,
	"bounty_amount" numeric DEFAULT '0',
	"enrichment_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_sensitive_data" (
	"id" bigint PRIMARY KEY DEFAULT nextval('contact_sensitive_data_id_seq') NOT NULL,
	"contact_id" bigint NOT NULL,
	"email" text,
	"phone" text,
	"linkedin" text,
	"secondary_email" text,
	"normalized_email" text,
	"normalized_phone" text,
	"normalized_secondary_email" text,
	"normalized_email_hash" varchar(64),
	"normalized_phone_hash" varchar(64),
	"linkedin_hash" varchar(64),
	"normalized_secondary_email_hash" varchar(64),
	"encryption_key_id" varchar(50) DEFAULT 'default_key_v1' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_relationships" (
	"id" bigint PRIMARY KEY DEFAULT nextval('contact_relationships_id_seq') NOT NULL,
	"contact_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"bounty_amount" numeric DEFAULT '0',
	"bounty_status" varchar(30) DEFAULT 'pending',
	"first_name" varchar(50),
	"last_name" varchar(50),
	"company" varchar(150),
	"title" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_contact_user" UNIQUE("contact_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_enrichments" (
	"id" bigint PRIMARY KEY DEFAULT nextval('contact_enrichments_id_seq') NOT NULL,
	"contact_id" bigint NOT NULL,
	"enrichment_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"enrichment_request_id" uuid,
	"enriched_at" timestamp,
	"enrichment_response" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_import_snapshots" (
	"id" bigint PRIMARY KEY DEFAULT nextval('contact_import_snapshots_id_seq') NOT NULL,
	"relationship_id" bigint NOT NULL,
	"source_type" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_relationship_source_type" UNIQUE("relationship_id","source_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bounty_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" varchar(50) NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"percentage" integer NOT NULL,
	"stage_order" integer NOT NULL,
	"icon" varchar(50) DEFAULT 'CheckCircle',
	"color" varchar(100) DEFAULT 'bg-gray-100 text-gray-800',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bounty_stages_stage_id_unique" UNIQUE("stage_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "introduction_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid,
	"contact_name" varchar(100) NOT NULL,
	"bounty_amount" numeric(10, 2) NOT NULL,
	"meeting_title" varchar(255),
	"meeting_description" text NOT NULL,
	"additional_context" text,
	"status" varchar(30) DEFAULT 'pending',
	"contact_id" bigint,
	"adjusted_bounty_amount" numeric,
	"is_marketplace_visible" boolean DEFAULT false,
	"marketplace_moved_at" timestamp with time zone,
	"booking_token" varchar(100),
	"booking_token_expires_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"auto_expired" boolean DEFAULT false,
	"bounty_stages_id" uuid,
	"requester_bounty_stages_id" uuid,
	"meeting_completed_by_requester" boolean DEFAULT false,
	"requester_feedback_completed" boolean DEFAULT false,
	"connector_feedback_completed" boolean DEFAULT false,
	"accepted_by" uuid,
	"accepted_at" timestamp with time zone,
	"connector_feedback_submitted" boolean DEFAULT false,
	"requester_archived" boolean DEFAULT false,
	"connector_archived" boolean DEFAULT false,
	"is_urgent" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "introduction_requests_booking_token_unique" UNIQUE("booking_token"),
	CONSTRAINT "introduction_requests_status_check" CHECK ("introduction_requests"."status" IN ('pending', 'accepted', 'declined', 'intro_sent', 'meeting_scheduled', 'meeting_booked', 'meeting_rescheduled', 'meeting_completed', 'peer_feedback', 'completed', 'email_failed'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "introduction_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_request_id" uuid NOT NULL,
	"payment_method_id" varchar(50),
	"total_authorized_amount" numeric(10, 2) DEFAULT '0',
	"total_captured_amount" numeric(10, 2) DEFAULT '0',
	"overall_status" varchar(30) DEFAULT 'pending',
	"payment_authorized_at" timestamp with time zone,
	"fully_paid_at" timestamp with time zone,
	"payment_error" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "introduction_transactions_introduction_request_id_unique" UNIQUE("introduction_request_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"stage_name" varchar(50) NOT NULL,
	"stage_order" integer NOT NULL,
	"intent_id" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(30) DEFAULT 'pending',
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"charge_amount" numeric(10, 2),
	"receipt_url" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "idx_payment_stages_unique_stage" UNIQUE("transaction_id","stage_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "introduction_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_id" uuid NOT NULL,
	"feedback_from_user_id" uuid NOT NULL,
	"feedback_to_user_id" uuid NOT NULL,
	"rating" numeric(3, 1) NOT NULL,
	"feedback_text" text,
	"feedback_category" varchar(50) DEFAULT 'general' NOT NULL,
	"rejection_reason" text,
	"meeting_completed" boolean DEFAULT true NOT NULL,
	"feedback_type" varchar(30) DEFAULT 'meeting_feedback',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "introduction_feedback_introduction_id_feedback_from_user_id_feedback_type_unique" UNIQUE("introduction_id","feedback_from_user_id","feedback_type"),
	CONSTRAINT "introduction_feedback_rating_check" CHECK ("introduction_feedback"."rating" >= 0.5 AND "introduction_feedback"."rating" <= 5),
	CONSTRAINT "valid_rating_range" CHECK ("introduction_feedback"."rating" >= 0.5 AND "introduction_feedback"."rating" <= 5.0 AND ("introduction_feedback"."rating" * 2) = FLOOR("introduction_feedback"."rating" * 2)),
	CONSTRAINT "introduction_feedback_feedback_type_check" CHECK ("introduction_feedback"."feedback_type" IN ('meeting_feedback', 'peer_feedback'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "introduction_email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_request_id" uuid NOT NULL,
	"resend_email_id" varchar(100),
	"recipient_email" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"email_body" text,
	"status" varchar(30) DEFAULT 'pending',
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"clicked" boolean DEFAULT false,
	"clicked_at" timestamp with time zone,
	"click_count" integer DEFAULT 0,
	"bounced" boolean DEFAULT false,
	"bounced_at" timestamp with time zone,
	"bounce_type" varchar(50),
	"bounce_reason" text,
	"last_event_type" varchar(50),
	"last_event_at" timestamp with time zone,
	"raw_events" jsonb DEFAULT '[]'::jsonb,
	"connector_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "introduction_potential_connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"potential_connector_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"decline_reason" varchar(100),
	"decline_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unique_request_potential_connector" UNIQUE("request_id","potential_connector_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(30) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"email" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_status_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduled_meeting_id" uuid NOT NULL,
	"previous_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"updated_by" uuid,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduled_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_request_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"prospect_email" varchar(255) NOT NULL,
	"prospect_name" varchar(100),
	"meeting_date" timestamp with time zone NOT NULL,
	"meeting_duration" integer DEFAULT 30 NOT NULL,
	"meeting_platform" varchar(30) DEFAULT 'google_meet',
	"meeting_link" text,
	"calendar_event_id" varchar(255),
	"calendar_provider" varchar(30),
	"status" varchar(30) DEFAULT 'scheduled',
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payout_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_id" uuid,
	"introduction_request_id" uuid,
	"introduction_transaction_id" uuid,
	"gross_amount" numeric(10, 2),
	"platform_commission_amount" numeric(10, 2),
	"net_amount" numeric(10, 2) NOT NULL,
	"connector_stripe_account_id" varchar(50),
	"stripe_transfer_id" varchar(50),
	"stripe_payout_id" varchar(50),
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"payout_mode" varchar(20) DEFAULT 'scheduled',
	"payout_eligible" boolean DEFAULT false,
	"payout_released" boolean DEFAULT false,
	"payout_released_at" timestamp with time zone,
	"payout_triggered_by" varchar(30),
	"trust_score_at_payout" integer,
	"credits_applied" numeric(10, 2) DEFAULT '0' NOT NULL,
	"credits_remaining_after" numeric(10, 2) DEFAULT '0' NOT NULL,
	"commission_after_credits" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_marketplace_deal" boolean DEFAULT false,
	"marketplace_role" varchar(20),
	"processing_status" varchar(30) DEFAULT 'pending',
	"processing_started_at" timestamp with time zone,
	"processing_completed_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0,
	"last_retry_at" timestamp with time zone,
	"job_id" varchar(100),
	"error_message" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"integration_id" uuid,
	"token_id" uuid,
	"email" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"imported" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"duplicates" integer DEFAULT 0 NOT NULL,
	"total_fetched" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_provider_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"email" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_contact_provider_tokens_user_provider" UNIQUE("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "linkedin_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"import_record_id" uuid NOT NULL,
	"s3_key" varchar(500) NOT NULL,
	"linkedin_profile_url" varchar(255),
	"profile_data" jsonb,
	"extraction_log" jsonb,
	"processing_log" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"stripe_plan_id" text NOT NULL,
	"feature" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" text,
	"updated_by" text,
	"default_plan" boolean,
	"max_concurrent_requests" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_plan_price" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_plan_id" uuid NOT NULL,
	"stripe_price_id" text NOT NULL,
	"price" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" text,
	"updated_by" text,
	"interval" varchar(10)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_plan_id" uuid NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"price_id" uuid NOT NULL,
	"status" varchar(30) NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"invite_id" uuid,
	"coupon_applied" text,
	"trial_end" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "user_subscription_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"from_plan_id" uuid,
	"to_plan_id" uuid,
	"stripe_event_id" text,
	"amount" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'usd',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invite_verification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invite_id" uuid NOT NULL,
	"user_id" uuid,
	"verification_type" varchar(50) NOT NULL,
	"verification_status" varchar(50) NOT NULL,
	"verification_data" jsonb,
	"ip_address" text,
	"user_agent" text,
	"fraud_signals" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"invite_id" uuid,
	"referral_progress_id" uuid,
	"plan_id" uuid,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invite_token" text NOT NULL,
	"email" text NOT NULL,
	"invited_by_user_id" uuid,
	"invited_by_admin_id" text,
	"organisation_id" uuid,
	"subscription_plan_id" uuid NOT NULL,
	"stripe_coupon_id" text,
	"stripe_customer_id" text,
	"invite_type" text NOT NULL,
	"referral_credited_to" uuid,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_user_id" uuid,
	"email_sent_at" timestamp with time zone,
	"email_opened_at" timestamp with time zone,
	"email_clicked_at" timestamp with time zone,
	"resend_email_id" text,
	"can_resend" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_invites_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_invites_sent" integer DEFAULT 0,
	"total_invites_accepted" integer DEFAULT 0,
	"accepted_users" jsonb DEFAULT '[]'::jsonb,
	"invited_users" jsonb DEFAULT '[]'::jsonb,
	"earned_coupons" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_progress_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_privacy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"reason" varchar(50) NOT NULL,
	"hide_profile" boolean DEFAULT false NOT NULL,
	"hide_bounties" boolean DEFAULT false NOT NULL,
	"exclude_from_search" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisation_leader_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"allowed_plan_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_invites_per_month" integer,
	"invites_used_this_month" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"website" varchar(255),
	"logo_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisation_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"invited_by" text,
	"invite_code" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisation_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"organisation_id" uuid NOT NULL,
	"expires_at" timestamp,
	"used_count" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	CONSTRAINT "organisation_invite_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "introduction_privacy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_request_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"reason" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(50),
	"last_name" varchar(50),
	"full_name" varchar(100),
	"password" varchar,
	"type" text DEFAULT 'user' NOT NULL,
	"bio" text,
	"company" varchar(150),
	"job_title" varchar(100),
	"linkedin_url" varchar(255),
	"profile_photo_url" text,
	"location" varchar(100),
	"industry" varchar(100),
	"phone" varchar(30),
	"website_url" varchar(255),
	"products" text,
	"unique_selling_proposition" text,
	"target_market" text,
	"company_size" text,
	"revenue_range" text,
	"key_credentials" text,
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"stripe_customer_id" varchar(50),
	"stripe_primary_payment_method_id" varchar(50),
	"stripe_connect_account_id" varchar(50),
	"stripe_connect_onboarding_complete" boolean DEFAULT false,
	"trust_score" integer DEFAULT 0,
	"credit_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"max_concurrent_requests" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trust_score_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"action_type" "trust_score_action_type" NOT NULL,
	"points" numeric(4, 1) NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_configurable" boolean DEFAULT false,
	"config_params" jsonb,
	"trigger_event" text NOT NULL,
	"priority" integer DEFAULT 0,
	"conditions" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "trust_score_rules_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_trust_score_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"previous_score" numeric(4, 1),
	"new_score" numeric(4, 1),
	"points_change" numeric(4, 1),
	"action_type" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"metadata" jsonb,
	"triggered_by" "trust_score_triggered_by",
	"triggered_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"priority" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"current_page" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"module" text NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"mime_type" text,
	"size" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"contact_import" numeric DEFAULT '0',
	"credits" numeric(10, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_credit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credit_rule_id" uuid,
	"transaction_type" "credit_transaction_type" NOT NULL,
	"provider" varchar(50),
	"amount" numeric(10, 2) NOT NULL,
	"balance_before" numeric(10, 2) DEFAULT '0' NOT NULL,
	"balance_after" numeric(10, 2) DEFAULT '0' NOT NULL,
	"introduction_request_id" uuid,
	"payout_history_id" uuid,
	"enriched_contacts_count" integer,
	"evidence" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_credit_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"credit_rule_id" uuid NOT NULL,
	"enriched_contacts_at_award" integer NOT NULL,
	"credits_awarded" numeric(10, 2) NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_credit_award_provider" UNIQUE("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"default_from_name" varchar NOT NULL,
	"default_from_email" varchar NOT NULL,
	"default_reply_to_email" varchar NOT NULL,
	"company_address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resend_email_id" text NOT NULL,
	"invite_id" uuid,
	"event_type" text NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text,
	"metadata" jsonb,
	"occurred_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"html_content" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_configuration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_configuration_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permissions" text[] NOT NULL,
	"module" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_configuration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_request_id" uuid NOT NULL,
	"introduction_transaction_id" uuid NOT NULL,
	"payment_stage_id" uuid NOT NULL,
	"stripe_refund_id" varchar(100),
	"refund_amount" numeric(10, 2) NOT NULL,
	"refund_reason" varchar(50) NOT NULL,
	"refund_status" varchar(30) DEFAULT 'refund_initiated',
	"refunded_at" timestamp with time zone,
	"initiated_by" varchar(20) NOT NULL,
	"initiated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unique_payment_stage_refund" UNIQUE("payment_stage_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "introduction_fulfillment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_request_id" uuid NOT NULL,
	"connector_id" uuid NOT NULL,
	"failure_stage" varchar(30) NOT NULL,
	"failure_reason" varchar(50) NOT NULL,
	"failure_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queue_enrichments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"search_query" jsonb NOT NULL,
	"query_hash" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "enrichment_status" DEFAULT 'pending',
	"enriched_contact_id" bigint,
	"webhook_response" jsonb,
	"error_message" text,
	"attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"has_seen_welcome_popup" boolean DEFAULT false NOT NULL,
	"google_import_tab" "import_tab_mode" DEFAULT 'automatic' NOT NULL,
	"microsoft_import_tab" "import_tab_mode" DEFAULT 'automatic' NOT NULL,
	"apple_import_tab" "import_tab_mode" DEFAULT 'automatic' NOT NULL,
	"linkedin_import_tab" "linkedin_import_tab" DEFAULT 'instructions' NOT NULL,
	"is_user_unsubscribe" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_configurations_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_request_id" uuid NOT NULL,
	"sharer_id" uuid NOT NULL,
	"sharer_code" varchar(50) NOT NULL,
	"platform" varchar(30) NOT NULL,
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_shares_sharer_code_unique" UNIQUE("sharer_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_request_id" uuid NOT NULL,
	"claimer_id" uuid NOT NULL,
	"sharer_code" varchar(50) NOT NULL,
	"sharer_id" uuid,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"verification_completed_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"claimer_share" numeric(10, 2),
	"sharer_share" numeric(10, 2),
	"sources_checked" text[] DEFAULT '{}'::text[],
	"matched_contact_id" bigint,
	"matched_source" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_claims_status_check" CHECK ("marketplace_claims"."status" IN ('pending', 'verifying', 'verified', 'completed', 'failed', 'in_progress'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_share_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"share_id" uuid NOT NULL,
	"event_type" varchar(30) NOT NULL,
	"ip_hash" varchar(64),
	"user_agent" text,
	"referrer" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_original_importer_id_users_id_fk') THEN
  ALTER TABLE "contacts" ADD CONSTRAINT "contacts_original_importer_id_users_id_fk" FOREIGN KEY ("original_importer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_enrichment_id_queue_enrichments_id_fk') THEN
  ALTER TABLE "contacts" ADD CONSTRAINT "contacts_enrichment_id_queue_enrichments_id_fk" FOREIGN KEY ("enrichment_id") REFERENCES "public"."queue_enrichments"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_sensitive_data_contact_id_contacts_id_fk') THEN
  ALTER TABLE "contact_sensitive_data" ADD CONSTRAINT "contact_sensitive_data_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_relationships_contact_id_contacts_id_fk') THEN
  ALTER TABLE "contact_relationships" ADD CONSTRAINT "contact_relationships_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_relationships_user_id_users_id_fk') THEN
  ALTER TABLE "contact_relationships" ADD CONSTRAINT "contact_relationships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_enrichments_contact_id_contacts_id_fk') THEN
  ALTER TABLE "contact_enrichments" ADD CONSTRAINT "contact_enrichments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_import_snapshots_relationship_id_contact_relationships_id_fk') THEN
  ALTER TABLE "contact_import_snapshots" ADD CONSTRAINT "contact_import_snapshots_relationship_id_contact_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."contact_relationships"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_requests_requester_id_users_id_fk') THEN
  ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_requests_contact_id_contacts_id_fk') THEN
  ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_requests_bounty_stages_id_bounty_stages_id_fk') THEN
  ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_bounty_stages_id_bounty_stages_id_fk" FOREIGN KEY ("bounty_stages_id") REFERENCES "public"."bounty_stages"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_requests_requester_bounty_stages_id_bounty_stages_id_fk') THEN
  ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_requester_bounty_stages_id_bounty_stages_id_fk" FOREIGN KEY ("requester_bounty_stages_id") REFERENCES "public"."bounty_stages"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_requests_accepted_by_users_id_fk') THEN
  ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_transactions_introduction_request_id_introduction_requests_id_fk') THEN
  ALTER TABLE "introduction_transactions" ADD CONSTRAINT "introduction_transactions_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_stages_transaction_id_introduction_transactions_id_fk') THEN
  ALTER TABLE "payment_stages" ADD CONSTRAINT "payment_stages_transaction_id_introduction_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."introduction_transactions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_feedback_introduction_id_introduction_requests_id_fk') THEN
  ALTER TABLE "introduction_feedback" ADD CONSTRAINT "introduction_feedback_introduction_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_feedback_feedback_from_user_id_users_id_fk') THEN
  ALTER TABLE "introduction_feedback" ADD CONSTRAINT "introduction_feedback_feedback_from_user_id_users_id_fk" FOREIGN KEY ("feedback_from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_feedback_feedback_to_user_id_users_id_fk') THEN
  ALTER TABLE "introduction_feedback" ADD CONSTRAINT "introduction_feedback_feedback_to_user_id_users_id_fk" FOREIGN KEY ("feedback_to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_email_logs_introduction_request_id_introduction_requests_id_fk') THEN
  ALTER TABLE "introduction_email_logs" ADD CONSTRAINT "introduction_email_logs_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_email_logs_connector_id_users_id_fk') THEN
  ALTER TABLE "introduction_email_logs" ADD CONSTRAINT "introduction_email_logs_connector_id_users_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_potential_connectors_request_id_introduction_requests_id_fk') THEN
  ALTER TABLE "introduction_potential_connectors" ADD CONSTRAINT "introduction_potential_connectors_request_id_introduction_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_potential_connectors_potential_connector_id_users_id_fk') THEN
  ALTER TABLE "introduction_potential_connectors" ADD CONSTRAINT "introduction_potential_connectors_potential_connector_id_users_id_fk" FOREIGN KEY ("potential_connector_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_integrations_user_id_users_id_fk') THEN
  ALTER TABLE "calendar_integrations" ADD CONSTRAINT "calendar_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_status_updates_scheduled_meeting_id_scheduled_meetings_id_fk') THEN
  ALTER TABLE "meeting_status_updates" ADD CONSTRAINT "meeting_status_updates_scheduled_meeting_id_scheduled_meetings_id_fk" FOREIGN KEY ("scheduled_meeting_id") REFERENCES "public"."scheduled_meetings"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_status_updates_updated_by_users_id_fk') THEN
  ALTER TABLE "meeting_status_updates" ADD CONSTRAINT "meeting_status_updates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_meetings_introduction_request_id_introduction_requests_id_fk') THEN
  ALTER TABLE "scheduled_meetings" ADD CONSTRAINT "scheduled_meetings_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_meetings_requester_id_users_id_fk') THEN
  ALTER TABLE "scheduled_meetings" ADD CONSTRAINT "scheduled_meetings_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payout_history_connector_id_users_id_fk') THEN
  ALTER TABLE "payout_history" ADD CONSTRAINT "payout_history_connector_id_users_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payout_history_introduction_request_id_introduction_requests_id_fk') THEN
  ALTER TABLE "payout_history" ADD CONSTRAINT "payout_history_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payout_history_introduction_transaction_id_introduction_transactions_id_fk') THEN
  ALTER TABLE "payout_history" ADD CONSTRAINT "payout_history_introduction_transaction_id_introduction_transactions_id_fk" FOREIGN KEY ("introduction_transaction_id") REFERENCES "public"."introduction_transactions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_user_id_users_id_fk') THEN
  ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_imports_user_id_users_id_fk') THEN
  ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_imports_integration_id_calendar_integrations_id_fk') THEN
  ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_integration_id_calendar_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."calendar_integrations"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_imports_token_id_contact_provider_tokens_id_fk') THEN
  ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_token_id_contact_provider_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."contact_provider_tokens"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_provider_tokens_user_id_users_id_fk') THEN
  ALTER TABLE "contact_provider_tokens" ADD CONSTRAINT "contact_provider_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'linkedin_imports_user_id_users_id_fk') THEN
  ALTER TABLE "linkedin_imports" ADD CONSTRAINT "linkedin_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'linkedin_imports_import_record_id_contact_imports_id_fk') THEN
  ALTER TABLE "linkedin_imports" ADD CONSTRAINT "linkedin_imports_import_record_id_contact_imports_id_fk" FOREIGN KEY ("import_record_id") REFERENCES "public"."contact_imports"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plan_price_subscription_plan_id_subscription_plan_id_fk') THEN
  ALTER TABLE "subscription_plan_price" ADD CONSTRAINT "subscription_plan_price_subscription_plan_id_subscription_plan_id_fk" FOREIGN KEY ("subscription_plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscription_user_id_users_id_fk') THEN
  ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscription_subscription_plan_id_subscription_plan_id_fk') THEN
  ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_subscription_plan_id_subscription_plan_id_fk" FOREIGN KEY ("subscription_plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE restrict ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscription_price_id_subscription_plan_price_id_fk') THEN
  ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_price_id_subscription_plan_price_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."subscription_plan_price"("id") ON DELETE restrict ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscription_invite_id_user_invites_id_fk') THEN
  ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_invite_id_user_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."user_invites"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_transactions_user_id_users_id_fk') THEN
  ALTER TABLE "subscription_transactions" ADD CONSTRAINT "subscription_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_transactions_subscription_id_user_subscription_id_fk') THEN
  ALTER TABLE "subscription_transactions" ADD CONSTRAINT "subscription_transactions_subscription_id_user_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscription"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_transactions_from_plan_id_subscription_plan_id_fk') THEN
  ALTER TABLE "subscription_transactions" ADD CONSTRAINT "subscription_transactions_from_plan_id_subscription_plan_id_fk" FOREIGN KEY ("from_plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_transactions_to_plan_id_subscription_plan_id_fk') THEN
  ALTER TABLE "subscription_transactions" ADD CONSTRAINT "subscription_transactions_to_plan_id_subscription_plan_id_fk" FOREIGN KEY ("to_plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invite_verification_logs_invite_id_user_invites_id_fk') THEN
  ALTER TABLE "invite_verification_logs" ADD CONSTRAINT "invite_verification_logs_invite_id_user_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."user_invites"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invite_verification_logs_user_id_users_id_fk') THEN
  ALTER TABLE "invite_verification_logs" ADD CONSTRAINT "invite_verification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_audit_log_user_id_users_id_fk') THEN
  ALTER TABLE "referral_audit_log" ADD CONSTRAINT "referral_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_audit_log_invite_id_user_invites_id_fk') THEN
  ALTER TABLE "referral_audit_log" ADD CONSTRAINT "referral_audit_log_invite_id_user_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."user_invites"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_audit_log_referral_progress_id_referral_progress_id_fk') THEN
  ALTER TABLE "referral_audit_log" ADD CONSTRAINT "referral_audit_log_referral_progress_id_referral_progress_id_fk" FOREIGN KEY ("referral_progress_id") REFERENCES "public"."referral_progress"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_audit_log_plan_id_subscription_plan_id_fk') THEN
  ALTER TABLE "referral_audit_log" ADD CONSTRAINT "referral_audit_log_plan_id_subscription_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_invites_invited_by_user_id_users_id_fk') THEN
  ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_invites_subscription_plan_id_subscription_plan_id_fk') THEN
  ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_subscription_plan_id_subscription_plan_id_fk" FOREIGN KEY ("subscription_plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE restrict ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_invites_referral_credited_to_users_id_fk') THEN
  ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_referral_credited_to_users_id_fk" FOREIGN KEY ("referral_credited_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_invites_accepted_user_id_users_id_fk') THEN
  ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_progress_user_id_users_id_fk') THEN
  ALTER TABLE "referral_progress" ADD CONSTRAINT "referral_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_privacy_user_id_users_id_fk') THEN
  ALTER TABLE "user_privacy" ADD CONSTRAINT "user_privacy_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organisation_leader_permissions_organisation_id_organisation_id_fk') THEN
  ALTER TABLE "organisation_leader_permissions" ADD CONSTRAINT "organisation_leader_permissions_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organisation_leader_permissions_user_id_users_id_fk') THEN
  ALTER TABLE "organisation_leader_permissions" ADD CONSTRAINT "organisation_leader_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organisation_users_organisation_id_organisation_id_fk') THEN
  ALTER TABLE "organisation_users" ADD CONSTRAINT "organisation_users_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organisation_users_user_id_users_id_fk') THEN
  ALTER TABLE "organisation_users" ADD CONSTRAINT "organisation_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organisation_invite_organisation_id_organisation_id_fk') THEN
  ALTER TABLE "organisation_invite" ADD CONSTRAINT "organisation_invite_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_privacy_introduction_request_id_introduction_requests_id_fk') THEN
  ALTER TABLE "introduction_privacy" ADD CONSTRAINT "introduction_privacy_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_trust_score_history_user_id_users_id_fk') THEN
  ALTER TABLE "user_trust_score_history" ADD CONSTRAINT "user_trust_score_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_trust_score_history_rule_id_trust_score_rules_id_fk') THEN
  ALTER TABLE "user_trust_score_history" ADD CONSTRAINT "user_trust_score_history_rule_id_trust_score_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."trust_score_rules"("id") ON DELETE restrict ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_feedback_user_id_users_id_fk') THEN
  ALTER TABLE "system_feedback" ADD CONSTRAINT "system_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_credit_history_user_id_users_id_fk') THEN
  ALTER TABLE "user_credit_history" ADD CONSTRAINT "user_credit_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_credit_history_credit_rule_id_credit_rules_id_fk') THEN
  ALTER TABLE "user_credit_history" ADD CONSTRAINT "user_credit_history_credit_rule_id_credit_rules_id_fk" FOREIGN KEY ("credit_rule_id") REFERENCES "public"."credit_rules"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_credit_history_introduction_request_id_introduction_requests_id_fk') THEN
  ALTER TABLE "user_credit_history" ADD CONSTRAINT "user_credit_history_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_credit_history_payout_history_id_payout_history_id_fk') THEN
  ALTER TABLE "user_credit_history" ADD CONSTRAINT "user_credit_history_payout_history_id_payout_history_id_fk" FOREIGN KEY ("payout_history_id") REFERENCES "public"."payout_history"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_credit_awards_user_id_users_id_fk') THEN
  ALTER TABLE "user_credit_awards" ADD CONSTRAINT "user_credit_awards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_credit_awards_credit_rule_id_credit_rules_id_fk') THEN
  ALTER TABLE "user_credit_awards" ADD CONSTRAINT "user_credit_awards_credit_rule_id_credit_rules_id_fk" FOREIGN KEY ("credit_rule_id") REFERENCES "public"."credit_rules"("id") ON DELETE restrict ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_events_invite_id_user_invites_id_fk') THEN
  ALTER TABLE "email_events" ADD CONSTRAINT "email_events_invite_id_user_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."user_invites"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permission_role_id_roles_id_fk') THEN
  ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_refunds_introduction_request_id_introduction_requests_id_fk') THEN
  ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_refunds_introduction_transaction_id_introduction_transactions_id_fk') THEN
  ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_introduction_transaction_id_introduction_transactions_id_fk" FOREIGN KEY ("introduction_transaction_id") REFERENCES "public"."introduction_transactions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_refunds_payment_stage_id_payment_stages_id_fk') THEN
  ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_payment_stage_id_payment_stages_id_fk" FOREIGN KEY ("payment_stage_id") REFERENCES "public"."payment_stages"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_refunds_initiated_by_user_id_users_id_fk') THEN
  ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_initiated_by_user_id_users_id_fk" FOREIGN KEY ("initiated_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_fulfillment_attempts_introduction_request_id_introduction_requests_id_fk') THEN
  ALTER TABLE "introduction_fulfillment_attempts" ADD CONSTRAINT "introduction_fulfillment_attempts_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_fulfillment_attempts_connector_id_users_id_fk') THEN
  ALTER TABLE "introduction_fulfillment_attempts" ADD CONSTRAINT "introduction_fulfillment_attempts_connector_id_users_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_users_id_fk') THEN
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_role_id_roles_id_fk') THEN
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'queue_enrichments_user_id_users_id_fk') THEN
  ALTER TABLE "queue_enrichments" ADD CONSTRAINT "queue_enrichments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'queue_enrichments_enriched_contact_id_contacts_id_fk') THEN
  ALTER TABLE "queue_enrichments" ADD CONSTRAINT "queue_enrichments_enriched_contact_id_contacts_id_fk" FOREIGN KEY ("enriched_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_configurations_user_id_users_id_fk') THEN
  ALTER TABLE "user_configurations" ADD CONSTRAINT "user_configurations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_shares_introduction_request_id_introduction_requests_id_fk') THEN
  ALTER TABLE "marketplace_shares" ADD CONSTRAINT "marketplace_shares_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_shares_sharer_id_users_id_fk') THEN
  ALTER TABLE "marketplace_shares" ADD CONSTRAINT "marketplace_shares_sharer_id_users_id_fk" FOREIGN KEY ("sharer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
ALTER TABLE "marketplace_claims" DROP CONSTRAINT IF EXISTS "marketplace_claims_status_check";--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_claims' AND column_name = 'sources_checked' AND table_schema = 'public') THEN
  ALTER TABLE "marketplace_claims" ADD COLUMN "sources_checked" text[] DEFAULT '{}'::text[];
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_claims' AND column_name = 'matched_contact_id' AND table_schema = 'public') THEN
  ALTER TABLE "marketplace_claims" ADD COLUMN "matched_contact_id" bigint;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_claims' AND column_name = 'matched_source' AND table_schema = 'public') THEN
  ALTER TABLE "marketplace_claims" ADD COLUMN "matched_source" varchar(50);
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_claims_status_check') THEN
  ALTER TABLE "marketplace_claims" ADD CONSTRAINT "marketplace_claims_status_check" CHECK ("marketplace_claims"."status" IN ('pending', 'verifying', 'verified', 'completed', 'failed', 'in_progress'));
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_claims_introduction_request_id_introduction_requests_id_fk') THEN
  ALTER TABLE "marketplace_claims" ADD CONSTRAINT "marketplace_claims_introduction_request_id_introduction_requests_id_fk" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_claims_claimer_id_users_id_fk') THEN
  ALTER TABLE "marketplace_claims" ADD CONSTRAINT "marketplace_claims_claimer_id_users_id_fk" FOREIGN KEY ("claimer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_claims_sharer_id_users_id_fk') THEN
  ALTER TABLE "marketplace_claims" ADD CONSTRAINT "marketplace_claims_sharer_id_users_id_fk" FOREIGN KEY ("sharer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_claims_matched_contact_id_contacts_id_fk') THEN
  ALTER TABLE "marketplace_claims" ADD CONSTRAINT "marketplace_claims_matched_contact_id_contacts_id_fk" FOREIGN KEY ("matched_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_share_events_share_id_marketplace_shares_id_fk') THEN
  ALTER TABLE "marketplace_share_events" ADD CONSTRAINT "marketplace_share_events_share_id_marketplace_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."marketplace_shares"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_email" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_phone_number" ON "contacts" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_source" ON "contacts" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_original_importer_id" ON "contacts" USING btree ("original_importer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_enrichment_id" ON "contacts" USING btree ("enrichment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_sensitive_normalized_email_hash" ON "contact_sensitive_data" USING btree ("normalized_email_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_sensitive_normalized_phone_hash" ON "contact_sensitive_data" USING btree ("normalized_phone_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_sensitive_linkedin_hash" ON "contact_sensitive_data" USING btree ("linkedin_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_sensitive_normalized_secondary_email_hash" ON "contact_sensitive_data" USING btree ("normalized_secondary_email_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_relationships_contact_user" ON "contact_relationships" USING btree ("contact_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_enrichments_contact_id" ON "contact_enrichments" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_enrichments_enrichment_request_id" ON "contact_enrichments" USING btree ("enrichment_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_enrichments_enrichment_status" ON "contact_enrichments" USING btree ("enrichment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_requests_meeting_completed" ON "introduction_requests" USING btree ("meeting_completed_by_requester");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_requests_requester_bounty_stages_id" ON "introduction_requests" USING btree ("requester_bounty_stages_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_requests_requester" ON "introduction_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_requests_status" ON "introduction_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_requests_bounty_stages_id" ON "introduction_requests" USING btree ("bounty_stages_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_intro_requests_accepted_by" ON "introduction_requests" USING btree ("accepted_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_requests_booking_token" ON "introduction_requests" USING btree ("booking_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_requests_contact" ON "introduction_requests" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_requests_requester_id" ON "introduction_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_requester_feedback_completed" ON "introduction_requests" USING btree ("requester_id","requester_feedback_completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_requests_connector_feedback_completed" ON "introduction_requests" USING btree ("connector_feedback_completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_intro_transactions_request" ON "introduction_transactions" USING btree ("introduction_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_intro_transactions_overall_status" ON "introduction_transactions" USING btree ("overall_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_intro_transactions_payment_method" ON "introduction_transactions" USING btree ("payment_method_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_stages_transaction_status" ON "payment_stages" USING btree ("transaction_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_stages_intent" ON "payment_stages" USING btree ("intent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_feedback_introduction_id" ON "introduction_feedback" USING btree ("introduction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_feedback_users" ON "introduction_feedback" USING btree ("feedback_from_user_id","feedback_to_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_feedback_created_at" ON "introduction_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_feedback_type" ON "introduction_feedback" USING btree ("feedback_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_feedback_user_type" ON "introduction_feedback" USING btree ("introduction_id","feedback_from_user_id","feedback_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_feedback_meeting_completed" ON "introduction_feedback" USING btree ("meeting_completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_logs_request_id" ON "introduction_email_logs" USING btree ("introduction_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_logs_resend_id" ON "introduction_email_logs" USING btree ("resend_email_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_logs_connector_id" ON "introduction_email_logs" USING btree ("connector_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_logs_status" ON "introduction_email_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ipc_request_id" ON "introduction_potential_connectors" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ipc_potential_connector_id" ON "introduction_potential_connectors" USING btree ("potential_connector_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ipc_status" ON "introduction_potential_connectors" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_calendar_integrations_user_id" ON "calendar_integrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_calendar_integrations_provider" ON "calendar_integrations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduled_meetings_intro_request" ON "scheduled_meetings" USING btree ("introduction_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduled_meetings_requester" ON "scheduled_meetings" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduled_meetings_status" ON "scheduled_meetings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduled_meetings_date" ON "scheduled_meetings" USING btree ("meeting_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payout_history_connector" ON "payout_history" USING btree ("connector_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payout_history_intro_request" ON "payout_history" USING btree ("introduction_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payout_history_status" ON "payout_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payout_history_payout_released" ON "payout_history" USING btree ("payout_released");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payout_history_stripe_transfer" ON "payout_history" USING btree ("stripe_transfer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payout_history_stripe_payout" ON "payout_history" USING btree ("stripe_payout_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payout_history_intro_transaction" ON "payout_history" USING btree ("introduction_transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payout_history_is_marketplace" ON "payout_history" USING btree ("is_marketplace_deal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_imports_user_id" ON "contact_imports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_imports_provider" ON "contact_imports" USING btree ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_imports_integration_id" ON "contact_imports" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_imports_token_id" ON "contact_imports" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_imports_status" ON "contact_imports" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_imports_created_at" ON "contact_imports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_imports_user_provider" ON "contact_imports" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_provider_tokens_user_id" ON "contact_provider_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_provider_tokens_provider" ON "contact_provider_tokens" USING btree ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_provider_tokens_user_provider" ON "contact_provider_tokens" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_linkedin_imports_user_id" ON "linkedin_imports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_linkedin_imports_import_record_id" ON "linkedin_imports" USING btree ("import_record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_linkedin_imports_created_at" ON "linkedin_imports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_plan_stripe_plan_id" ON "subscription_plan" USING btree ("stripe_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_plan_is_active" ON "subscription_plan" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_plan_default_plan" ON "subscription_plan" USING btree ("default_plan");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_plan_price_subscription_plan_id" ON "subscription_plan_price" USING btree ("subscription_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_plan_price_stripe_price_id" ON "subscription_plan_price" USING btree ("stripe_price_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_plan_price_interval" ON "subscription_plan_price" USING btree ("interval");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_subscription_user_id" ON "user_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_subscription_subscription_plan_id" ON "user_subscription" USING btree ("subscription_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_subscription_stripe_subscription_id" ON "user_subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_subscription_price_id" ON "user_subscription" USING btree ("price_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_subscription_status" ON "user_subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_subscription_invite_id" ON "user_subscription" USING btree ("invite_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_subscription_coupon_applied" ON "user_subscription" USING btree ("coupon_applied");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_transactions_user_id" ON "subscription_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_transactions_subscription_id" ON "subscription_transactions" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_transactions_transaction_type" ON "subscription_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_transactions_created_at" ON "subscription_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invite_verification_logs_invite_id" ON "invite_verification_logs" USING btree ("invite_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invite_verification_logs_user_id" ON "invite_verification_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invite_verification_logs_verification_type" ON "invite_verification_logs" USING btree ("verification_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invite_verification_logs_verification_status" ON "invite_verification_logs" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invite_verification_logs_created_at" ON "invite_verification_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_audit_log_user_id" ON "referral_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_audit_log_invite_id" ON "referral_audit_log" USING btree ("invite_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_audit_log_referral_progress_id" ON "referral_audit_log" USING btree ("referral_progress_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_audit_log_action_type" ON "referral_audit_log" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_audit_log_created_at" ON "referral_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_invites_token" ON "user_invites" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_invites_email" ON "user_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_invites_status" ON "user_invites" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_invites_expires_at" ON "user_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_invites_invited_by" ON "user_invites" USING btree ("invited_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_invites_stripe_coupon" ON "user_invites" USING btree ("stripe_coupon_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_invites_email_status" ON "user_invites" USING btree ("email","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_progress_user_id" ON "referral_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_progress_earned_coupons" ON "referral_progress" USING gin ("earned_coupons");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_privacy_user_id" ON "user_privacy" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_privacy_domain" ON "user_privacy" USING btree ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_leader_perms_org_user" ON "organisation_leader_permissions" USING btree ("organisation_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_leader_perms_user" ON "organisation_leader_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_leader_perms_allowed_plans" ON "organisation_leader_permissions" USING gin ("allowed_plan_ids");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organisation_users_org_user_unique" ON "organisation_users" USING btree ("organisation_id","user_id") WHERE "organisation_users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_introduction_privacy_request_id" ON "introduction_privacy" USING btree ("introduction_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_max_concurrent_requests" ON "users" USING btree ("max_concurrent_requests");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trust_score_rules_slug" ON "trust_score_rules" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trust_score_rules_trigger_event" ON "trust_score_rules" USING btree ("trigger_event");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trust_score_rules_active" ON "trust_score_rules" USING btree ("is_active","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_trust_score_history_user_id" ON "user_trust_score_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_trust_score_history_rule_id" ON "user_trust_score_history" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_trust_score_history_triggered_at" ON "user_trust_score_history" USING btree ("triggered_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_trust_score_history_user_triggered" ON "user_trust_score_history" USING btree ("user_id","triggered_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_credit_history_user_id" ON "user_credit_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_credit_history_user_created" ON "user_credit_history" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_credit_history_type" ON "user_credit_history" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_credit_history_rule" ON "user_credit_history" USING btree ("credit_rule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_credit_awards_user_id" ON "user_credit_awards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_credit_awards_provider" ON "user_credit_awards" USING btree ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_events_resend_id" ON "email_events" USING btree ("resend_email_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_events_invite_id" ON "email_events" USING btree ("invite_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_events_type" ON "email_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_events_occurred_at" ON "email_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_configuration_key" ON "referral_configuration" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_referral_configuration_active" ON "referral_configuration" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_refunds_request" ON "payment_refunds" USING btree ("introduction_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_refunds_status" ON "payment_refunds" USING btree ("refund_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_refunds_transaction" ON "payment_refunds" USING btree ("introduction_transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fulfillment_attempts_request" ON "introduction_fulfillment_attempts" USING btree ("introduction_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fulfillment_attempts_connector" ON "introduction_fulfillment_attempts" USING btree ("connector_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fulfillment_attempts_stage" ON "introduction_fulfillment_attempts" USING btree ("failure_stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_shares_request" ON "marketplace_shares" USING btree ("introduction_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_shares_sharer" ON "marketplace_shares" USING btree ("sharer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_shares_sharer_code" ON "marketplace_shares" USING btree ("sharer_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_shares_platform" ON "marketplace_shares" USING btree ("platform");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_marketplace_shares_request_sharer_platform_unique" ON "marketplace_shares" USING btree ("introduction_request_id","sharer_id","platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_claims_request" ON "marketplace_claims" USING btree ("introduction_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_claims_claimer" ON "marketplace_claims" USING btree ("claimer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_claims_sharer" ON "marketplace_claims" USING btree ("sharer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_claims_status" ON "marketplace_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_claims_sharer_code" ON "marketplace_claims" USING btree ("sharer_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_share_events_share" ON "marketplace_share_events" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_share_events_type" ON "marketplace_share_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_share_events_created" ON "marketplace_share_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marketplace_share_events_ip" ON "marketplace_share_events" USING btree ("ip_hash");
DO $$ BEGIN ALTER TABLE "bounty_stage_history" DROP CONSTRAINT IF EXISTS "bounty_stage_history_changed_by_users_id_fk"; EXCEPTION WHEN undefined_table THEN null; END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "bounty_stage_history";--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "claim_verifications" DISABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN null; END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "claim_verifications" CASCADE;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "introduction_requests" DROP CONSTRAINT IF EXISTS "introduction_requests_status_check"; EXCEPTION WHEN undefined_table THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'introduction_requests_status_check') THEN
  ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_status_check" CHECK ("introduction_requests"."status" IN ('pending', 'accepted', 'declined', 'intro_sent', 'meeting_scheduled', 'meeting_booked', 'meeting_rescheduled', 'meeting_completed', 'peer_feedback', 'completed', 'email_failed'));
 END IF;
END $$;--> statement-breakpoint