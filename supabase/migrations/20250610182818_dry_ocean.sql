/*
  # Add Status and Reference ID to Referral Bonuses

  1. Schema Changes
    - Add status column to referral_bonuses table
    - Add reference_id column to referral_bonuses table
    - Set default status to 'completed'
    - Add indexes for performance

  2. Purpose
    - Enable tracking of bonus status (pending, completed, failed)
    - Link bonuses to specific users or transactions
    - Improve query performance for reporting
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_status ON referral_bonuses(status);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_reference_id ON referral_bonuses(reference_id);