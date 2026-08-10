CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"input" text NOT NULL,
	"reply" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
