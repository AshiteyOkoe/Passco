-- =============================================================================
-- PASSCO CONTACT & QUESTION REPORT MIGRATION
--
-- Adds:
--   * contact_messages  - messages submitted from the public Contact Us page
--   * question_reports - in-examination "Report Question" submissions
--
-- WHERE TO RUN: Supabase SQL Editor  (idempotent - safe to re-run)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  account_type TEXT DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  attachment TEXT,
  attachment_name TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed')),
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT DEFAULT '',
  question_text TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  class_level TEXT DEFAULT '',
  assessment_type TEXT DEFAULT '',
  assessment_key TEXT DEFAULT '',
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT '',
  note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed')),
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages (status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_reports_status ON question_reports (status);
CREATE INDEX IF NOT EXISTS idx_question_reports_created ON question_reports (created_at DESC);