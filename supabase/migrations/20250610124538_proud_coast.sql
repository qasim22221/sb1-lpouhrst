/*
  # Fix fund_wallet_transactions constraint error

  1. Check existing transaction types
  2. Update constraint to include all valid types
  3. Handle any invalid data

  This migration fixes the constraint violation error by:
  - First checking what transaction types currently exist
  - Updating any invalid transaction types to valid ones
  - Then applying the correct constraint
*/

-- First, let's see what transaction types currently exist
DO $$
DECLARE
    existing_types TEXT[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT transaction_type) INTO existing_types
    FROM fund_wallet_transactions;
    
    RAISE NOTICE 'Existing transaction types: %', existing_types;
END $$;

-- Update any invalid transaction types to valid ones
UPDATE fund_wallet_transactions 
SET transaction_type = 'deposit'
WHERE transaction_type NOT IN ('deposit', 'withdrawal', 'p2p_send', 'p2p_receive', 'activation', 'admin_adjustment');

-- Drop the existing constraint
ALTER TABLE fund_wallet_transactions 
DROP CONSTRAINT IF EXISTS fund_wallet_transactions_transaction_type_check;

-- Add the updated constraint with all valid transaction types
ALTER TABLE fund_wallet_transactions 
ADD CONSTRAINT fund_wallet_transactions_transaction_type_check 
CHECK (transaction_type IN (
    'deposit', 
    'withdrawal', 
    'p2p_send', 
    'p2p_receive', 
    'activation',
    'admin_adjustment'
));

-- Verify the constraint was applied successfully
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'fund_wallet_transactions_transaction_type_check'
    ) THEN
        RAISE NOTICE 'Constraint successfully updated';
    ELSE
        RAISE EXCEPTION 'Failed to update constraint';
    END IF;
END $$;