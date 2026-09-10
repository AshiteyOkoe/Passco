-- PASSCO Quiz Competitions (challenges)
-- Run this file in the Supabase SQL editor. Idempotent / safe to re-run.

CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  class_level TEXT NOT NULL DEFAULT '',
  total_questions INTEGER NOT NULL DEFAULT 10,
  time_minutes INTEGER NOT NULL DEFAULT 10,
  max_participants INTEGER NOT NULL DEFAULT 4,
  question_ids JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'finished', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitions_created_by ON competitions (created_by);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions (status);
CREATE INDEX IF NOT EXISTS idx_competitions_created_at ON competitions (created_at DESC);

CREATE TABLE IF NOT EXISTS competition_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'playing', 'finished', 'abandoned')),
  is_creator BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  score NUMERIC NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  answered_questions INTEGER NOT NULL DEFAULT 0,
  time_spent INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_competition_participants_comp ON competition_participants (competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_participants_user ON competition_participants (user_id);

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications (user_id, is_read, created_at DESC);

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Auth is enforced at the Express (JWT) layer, so grant full access via RLS.
DROP POLICY IF EXISTS competitions_policy ON competitions;
CREATE POLICY competitions_policy ON competitions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS competition_participants_policy ON competition_participants;
CREATE POLICY competition_participants_policy ON competition_participants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS user_notifications_policy ON user_notifications;
CREATE POLICY user_notifications_policy ON user_notifications FOR ALL USING (true) WITH CHECK (true);