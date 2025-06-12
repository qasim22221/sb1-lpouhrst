/*
  # Fix Profiles Table Foreign Key Constraint

  1. Issues Fixed
    - Remove problematic foreign key constraint on profiles.id
    - Ensure profiles table can accept auth.uid() as primary key
    - Fix RLS policies to work with auth.uid()
    - Update create_user_profile function to handle constraints properly

  2. Changes Made
    - Drop existing foreign key constraint that's causing issues
    - Update RLS policies for proper authentication
    - Fix the create_user_profile function
    - Ensure proper table structure for user registration
*/

-- First, let's check if there are any problematic foreign key constraints on profiles.id
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find and drop any foreign key constraints on profiles.id that might be causing issues
    FOR constraint_record IN 
        SELECT conname, conrelid::regclass as table_name
        FROM pg_constraint 
        WHERE confrelid = 'profiles'::regclass 
        AND contype = 'f'
        AND conkey = ARRAY[1] -- assuming id is the first column
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s', 
                      constraint_record.table_name, 
                      constraint_record.conname);
        RAISE NOTICE 'Dropped constraint % from table %', 
                     constraint_record.conname, 
                     constraint_record.table_name;
    END LOOP;
END $$;

-- Drop the problematic constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Ensure the profiles table has the correct structure
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Make sure the id column accepts UUID values from auth.users
ALTER TABLE profiles ALTER COLUMN id TYPE UUID USING id::UUID;

-- Update RLS policies to work properly with auth.uid()
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create proper RLS policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create or replace the user profile creation function
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

    -- Update referrer's referral count if applicable
    IF referrer_profile.id IS NOT NULL THEN
      UPDATE profiles 
      SET 
        total_direct_referrals = total_direct_referrals + 1,
        updated_at = now()
      WHERE id = referrer_profile.id;

      -- Award direct referral bonus to referrer if their account is active
      IF referrer_profile.account_status = 'active' THEN
        -- Add $5 direct referral bonus to referrer's main wallet
        UPDATE profiles 
        SET main_wallet_balance = main_wallet_balance + 5.00
        WHERE id = referrer_profile.id;

        -- Create referral bonus record
        INSERT INTO referral_bonuses (
          user_id, 
          bonus_type, 
          amount, 
          description, 
          status,
          created_at
        ) VALUES (
          referrer_profile.id,
          'direct_referral',
          5.00,
          'Direct referral bonus for ' || TRIM(username_param),
          'completed',
          now()
        );
      END IF;
    END IF;

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

-- Create a view for login lookup that doesn't have foreign key constraints
CREATE OR REPLACE VIEW login_lookup AS
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

-- Ensure all necessary tables exist with proper structure
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on referral_bonuses
ALTER TABLE referral_bonuses ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for referral_bonuses
CREATE POLICY "Users can view own bonuses"
  ON referral_bonuses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON referral_bonuses TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_user_id ON referral_bonuses(user_id);

-- Verify the table structure
DO $$
BEGIN
  -- Check if profiles table exists and has correct structure
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE EXCEPTION 'Profiles table does not exist';
  END IF;

  -- Check if required columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'Profiles table missing id column';
  END IF;

  RAISE NOTICE 'Profiles table structure verified successfully';
END $$;