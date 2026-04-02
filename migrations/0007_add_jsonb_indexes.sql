-- Migration: Add GIN indexes for JSONB columns
-- Purpose: Improve query performance for errors and warnings JSONB array queries
-- Date: 2026-01-09

-- GIN (Generalized Inverted Index) indexes are optimal for JSONB data types
-- They enable efficient querying of array elements and key-value containment

-- Index for errors JSONB column
-- Enables fast queries like: WHERE errors @> '["error message"]'
-- Or: WHERE errors ? 'some_error_key'
CREATE INDEX IF NOT EXISTS idx_scans_errors_gin ON scans USING GIN (errors);

-- Index for warnings JSONB column  
-- Enables fast queries like: WHERE warnings @> '["warning message"]'
CREATE INDEX IF NOT EXISTS idx_scans_warnings_gin ON scans USING GIN (warnings);

-- Index for botPermissions JSONB column (optional but useful for filtering)
-- Enables queries like: WHERE bot_permissions @> '{"GPTBot": "Allowed"}'
CREATE INDEX IF NOT EXISTS idx_scans_bot_permissions_gin ON scans USING GIN (bot_permissions);

-- Note: These indexes add some write overhead but significantly improve read performance
-- for reports, analytics, and filtering operations on scan results.
