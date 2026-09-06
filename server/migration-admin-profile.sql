-- =============================================================================
-- PASSCO ADMIN PROFILE MIGRATION
--
-- Adds administration profile support to the `users` table:
--   * Editable profile fields (phone, username, job title, department)
--   * last_login tracking
--   * Session revocation (token_version) - powers "Sign Out Everywhere"
--   * Account deactivation (is_active)
--   * Persisted preferences (preferences JSONB) - notifications, appearance,
--     language, timezone, density
--
-- WHERE TO RUN: Supabase SQL Editor  (idempotent - safe to re-run)
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Usernames must be unique when present
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
  ON users (username)
  WHERE username IS NOT NULL AND username <> '';