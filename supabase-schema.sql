-- ============================================================
-- ONE STEP COACHING PLATFORM - COMPLETE SUPABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor.
-- It is safe to run more than once.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. TABLES
-- ============================================================

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

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
-- 3. HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_status()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'Admin' FROM public.users WHERE id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role IN ('Teacher', 'Admin') FROM public.users WHERE id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT status = 'approved' FROM public.users WHERE id = auth.uid()), false)
$$;

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_profile_count INTEGER;
  requested_role TEXT;
BEGIN
  SELECT COUNT(*) INTO existing_profile_count FROM public.users;
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Student');

  IF requested_role NOT IN ('Student', 'Teacher') THEN
    requested_role := 'Student';
  END IF;

  INSERT INTO public.users (id, full_name, mobile_number, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile_number', ''),
    CASE WHEN existing_profile_count = 0 THEN 'Admin' ELSE requested_role END,
    CASE WHEN existing_profile_count = 0 THEN 'approved' ELSE 'pending' END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own editable profile fields" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "System can insert profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "System can insert profiles" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own editable profile fields" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.current_user_role()
    AND status = public.current_user_status()
  );

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE TO authenticated USING (public.is_admin() AND auth.uid() <> id);

DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Approved users can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Teachers and admins can create subjects" ON public.subjects;
DROP POLICY IF EXISTS "Teachers can update own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Teachers can delete own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can update any subject" ON public.subjects;
DROP POLICY IF EXISTS "Admins can delete any subject" ON public.subjects;

CREATE POLICY "Approved users can view subjects" ON public.subjects
  FOR SELECT TO authenticated USING (public.is_approved_user());

CREATE POLICY "Teachers and admins can create subjects" ON public.subjects
  FOR INSERT TO authenticated WITH CHECK (public.is_teacher_or_admin() AND created_by = auth.uid());

CREATE POLICY "Teachers can update own subjects" ON public.subjects
  FOR UPDATE TO authenticated USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Teachers can delete own subjects" ON public.subjects
  FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Admins can update any subject" ON public.subjects
  FOR UPDATE TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete any subject" ON public.subjects
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view chapters" ON public.chapters;
DROP POLICY IF EXISTS "Approved users can view chapters" ON public.chapters;
DROP POLICY IF EXISTS "Teachers and admins can create chapters" ON public.chapters;
DROP POLICY IF EXISTS "Teachers can update own chapters" ON public.chapters;
DROP POLICY IF EXISTS "Teachers can delete own chapters" ON public.chapters;
DROP POLICY IF EXISTS "Admins can update any chapter" ON public.chapters;
DROP POLICY IF EXISTS "Admins can delete any chapter" ON public.chapters;

CREATE POLICY "Approved users can view chapters" ON public.chapters
  FOR SELECT TO authenticated USING (public.is_approved_user());

CREATE POLICY "Teachers and admins can create chapters" ON public.chapters
  FOR INSERT TO authenticated WITH CHECK (public.is_teacher_or_admin());

CREATE POLICY "Teachers can update own chapters" ON public.chapters
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.subjects WHERE id = public.chapters.subject_id AND created_by = auth.uid())
  );

CREATE POLICY "Teachers can delete own chapters" ON public.chapters
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.subjects WHERE id = public.chapters.subject_id AND created_by = auth.uid())
  );

CREATE POLICY "Admins can update any chapter" ON public.chapters
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete any chapter" ON public.chapters
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view topics" ON public.topics;
DROP POLICY IF EXISTS "Approved users can view topics" ON public.topics;
DROP POLICY IF EXISTS "Teachers and admins can create topics" ON public.topics;
DROP POLICY IF EXISTS "Teachers can update own topics" ON public.topics;
DROP POLICY IF EXISTS "Teachers can delete own topics" ON public.topics;
DROP POLICY IF EXISTS "Admins can update any topic" ON public.topics;
DROP POLICY IF EXISTS "Admins can delete any topic" ON public.topics;

CREATE POLICY "Approved users can view topics" ON public.topics
  FOR SELECT TO authenticated USING (public.is_approved_user());

CREATE POLICY "Teachers and admins can create topics" ON public.topics
  FOR INSERT TO authenticated WITH CHECK (public.is_teacher_or_admin());

CREATE POLICY "Teachers can update own topics" ON public.topics
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE c.id = public.topics.chapter_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete own topics" ON public.topics
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE c.id = public.topics.chapter_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can update any topic" ON public.topics
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete any topic" ON public.topics
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view content" ON public.content_items;
DROP POLICY IF EXISTS "Approved users can view content" ON public.content_items;
DROP POLICY IF EXISTS "Teachers and admins can create content" ON public.content_items;
DROP POLICY IF EXISTS "Teachers can update own content" ON public.content_items;
DROP POLICY IF EXISTS "Teachers can delete own content" ON public.content_items;
DROP POLICY IF EXISTS "Admins can update any content" ON public.content_items;
DROP POLICY IF EXISTS "Admins can delete any content" ON public.content_items;

