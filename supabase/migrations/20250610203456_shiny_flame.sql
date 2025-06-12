/*
  # Fix RLS Policies - Replace current_user::uuid with auth.uid()

  1. Security Policy Updates
    - Drop existing policies that use current_user::uuid
    - Create new policies using auth.uid() instead
    - This fixes the "invalid input syntax for type uuid: 'authenticated'" error

  2. Tables Affected
    - fund_wallet_transactions
    - Any other tables with similar RLS policy issues

  The error occurs because current_user returns the database role name (e.g., 'authenticated')
  which cannot be cast to UUID. We need to use auth.uid() to get the actual user's UUID.
*/

-- Drop the existing problematic policy on fund_wallet_transactions
DROP POLICY IF EXISTS "fund_wallet_user_access" ON fund_wallet_transactions;

-- Create the corrected policy using auth.uid() instead of current_user::uuid
CREATE POLICY "fund_wallet_user_access" ON fund_wallet_transactions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Check if there are any other policies with similar issues and fix them
-- Drop and recreate any other policies that might have the same issue

-- For profiles table (if it has similar issues)
DROP POLICY IF EXISTS "profiles_user_access" ON profiles;
CREATE POLICY "profiles_user_access" ON profiles
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- For main_wallet_transactions table (if it exists and has similar issues)
DROP POLICY IF EXISTS "main_wallet_user_access" ON main_wallet_transactions;
CREATE POLICY "main_wallet_user_access" ON main_wallet_transactions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verify the policies were created successfully
DO $$
BEGIN
    -- Check if the fund_wallet_transactions policy exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fund_wallet_transactions' 
        AND policyname = 'fund_wallet_user_access'
    ) THEN
        RAISE NOTICE 'fund_wallet_transactions policy successfully updated';
    ELSE
        RAISE WARNING 'fund_wallet_transactions policy was not created';
    END IF;
    
    -- Check if the profiles policy exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'profiles_user_access'
    ) THEN
        RAISE NOTICE 'profiles policy successfully updated';
    ELSE
        RAISE WARNING 'profiles policy was not created';
    END IF;
END $$;