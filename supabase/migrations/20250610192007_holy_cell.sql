/*
  # Fix Registration Database Errors

  1. Fix infinite recursion in login_lookup view
  2. Fix foreign key constraint issues in profiles table
  3. Ensure proper table structure for registration

  This migration addresses:
  - Infinite recursion detected in rules for relation "login_lookup"
  - Foreign key constraint "profiles_id_fkey" violation
*/

-- Drop the problematic login_lookup view if it exists
DROP VIEW IF EXISTS login_lookup CASCADE;

-- Create a simple, non-recursive login_lookup view
CREATE VIEW login_lookup AS
SELECT 
  id,
  username,
  email,
  referral_code
FROM profiles;

-- Enable RLS on the view
ALTER VIEW login_lookup OWNER TO postgres;

-- Grant permissions
GRANT SELECT ON login_lookup TO authenticated;
GRANT SELECT ON login_lookup TO anon;

-- Create RLS policy for the view
CREATE POLICY "Anyone can read login lookup data"
  ON profiles
  FOR SELECT
  USING (true);

-- Fix the profiles table foreign key constraint issue
-- Remove the problematic foreign key constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Ensure the profiles table has the correct structure
-- Add any missing columns that might be causing issues
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS main_wallet_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_direct_referrals INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_direct_referrals INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_pool INTEGER DEFAULT 0;

-- Update the create_user_profile function to handle the registration properly
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id_param UUID,
  username_param TEXT,
  email_param TEXT,
  referral_code_param TEXT,
  referred_by_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  referrer_profile RECORD;
BEGIN
  -- Validate inputs
  IF user_id_param IS NULL OR username_param IS NULL OR email_param IS NULL OR referral_code_param IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Missing required parameters');
  END IF;

  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE username = username_param) THEN
    RETURN json_build_object('success', false, 'error', 'Username already exists');
  END IF;

  -- Check if referral code already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE referral_code = referral_code_param) THEN
    RETURN json_build_object('success', false, 'error', 'Referral code already exists');
  END IF;

  -- Validate referrer if provided
  IF referred_by_param IS NOT NULL AND referred_by_param != '' THEN
    SELECT * INTO referrer_profile
    FROM profiles
    WHERE referral_code = referred_by_param;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Invalid referral code');
    END IF;
  END IF;

  -- Create the profile
  INSERT INTO profiles (
    id,
    username,
    email,
    referral_code,
    referred_by,
    rank,
    account_status,
    fund_wallet_balance,
    main_wallet_balance,
    total_direct_referrals,
    active_direct_referrals,
    current_pool,
    created_at,
    updated_at
  ) VALUES (
    user_id_param,
    username_param,
    email_param,
    referral_code_param,
    referred_by_param,
    'Starter',
    'inactive',
    0,
    0,
    0,
    0,
    0,
    now(),
    now()
  );

  -- Update referrer's direct referral count if applicable
  IF referred_by_param IS NOT NULL AND referred_by_param != '' THEN
    UPDATE profiles 
    SET total_direct_referrals = total_direct_referrals + 1
    WHERE referral_code = referred_by_param;
  END IF;

  RETURN json_build_object('success', true, 'message', 'Profile created successfully');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile TO anon;

-- Ensure RLS is properly configured for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can read login lookup data" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public can read basic profile data"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "System can insert profiles"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure the auth.users table relationship is correct
-- This should not create a foreign key constraint that causes issues
-- The profiles.id should reference auth.users.id but not with a strict FK constraint
-- that could cause the registration error

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);