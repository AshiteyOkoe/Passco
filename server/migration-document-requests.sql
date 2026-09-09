-- =============================================================================
-- PASSCO STUDENT DOCUMENT REQUESTS MIGRATION
--
-- Students may no longer generate report cards or certificates themselves.
-- They submit a request; an admin approves it. This table tracks those
-- requests for report cards and certificates.
--
-- Adds:
--   * document_requests - pending/approved/rejected/cancelled student requests
--
-- WHERE TO RUN: Supabase SQL Editor  (idempotent - safe to re-run)
-- =============================================================================

CREATE TABLE IF NOT EXISTS document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('report', 'certificate')),
  academic_year TEXT NOT NULL DEFAULT '',
  term TEXT NOT NULL DEFAULT 'Full Year',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note TEXT DEFAULT '',
  report_id UUID REFERENCES report_cards(id) ON DELETE SET NULL,
  certificate_code TEXT UNIQUE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_requests_user ON document_requests (user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests (status, requested_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_requests_pending_unique ON document_requests (user_id, kind) WHERE status = 'pending';

-- RLS - permissive policy matching the rest of the schema (ownership enforced in controllers)
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON document_requests;
CREATE POLICY "Allow all for authenticated" ON document_requests FOR ALL USING (true) WITH CHECK (true);