-- PASSCO App - OTP codes table
-- Run this in the Supabase SQL Editor. Replaces the in-memory OTP Map so codes
-- survive server restarts / cold starts / multi-instance deployments.
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes (email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes (expires_at);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for otp" ON otp_codes;
CREATE POLICY "Allow all for otp" ON otp_codes FOR ALL USING (true) WITH CHECK (true);