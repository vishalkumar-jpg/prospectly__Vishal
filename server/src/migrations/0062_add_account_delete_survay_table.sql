CREATE TABLE IF NOT EXISTS "prospectly"."account_deletion_surveys" (
	"id" serial PRIMARY KEY NOT NULL,
	"survey_data" jsonb NOT NULL,
	"email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);