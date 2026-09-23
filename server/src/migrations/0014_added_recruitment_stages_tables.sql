CREATE TABLE "prospectly"."recruitment_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_key" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"stage_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recruitment_stages_stage_key_unique" UNIQUE("stage_key")
);
