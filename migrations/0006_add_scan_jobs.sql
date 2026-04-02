-- Migration: Add scan_jobs table for async scanning architecture
-- This table tracks the status of scan jobs processed via QStash background workers

CREATE TABLE IF NOT EXISTS "scan_jobs" (
  "id" varchar PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id" varchar REFERENCES "users"("id"),
  "url" text NOT NULL,
  "tags" text[] DEFAULT '{}'::text[],
  "status" varchar NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  "scan_id" integer REFERENCES "scans"("id"), -- populated when scan completes
  "qstash_message_id" varchar, -- QStash message ID for tracking
  "error" text, -- Error message if failed
  "progress" integer DEFAULT 0, -- Progress percentage (0-100)
  "progress_message" varchar, -- Current progress status message
  "created_at" timestamp DEFAULT now() NOT NULL,
  "started_at" timestamp, -- When processing started
  "completed_at" timestamp -- When processing completed/failed
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS "scan_job_user_idx" ON "scan_jobs" ("user_id");
CREATE INDEX IF NOT EXISTS "scan_job_status_idx" ON "scan_jobs" ("status");
CREATE INDEX IF NOT EXISTS "scan_job_created_idx" ON "scan_jobs" ("created_at");

