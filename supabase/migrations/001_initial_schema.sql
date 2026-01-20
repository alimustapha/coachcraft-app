-- 001_initial_schema.sql
-- CoachCraft Database Schema
-- Created: 2026-01-17

-- ============================================
-- 1. TABLES
-- ============================================

-- Users table (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User personal context for AI coaching
CREATE TABLE user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  values TEXT[] DEFAULT '{}',
  goals TEXT[] DEFAULT '{}',
  challenges TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- AI Coaches (pre-built and custom)
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  specialty TEXT NOT NULL CHECK (specialty IN ('productivity', 'goals', 'habits', 'mindset', 'focus', 'custom')),
  system_prompt TEXT NOT NULL,
  is_prebuilt BOOLEAN DEFAULT FALSE,
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat sessions between users and coaches
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily message count for rate limiting
CREATE TABLE daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  message_count INT DEFAULT 0,
  UNIQUE(user_id, date)
);

-- ============================================
-- 2. INDEXES
-- ============================================

-- Note: UNIQUE constraints auto-create indexes, so no separate index needed for:
-- - user_context(user_id) - covered by UNIQUE(user_id)
-- - daily_usage(user_id, date) - covered by UNIQUE(user_id, date)

CREATE INDEX idx_coaches_specialty ON coaches(specialty);
CREATE INDEX idx_coaches_is_prebuilt ON coaches(is_prebuilt);
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_coach_id ON chats(coach_id);
-- Composite index for fetching messages in a chat ordered by time
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at);

-- ============================================
-- 3. FUNCTIONS
-- ============================================

-- Atomic increment for daily usage (rate limiting)
-- Called by Edge function via service role (supabaseAdmin)
-- Always uses CURRENT_DATE to prevent backdating/future-dating attacks
-- RLS prevents direct client access (SELECT only policy)
CREATE OR REPLACE FUNCTION increment_daily_usage(p_user_id UUID)
RETURNS TABLE(message_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
BEGIN
  INSERT INTO daily_usage (user_id, date, message_count)
  VALUES (p_user_id, v_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET message_count = daily_usage.message_count + 1;

  RETURN QUERY SELECT daily_usage.message_count FROM daily_usage
  WHERE user_id = p_user_id AND date = v_date;
END;
$$;

-- Restrict function execution to service_role only (Edge function)
REVOKE EXECUTE ON FUNCTION increment_daily_usage(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_daily_usage(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION increment_daily_usage(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_daily_usage(UUID) TO service_role;

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

-- Profiles policies (CRUD)
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- User context policies
CREATE POLICY "Users manage own context" ON user_context
  FOR ALL USING (auth.uid() = user_id);

-- Coaches policies
CREATE POLICY "Users read public/prebuilt coaches" ON coaches
  FOR SELECT USING (is_prebuilt = TRUE OR is_public = TRUE OR creator_id = auth.uid());
CREATE POLICY "Users create own coaches" ON coaches
  FOR INSERT WITH CHECK (creator_id = auth.uid() AND is_prebuilt = FALSE AND is_public = FALSE);
CREATE POLICY "Users update own coaches" ON coaches
  FOR UPDATE USING (creator_id = auth.uid() AND is_prebuilt = FALSE)
  WITH CHECK (creator_id = auth.uid() AND is_prebuilt = FALSE AND is_public = FALSE);
CREATE POLICY "Users delete own coaches" ON coaches
  FOR DELETE USING (creator_id = auth.uid() AND is_prebuilt = FALSE);

-- Chats policies
CREATE POLICY "Users manage own chats" ON chats
  FOR ALL USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users manage own messages" ON messages
  FOR ALL USING (chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid()));

-- Daily usage policies
-- Users can only SELECT their usage; INSERT/UPDATE handled by SECURITY DEFINER function
CREATE POLICY "Users read own usage" ON daily_usage
  FOR SELECT USING (auth.uid() = user_id);
