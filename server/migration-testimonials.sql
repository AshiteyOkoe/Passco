-- ============================================================
-- PASSCO migration: testimonials feature table
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor)
-- Idempotent: safe to re-run.
--
-- This creates: testimonials
-- (Required for the public testimonials section and the
--  admin Testimonials manager).
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 16. TESTIMONIALS
-- ============================================================
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  quote TEXT NOT NULL,
  rating SMALLINT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  avatar_url TEXT NOT NULL DEFAULT '',
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON testimonials (is_approved);

-- Seed with three sample student testimonials (only if the table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM testimonials) THEN
    INSERT INTO testimonials (name, role, school, quote, rating, avatar_url, is_approved) VALUES
      ('Ama Serwaa', 'JHS 3 Student', 'St. Mary''s JHS', 'Passco changed how I prepare for BECE. The mock exams and instant feedback made me confident going into my exams.', 5, '', true),
      ('Kojo Mensah', 'JHS 2 Student', 'Presbyterian Boys JHS', 'I used to struggle with Maths until I started practicing daily on Passco. My average score jumped from 55% to 78%.', 5, '', true),
      ('Efua Adjei', 'JHS 1 Student', 'Achimota JHS', 'The subject practice is really helpful. I love tracking my progress and seeing my weak areas so I know exactly what to revise.', 5, '', true);
  END IF;
END $$;

-- ============================================================
-- RLS (service role bypasses RLS; policies mirror app schema file)
-- ============================================================
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON testimonials FOR ALL USING (true) WITH CHECK (true);