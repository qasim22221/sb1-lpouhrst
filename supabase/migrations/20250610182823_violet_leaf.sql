/*
  # Fix Pool Progress Table

  1. Schema Changes
    - Add rank_requirement column to pool_progress table
    - Update existing rows with default values
    - Add NOT NULL constraint
    - Add index for performance

  2. Purpose
    - Fix missing column error in process_account_activation function
    - Ensure all pool entries have proper rank requirements
    - Maintain data integrity with NOT NULL constraint
*/

-- Add rank_requirement column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pool_progress' AND column_name = 'rank_requirement'
  ) THEN
    ALTER TABLE pool_progress ADD COLUMN rank_requirement TEXT;
  END IF;
END $$;

-- Update existing rows with default values based on pool number
UPDATE pool_progress
SET rank_requirement = 
  CASE pool_number
    WHEN 1 THEN 'Starter'
    WHEN 2 THEN 'Gold'
    WHEN 3 THEN 'Platinum'
    WHEN 4 THEN 'Diamond'
    ELSE 'Starter'
  END
WHERE rank_requirement IS NULL;

-- Add NOT NULL constraint
ALTER TABLE pool_progress ALTER COLUMN rank_requirement SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pool_progress_rank_requirement ON pool_progress(rank_requirement);