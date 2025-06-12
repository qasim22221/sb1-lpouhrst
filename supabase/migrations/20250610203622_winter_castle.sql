-- Fix the error related to the non-existent main_wallet_transactions table
-- First, check if the policy exists and drop it if it does
DO $$
BEGIN
  -- Check if the policy exists on the non-existent table
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'main_wallet_transactions' 
    AND policyname = 'main_wallet_user_access'
  ) THEN
    -- If it exists (which it shouldn't), drop it
    EXECUTE 'DROP POLICY IF EXISTS "main_wallet_user_access" ON main_wallet_transactions';
    RAISE NOTICE 'Dropped policy main_wallet_user_access on main_wallet_transactions';
  ELSE
    RAISE NOTICE 'Policy main_wallet_user_access on main_wallet_transactions does not exist';
  END IF;
  
  -- Check if the table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'main_wallet_transactions'
  ) THEN
    RAISE NOTICE 'Table main_wallet_transactions exists';
  ELSE
    RAISE NOTICE 'Table main_wallet_transactions does not exist';
    
    -- We don't need to create this table as the application uses fund_wallet_transactions instead
    -- Just log that we're skipping creation
    RAISE NOTICE 'Skipping creation of main_wallet_transactions as it is not used in the application';
  END IF;
END $$;

-- Ensure fund_wallet_transactions has the correct RLS policy
DROP POLICY IF EXISTS "fund_wallet_user_access" ON fund_wallet_transactions;

CREATE POLICY "fund_wallet_user_access" ON fund_wallet_transactions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verify the policy was created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fund_wallet_transactions' 
    AND policyname = 'fund_wallet_user_access'
  ) THEN
    RAISE NOTICE 'fund_wallet_transactions policy successfully updated';
  ELSE
    RAISE WARNING 'fund_wallet_transactions policy was not created';
  END IF;
END $$;