-- Add is_pro column to profiles table for subscription status
ALTER TABLE profiles ADD COLUMN is_pro BOOLEAN DEFAULT FALSE;

-- TODO: Production Enhancement - Secure is_pro Updates
-- Current MVP allows client-side is_pro updates for simplicity.
-- For production, implement one of these approaches:
-- 1. RevenueCat Webhook: Set up a webhook that calls an Edge Function to update is_pro
-- 2. Verification Edge Function: Client calls Edge Function after purchase, which verifies
--    with RevenueCat API and updates is_pro using service role
-- 3. RLS Policy: Restrict is_pro updates to service role only:
--    DROP POLICY IF EXISTS "Users update own profile" ON profiles;
--    CREATE POLICY "Users update own profile except is_pro" ON profiles
--      FOR UPDATE USING (auth.uid() = id)
--      WITH CHECK (auth.uid() = id AND is_pro = (SELECT is_pro FROM profiles WHERE id = auth.uid()));
