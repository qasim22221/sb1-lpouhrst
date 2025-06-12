/*
  # Update Fund Wallet Transaction Types

  1. Schema Changes
    - Add 'activation' to allowed transaction types in fund_wallet_transactions table
    - Ensure both initial activation and reactivation work properly

  2. Security
    - Maintain existing constraints while adding new valid type
*/

-- Update the check constraint to include 'activation' as a valid transaction type
ALTER TABLE fund_wallet_transactions 
DROP CONSTRAINT IF EXISTS fund_wallet_transactions_transaction_type_check;

ALTER TABLE fund_wallet_transactions 
ADD CONSTRAINT fund_wallet_transactions_transaction_type_check 
CHECK (transaction_type IN ('deposit', 'withdrawal', 'p2p_send', 'p2p_receive', 'activation'));