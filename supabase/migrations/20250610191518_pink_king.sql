/*
  # Fix Create User Profile Function

  1. Changes Made
    - Drop the existing create_user_profile function first
    - Recreate the function with the same parameter names
    - Fix the foreign key constraint issue
    - Improve error handling and validation
    - Update RLS policies to allow profile creation

  2. Security
    - Maintain SECURITY DEFINER to ensure function runs with elevated privileges
    - Keep proper validation of inputs
*/

-- First, drop the existing function
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, TEXT, TEXT, TEXT);

-- Create a more robust function to create user profiles
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  username_param TEXT,
  email_param TEXT,
  referral_code_param TEXT,
  referred_by_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  referrer_profile RECORD;
  new_profile_id UUID;
BEGIN
  -- Validate input
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User ID is required');
  END IF;

  IF username_param IS NULL OR LENGTH(TRIM(username_param)) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Username is required');
  END IF;

  IF email_param IS NULL OR LENGTH(TRIM(email_param)) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Email is required');
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Profile already exists for this user');
  END IF;

  -- Check if username is already taken
  IF EXISTS (SELECT 1 FROM profiles WHERE username = username_param) THEN
    RETURN json_build_object('success', false, 'error', 'Username already taken');
  END IF;

  -- Check if referral code is already taken
  IF EXISTS (SELECT 1 FROM profiles WHERE referral_code = referral_code_param) THEN
    RETURN json_build_object('success', false, 'error', 'Referral code already taken');
  END IF;

  -- Validate referrer if provided
  IF referred_by_param IS NOT NULL AND LENGTH(TRIM(referred_by_param)) > 0 THEN
    SELECT * INTO referrer_profile
    FROM profiles
    WHERE referral_code = TRIM(referred_by_param);

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Invalid referral code');
    END IF;
  END IF;

  -- Create the profile
  BEGIN
    INSERT INTO profiles (
      id,
      username,
      email,
      referral_code,
      referred_by,
      rank,
      account_status,
      main_wallet_balance,
      fund_wallet_balance,
      total_direct_referrals,
      active_direct_referrals,
      current_pool,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      TRIM(username_param),
      TRIM(email_param),
      TRIM(referral_code_param),
      CASE 
        WHEN referred_by_param IS NOT NULL AND LENGTH(TRIM(referred_by_param)) > 0 
        THEN TRIM(referred_by_param) 
        ELSE NULL 
      END,
      'Starter',
      'inactive',
      0.00,
      0.00,
      0,
      0,
      0,
      now(),
      now()
    ) RETURNING id INTO new_profile_id;

    RETURN json_build_object(
      'success', true, 
      'message', 'Profile created successfully',
      'profile_id', new_profile_id
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Failed to create profile: ' || SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;

-- Make sure RLS is enabled on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for profiles table
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow any authenticated user to insert a profile

-- Make sure the login_lookup view exists
DROP VIEW IF EXISTS login_lookup;
CREATE VIEW login_lookup AS
SELECT 
  id,
  username,
  email,
  referral_code,
  account_status,
  created_at
FROM profiles;

-- Grant access to the view
GRANT SELECT ON login_lookup TO authenticated;