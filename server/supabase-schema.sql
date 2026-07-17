-- PASSCO App - Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor to create all tables

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  institution TEXT DEFAULT '',
  grade_level TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  gender TEXT CHECK (gender IN ('male', 'female')),
  date_of_birth TIMESTAMPTZ,
  class_level TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ============================================================
-- 2. DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  extracted_text TEXT DEFAULT '',
  topics TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents (status);

-- ============================================================
-- 3. QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple-choice', 'true-false')),
  options TEXT[] DEFAULT '{}',
  correct_answer JSONB NOT NULL,
  explanation TEXT DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'expert')),
  topic TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  class_level TEXT DEFAULT '',
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_document_id ON questions (document_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions (created_by);
CREATE INDEX IF NOT EXISTS idx_questions_approved ON questions (approved);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions (topic);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions (subject);
CREATE INDEX IF NOT EXISTS idx_questions_class_level ON questions (class_level);

-- ============================================================
-- 4. QUIZZES
-- ============================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'expert')),
  time_limit INTEGER NOT NULL DEFAULT 600,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes (created_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_active ON quizzes (is_active);

-- ============================================================
-- 5. QUIZ_QUESTIONS (junction many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  PRIMARY KEY (quiz_id, question_id)
);

-- ============================================================
-- 6. QUIZ_ASSIGNED_USERS (junction many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_assigned_users (
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (quiz_id, user_id)
);

-- ============================================================
-- 7. RESULTS (quiz results)
-- ============================================================
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  incorrect_count INTEGER NOT NULL,
  skipped_count INTEGER NOT NULL,
  time_taken INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_results_user_id ON results (user_id);
CREATE INDEX IF NOT EXISTS idx_results_quiz_id ON results (quiz_id);
CREATE INDEX IF NOT EXISTS idx_results_user_completed ON results (user_id, completed_at DESC);

-- ============================================================
-- 8. RESULT_ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS result_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_answer JSONB,
  correct_answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_result_answers_result_id ON result_answers (result_id);

-- ============================================================
-- 9. ASSESSMENT_RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_level TEXT NOT NULL,
  subject TEXT DEFAULT '',
  difficulty TEXT NOT NULL,
  assessment_type TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  answered_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  grade TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  time_spent INTEGER NOT NULL,
  time_limit INTEGER NOT NULL,
  abandoned BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON assessment_results (user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_class_level ON assessment_results (class_level);
CREATE INDEX IF NOT EXISTS idx_assessment_results_subject ON assessment_results (subject);
CREATE INDEX IF NOT EXISTS idx_assessment_results_percentage ON assessment_results (percentage DESC);

-- ============================================================
-- 10. ASSESSMENT_ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS assessment_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_result_id UUID NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  user_answer JSONB,
  correct_answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  subject TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_result_id ON assessment_answers (assessment_result_id);

-- ============================================================
-- 11. BULK_UPLOADS
-- ============================================================
CREATE TABLE IF NOT EXISTS bulk_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'parsed', 'saving', 'completed', 'failed')),
  total_questions INTEGER DEFAULT 0,
  saved_questions INTEGER DEFAULT 0,
  subject_breakdown JSONB DEFAULT '{}',
  class_breakdown JSONB DEFAULT '{}',
  difficulty_breakdown JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_uploads_user_id ON bulk_uploads (user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_status ON bulk_uploads (status);

-- ============================================================
-- Disable RLS (Express handles auth via JWT)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_assigned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_uploads ENABLE ROW LEVEL SECURITY;

-- Permissive policies for service role / anon key (service role bypasses RLS anyway)
CREATE POLICY "Allow all for authenticated" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON quiz_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON quiz_assigned_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON result_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON assessment_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON assessment_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON bulk_uploads FOR ALL USING (true) WITH CHECK (true);
