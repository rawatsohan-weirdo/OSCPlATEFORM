export interface UserProfile {
  id: string;
  full_name: string;
  mobile_number: string;
  role: "Student" | "Teacher" | "Admin";
  status: "pending" | "approved" | "rejected";
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Chapter {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

export interface Topic {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

export interface ContentItem {
  id: string;
  topic_id: string;
  type: "pdf" | "video" | "text";
  title: string;
  file_url: string | null;
  video_url: string | null;
  content_text: string | null;
  created_at: string;
}

export interface Test {
  id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

export interface Question {
  id: string;
  test_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  points: number;
  created_at: string;
}

export interface TestAttempt {
  id: string;
  test_id: string;
  user_id: string;
  score: number;
  total_points: number;
  percentage: number;
  answers: Record<string, string>;
  started_at: string;
  completed_at: string | null;
}
