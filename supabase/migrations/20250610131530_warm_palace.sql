/*
  # Add Status to Referral Bonuses

  1. Schema Changes
    - Add status column to referral_bonuses table if it doesn't exist
    - Set default value to 'completed'
    - Add reference_id column for tracking which user triggered the bonus

  2. Purpose
    - Ensure referral bonuses can be properly tracked and managed
    - Allow for pending/completed status tracking
    - Enable linking bonuses to specific users who triggered them
*/

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referral_bonuses' AND column_name = 'status'
  ) THEN
    ALTER TABLE referral_bonuses ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';
  END IF;
END $$;

-- Add reference_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referral_bonuses' AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE referral_bonuses ADD COLUMN reference_id UUID;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_status ON referral_bonuses(status);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_reference_id ON referral_bonuses(reference_id);