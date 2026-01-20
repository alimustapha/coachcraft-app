-- 003_auto_create_profile.sql
-- Auto-create profile when user signs up via Supabase Auth
-- Created: 2026-01-18
--
-- Problem: The chats table has user_id referencing profiles(id), but new auth users
-- don't have a profiles row, causing foreign key violations on chat creation.
--
-- Solution: Trigger that creates a profile row when a new auth.users row is inserted.
--
-- Reference: profiles schema from 001_initial_schema.sql
--   - id UUID PRIMARY KEY (required, from auth.users.id)
--   - display_name TEXT (nullable)
--   - created_at/updated_at have NOW() defaults

-- ============================================
-- 1. FUNCTION
-- ============================================

-- Function to handle new user creation
-- Uses SECURITY DEFINER to access auth.users, with search_path set for security
-- Following pattern from increment_daily_usage() in 001_initial_schema.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    -- NULLIF handles empty strings from providers, falling back to email
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;  -- Idempotent: skip if profile already exists
  RETURN NEW;
END;
$$;

-- Restrict function execution (security hardening for SECURITY DEFINER)
-- The trigger will still work as it runs with elevated privileges
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- ============================================
-- 2. TRIGGER
-- ============================================

-- Drop existing trigger if it exists (idempotent migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger that fires after a new auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. BACKFILL EXISTING USERS
-- ============================================

-- Create profiles for existing auth users who don't have one
-- Uses NOT EXISTS (more robust than NOT IN with potential NULLs)
-- ON CONFLICT ensures this is idempotent (safe to run multiple times)
INSERT INTO public.profiles (id, display_name)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'display_name', ''), u.email)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. VERIFICATION QUERY (run manually after migration)
-- ============================================
-- SELECT
--   (SELECT COUNT(*) FROM auth.users) AS total_auth_users,
--   (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
--   (SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles)) AS missing_profiles;
-- Expected: missing_profiles = 0
