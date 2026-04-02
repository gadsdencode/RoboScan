-- Migration: Add promotional codes support
-- Creates tables for promotional code management and redemption tracking

-- Create promotional_codes table
CREATE TABLE "promotional_codes" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar NOT NULL UNIQUE,
  "description" text,
  "months_free" integer NOT NULL DEFAULT 1,
  "is_active" boolean NOT NULL DEFAULT true,
  "expires_at" timestamp,
  "max_uses" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- Create index on code for faster lookups
CREATE INDEX "promotional_code_idx" ON "promotional_codes" ("code");

--> statement-breakpoint

-- Create promotional_code_redemptions table
CREATE TABLE "promotional_code_redemptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "code_id" integer NOT NULL,
  "user_id" varchar NOT NULL,
  "subscription_id" integer,
  "redeemed_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "promotional_code_redemptions" ADD CONSTRAINT "redemptions_code_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."promotional_codes"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "promotional_code_redemptions" ADD CONSTRAINT "redemptions_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "promotional_code_redemptions" ADD CONSTRAINT "redemptions_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- Create indexes on redemptions table for faster lookups
CREATE INDEX "redemption_user_idx" ON "promotional_code_redemptions" ("user_id");
CREATE INDEX "redemption_code_idx" ON "promotional_code_redemptions" ("code_id");