CREATE POLICY "Approved users can view content" ON public.content_items
  FOR SELECT TO authenticated USING (public.is_approved_user());

CREATE POLICY "Teachers and admins can create content" ON public.content_items
  FOR INSERT TO authenticated WITH CHECK (public.is_teacher_or_admin());

CREATE POLICY "Teachers can update own content" ON public.content_items
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.chapters c ON t.chapter_id = c.id
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE t.id = public.content_items.topic_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete own content" ON public.content_items
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.chapters c ON t.chapter_id = c.id
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE t.id = public.content_items.topic_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can update any content" ON public.content_items
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete any content" ON public.content_items
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view active tests" ON public.tests;
DROP POLICY IF EXISTS "Approved users can view tests" ON public.tests;
DROP POLICY IF EXISTS "Teachers and admins can create tests" ON public.tests;
DROP POLICY IF EXISTS "Teachers can update own tests" ON public.tests;
DROP POLICY IF EXISTS "Teachers can delete own tests" ON public.tests;
DROP POLICY IF EXISTS "Admins can update any test" ON public.tests;
DROP POLICY IF EXISTS "Admins can delete any test" ON public.tests;

CREATE POLICY "Approved users can view tests" ON public.tests
  FOR SELECT TO authenticated USING (public.is_approved_user() AND (is_active = TRUE OR created_by = auth.uid() OR public.is_admin()));

CREATE POLICY "Teachers and admins can create tests" ON public.tests
  FOR INSERT TO authenticated WITH CHECK (public.is_teacher_or_admin() AND created_by = auth.uid());

CREATE POLICY "Teachers can update own tests" ON public.tests
  FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "Teachers can delete own tests" ON public.tests
  FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Admins can update any test" ON public.tests
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete any test" ON public.tests
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;
DROP POLICY IF EXISTS "Approved users can view questions" ON public.questions;
DROP POLICY IF EXISTS "Teachers and admins can create questions" ON public.questions;
DROP POLICY IF EXISTS "Teachers can update own questions" ON public.questions;
DROP POLICY IF EXISTS "Teachers can delete own questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can update any question" ON public.questions;
DROP POLICY IF EXISTS "Admins can delete any question" ON public.questions;

CREATE POLICY "Approved users can view questions" ON public.questions
  FOR SELECT TO authenticated USING (public.is_approved_user());

CREATE POLICY "Teachers and admins can create questions" ON public.questions
  FOR INSERT TO authenticated WITH CHECK (public.is_teacher_or_admin());

CREATE POLICY "Teachers can update own questions" ON public.questions
  FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.tests WHERE id = public.questions.test_id AND created_by = auth.uid()));

CREATE POLICY "Teachers can delete own questions" ON public.questions
  FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.tests WHERE id = public.questions.test_id AND created_by = auth.uid()));

CREATE POLICY "Admins can update any question" ON public.questions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete any question" ON public.questions
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Students can view own attempts" ON public.test_attempts;
DROP POLICY IF EXISTS "Teachers can view attempts for their tests" ON public.test_attempts;
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.test_attempts;
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.test_attempts;

CREATE POLICY "Students can view own attempts" ON public.test_attempts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Teachers can view attempts for their tests" ON public.test_attempts
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tests WHERE id = public.test_attempts.test_id AND created_by = auth.uid()));

CREATE POLICY "Admins can view all attempts" ON public.test_attempts
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Users can insert own attempts" ON public.test_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_approved_user());

-- ============================================================
-- 6. STORAGE BUCKET AND POLICIES
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('coaching-assets', 'coaching-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users can upload profile pics" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own profile pics" ON storage.objects;
DROP POLICY IF EXISTS "Users can view profile pics" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile pics" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile pics" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload content" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view content files" ON storage.objects;
DROP POLICY IF EXISTS "Approved users can view coaching assets" ON storage.objects;

CREATE POLICY "Users can upload own profile pics" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'coaching-assets'
    AND (storage.foldername(name))[1] = 'profiles'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can update own profile pics" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'coaching-assets'
    AND (storage.foldername(name))[1] = 'profiles'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete own profile pics" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'coaching-assets'
    AND (storage.foldername(name))[1] = 'profiles'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Teachers can upload content" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'coaching-assets'
    AND (storage.foldername(name))[1] = 'content'
    AND public.is_teacher_or_admin()
  );

CREATE POLICY "Approved users can view coaching assets" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'coaching-assets' AND public.is_approved_user());

-- ============================================================
-- 7. FIRST ADMIN NOTE
-- ============================================================
-- After this schema is installed, the first account registered in the app
-- is automatically created as role='Admin' and status='approved'.
-- All later Student/Teacher registrations remain pending until approved.
-- ============================================================
