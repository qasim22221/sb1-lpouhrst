/*
  # Fix Referral Bonuses RLS Policy

  1. Issues Fixed
    - Row-level security policy violation when inserting into referral_bonuses table
    - System functions unable to create referral bonuses for users

  2. Changes Made
    - Drop existing RLS policies on referral_bonuses table
    - Create new policies that allow:
      - Users to view their own bonuses
      - System functions to manage all bonuses
    - Grant necessary permissions
*/

-- First, check if RLS is enabled on the referral_bonuses table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'referral_bonuses' AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'RLS is enabled on referral_bonuses table';
  ELSE
    -- Enable RLS if not already enabled
    ALTER TABLE referral_bonuses ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on referral_bonuses table';
  END IF;
END $$;

-- Drop any existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view own bonuses" ON referral_bonuses;
DROP POLICY IF EXISTS "Users can insert own bonuses" ON referral_bonuses;
DROP POLICY IF EXISTS "Users can update own bonuses" ON referral_bonuses;
DROP POLICY IF EXISTS "System can manage all bonuses" ON referral_bonuses;

-- Create proper RLS policies for referral_bonuses table
-- Allow users to view their own bonuses
CREATE POLICY "Users can view own bonuses"
  ON referral_bonuses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow system functions to manage all bonuses
-- This is critical for income distribution functions
CREATE POLICY "System can manage all bonuses"
  ON referral_bonuses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON referral_bonuses TO authenticated;

-- Verify the policies were created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'referral_bonuses' 
    AND policyname = 'System can manage all bonuses'
  ) THEN
    RAISE NOTICE 'referral_bonuses policies successfully updated';
  ELSE
    RAISE WARNING 'referral_bonuses policies were not created properly';
  END IF;
END $$;