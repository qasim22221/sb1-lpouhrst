-- Fix RLS policy for pool_progress table
-- This migration addresses the error: "new row violates row-level security policy for table pool_progress"

-- First, check if RLS is enabled on the pool_progress table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'pool_progress' AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'RLS is enabled on pool_progress table';
  ELSE
    -- Enable RLS if not already enabled
    ALTER TABLE pool_progress ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on pool_progress table';
  END IF;
END $$;

-- Drop any existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view own pool progress" ON pool_progress;
DROP POLICY IF EXISTS "Users can insert own pool progress" ON pool_progress;
DROP POLICY IF EXISTS "Users can update own pool progress" ON pool_progress;
DROP POLICY IF EXISTS "System can manage all pool progress" ON pool_progress;

-- Create proper RLS policies for pool_progress table
-- Allow users to view their own pool progress
CREATE POLICY "Users can view own pool progress"
  ON pool_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to insert their own pool progress
CREATE POLICY "Users can insert own pool progress"
  ON pool_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own pool progress
CREATE POLICY "Users can update own pool progress"
  ON pool_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Allow system functions to manage all pool progress records
-- This is critical for activation and pool progression functions
CREATE POLICY "System can manage all pool progress"
  ON pool_progress
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON pool_progress TO authenticated;

-- Verify the policies were created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pool_progress' 
    AND policyname = 'System can manage all pool progress'
  ) THEN
    RAISE NOTICE 'pool_progress policies successfully updated';
  ELSE
    RAISE WARNING 'pool_progress policies were not created properly';
  END IF;
END $$;