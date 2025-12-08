-- Migration: Add Stripe subscription support
-- Adds stripe_customer_id to users and creates subscription-related tables

-- Add stripe_customer_id to users table
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar UNIQUE;

--> statement-breakpoint

-- Create subscriptions table
CREATE TABLE "subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL,
  "stripe_subscription_id" varchar NOT NULL UNIQUE,
  "stripe_price_id" varchar NOT NULL,
  "stripe_product_id" varchar,
  "status" varchar NOT NULL,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "canceled_at" timestamp,
  "trial_start" timestamp,
  "trial_end" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- Create subscription_events table for webhook tracking
CREATE TABLE "subscription_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "subscription_id" integer,
  "stripe_event_id" varchar NOT NULL UNIQUE,
  "event_type" varchar NOT NULL,
  "event_data" jsonb,
  "processed_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- Create subscription_plans table
CREATE TABLE "subscription_plans" (
  "id" serial PRIMARY KEY NOT NULL,
  "stripe_price_id" varchar NOT NULL UNIQUE,
  "stripe_product_id" varchar NOT NULL,
  "name" varchar NOT NULL,
  "description" text,
  "amount" integer NOT NULL,
  "currency" varchar NOT NULL DEFAULT 'usd',
  "interval" varchar NOT NULL,
  "interval_count" integer NOT NULL DEFAULT 1,
  "features" jsonb DEFAULT '[]'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- Create indexes
CREATE INDEX "subscription_user_idx" ON "subscriptions" USING btree ("user_id");
CREATE INDEX "subscription_stripe_id_idx" ON "subscriptions" USING btree ("stripe_subscription_id");
