-- ============================================================
-- ONE STEP COACHING PLATFORM - COMPLETE SQL SCHEMA
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ============================================================

-- Step 1: Go to your Supabase Dashboard
-- Step 2: Click "SQL Editor" in the left sidebar
-- Step 3: Click "New query"
-- Step 4: Paste this ENTIRE file
-- Step 5: Click "Run" (or press Ctrl+Enter / Cmd+Enter)

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Users profile table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  mobile_number TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'Student' CHECK (role IN ('Student', 'Teacher', 'Admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topics table
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content items table
CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'video', 'text')),
  title TEXT NOT NULL,
  file_url TEXT,
  video_url TEXT,
  content_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tests table
CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INT DEFAULT 30 CHECK (duration_minutes > 0 AND duration_minutes <= 180),
  passing_score INT DEFAULT 60 CHECK (passing_score >= 0 AND passing_score <= 100),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  points INT DEFAULT 1 CHECK (points > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test attempts table
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score INT NOT NULL,
  total_points INT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_chapter ON public.topics(chapter_id);
CREATE INDEX IF NOT EXISTS idx_content_topic ON public.content_items(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_test ON public.questions(test_id);
CREATE INDEX IF NOT EXISTS idx_tests_subject ON public.tests(subject_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON public.test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test ON public.test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_completed ON public.test_attempts(completed_at);

-- ============================================================
-- 3. TRIGGERS
-- ============================================================

-- Auto-create user profile when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, mobile_number, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Student'),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

-- USERS policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "System can insert profiles" ON public.users
  FOR INSERT WITH CHECK (true);

-- SUBJECTS policies
CREATE POLICY "Anyone can view subjects" ON public.subjects
  FOR SELECT USING (true);

CREATE POLICY "Teachers and admins can create subjects" ON public.subjects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
  );

CREATE POLICY "Teachers can update own subjects" ON public.subjects
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Teachers can delete own subjects" ON public.subjects
  FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "Admins can update any subject" ON public.subjects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Admins can delete any subject" ON public.subjects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

-- CHAPTERS policies
CREATE POLICY "Anyone can view chapters" ON public.chapters
  FOR SELECT USING (true);

CREATE POLICY "Teachers and admins can create chapters" ON public.chapters
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
  );

CREATE POLICY "Teachers can update own chapters" ON public.chapters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.subjects
      WHERE id = public.chapters.subject_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete own chapters" ON public.chapters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.subjects
      WHERE id = public.chapters.subject_id AND created_by = auth.uid()
    )
  );

-- TOPICS policies
CREATE POLICY "Anyone can view topics" ON public.topics
  FOR SELECT USING (true);

CREATE POLICY "Teachers and admins can create topics" ON public.topics
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
  );

CREATE POLICY "Teachers can update own topics" ON public.topics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE c.id = public.topics.chapter_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete own topics" ON public.topics
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE c.id = public.topics.chapter_id AND s.created_by = auth.uid()
    )
  );

-- CONTENT ITEMS policies
CREATE POLICY "Anyone can view content" ON public.content_items
  FOR SELECT USING (true);

CREATE POLICY "Teachers and admins can create content" ON public.content_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
  );

CREATE POLICY "Teachers can update own content" ON public.content_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.chapters c ON t.chapter_id = c.id
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE t.id = public.content_items.topic_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete own content" ON public.content_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.chapters c ON t.chapter_id = c.id
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE t.id = public.content_items.topic_id AND s.created_by = auth.uid()
    )
  );

-- TESTS policies
CREATE POLICY "Users can view active tests" ON public.tests
  FOR SELECT USING (
    is_active = TRUE OR created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Teachers and admins can create tests" ON public.tests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
  );

CREATE POLICY "Teachers can update own tests" ON public.tests
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Teachers can delete own tests" ON public.tests
  FOR DELETE USING (created_by = auth.uid());

-- QUESTIONS policies
CREATE POLICY "Anyone can view questions" ON public.questions
  FOR SELECT USING (true);

CREATE POLICY "Teachers and admins can create questions" ON public.questions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
  );

CREATE POLICY "Teachers can update own questions" ON public.questions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tests WHERE id = public.questions.test_id AND created_by = auth.uid())
  );

CREATE POLICY "Teachers can delete own questions" ON public.questions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.tests WHERE id = public.questions.test_id AND created_by = auth.uid())
  );

-- TEST ATTEMPTS policies
CREATE POLICY "Students can view own attempts" ON public.test_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Teachers can view attempts for their tests" ON public.test_attempts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tests WHERE id = public.test_attempts.test_id AND created_by = auth.uid())
  );

CREATE POLICY "Admins can view all attempts" ON public.test_attempts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Users can insert own attempts" ON public.test_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 5. STORAGE BUCKET
-- ============================================================
-- NOTE: You need to create the storage bucket manually:
-- 1. Go to "Storage" in left sidebar
-- 2. Click "New bucket"
-- 3. Name it "coaching-assets"
-- 4. Keep it as PRIVATE (not public)
-- 5. Click "Create bucket"
--
-- Then run these storage policies in the SQL editor:

INSERT INTO storage.buckets (id, name, public)
VALUES ('coaching-assets', 'coaching-assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload profile pics" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'coaching-assets' AND
    (storage.foldername(name))[1] = 'profiles'
  );

CREATE POLICY "Users can view profile pics" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'coaching-assets'
  );

CREATE POLICY "Users can update own profile pics" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'coaching-assets' AND
    (storage.foldername(name))[1] = 'profiles'
  );

CREATE POLICY "Users can delete own profile pics" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'coaching-assets' AND
    (storage.foldername(name))[1] = 'profiles'
  );

CREATE POLICY "Teachers can upload content" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'coaching-assets' AND
    (storage.foldername(name))[1] = 'content' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Teacher', 'Admin'))
  );

CREATE POLICY "Everyone can view content files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'coaching-assets' AND
    (storage.foldername(name))[1] = 'content'
  );
