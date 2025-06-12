-- P2P Transfer System Database Schema

-- P2P Transfers Table
CREATE TABLE IF NOT EXISTS p2p_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL CHECK (net_amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('username', 'referral_code', 'email')),
  receiver_identifier TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  failed_reason TEXT,
  
  -- Constraints
  CONSTRAINT different_users CHECK (sender_id != receiver_id),
  CONSTRAINT valid_net_amount CHECK (net_amount = amount - fee)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_sender ON p2p_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_receiver ON p2p_transfers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_status ON p2p_transfers(status);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_created_at ON p2p_transfers(created_at);

-- Add new transaction types to fund_wallet_transactions
-- This is handled by the application when creating transactions

-- Function to process P2P transfer
CREATE OR REPLACE FUNCTION process_p2p_transfer(
  sender_id_param UUID,
  receiver_id_param UUID,
  amount_param DECIMAL(10,2),
  transfer_type_param TEXT,
  receiver_identifier_param TEXT,
  description_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  sender_profile RECORD;
  receiver_profile RECORD;
  transfer_id UUID;
  fee_amount DECIMAL(10,2) := 0; -- P2P transfers are free
  net_amount DECIMAL(10,2);
BEGIN
  -- Validate amount
  IF amount_param <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Invalid transfer amount');
  END IF;

  -- Calculate net amount (no fees for P2P transfers)
  net_amount := amount_param - fee_amount;

  -- Get sender profile
  SELECT * INTO sender_profile
  FROM profiles
  WHERE id = sender_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Sender not found');
  END IF;

  -- Check sender balance
  IF sender_profile.fund_wallet_balance < amount_param THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  -- Get receiver profile
  SELECT * INTO receiver_profile
  FROM profiles
  WHERE id = receiver_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Receiver not found');
  END IF;

  -- Create transfer record
  INSERT INTO p2p_transfers (
    sender_id, receiver_id, amount, fee, net_amount,
    transfer_type, receiver_identifier, description, status
  ) VALUES (
    sender_id_param, receiver_id_param, amount_param, fee_amount, net_amount,
    transfer_type_param, receiver_identifier_param, description_param, 'completed'
  ) RETURNING id INTO transfer_id;

  -- Update sender balance
  UPDATE profiles 
  SET fund_wallet_balance = fund_wallet_balance - amount_param
  WHERE id = sender_id_param;

  -- Update receiver balance
  UPDATE profiles 
  SET fund_wallet_balance = fund_wallet_balance + net_amount
  WHERE id = receiver_id_param;

  -- Create transaction records
  INSERT INTO fund_wallet_transactions (
    user_id, transaction_type, amount, balance_before, balance_after,
    reference_id, description
  ) VALUES (
    sender_id_param, 'p2p_send', -amount_param,
    sender_profile.fund_wallet_balance,
    sender_profile.fund_wallet_balance - amount_param,
    transfer_id,
    COALESCE(description_param, 'P2P transfer to ' || receiver_profile.username)
  );

  INSERT INTO fund_wallet_transactions (
    user_id, transaction_type, amount, balance_before, balance_after,
    reference_id, description
  ) VALUES (
    receiver_id_param, 'p2p_receive', net_amount,
    receiver_profile.fund_wallet_balance,
    receiver_profile.fund_wallet_balance + net_amount,
    transfer_id,
    COALESCE(description_param, 'P2P transfer from ' || sender_profile.username)
  );

  RETURN json_build_object(
    'success', true,
    'transfer_id', transfer_id,
    'message', 'Transfer completed successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user transfer history (fixed column reference)
CREATE OR REPLACE FUNCTION get_user_transfer_history(user_id_param UUID, limit_param INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  amount DECIMAL(10,2),
  fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  status TEXT,
  transfer_type TEXT,
  receiver_identifier TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sender_username TEXT,
  sender_referral_code TEXT,
  receiver_username TEXT,
  receiver_referral_code TEXT,
  is_sender BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.sender_id,
    t.receiver_id,
    t.amount,
    t.fee,
    t.net_amount,
    t.status,
    t.transfer_type,
    t.receiver_identifier,
    t.description,
    t.created_at,
    t.completed_at,
    sp.username as sender_username,
    sp.referral_code as sender_referral_code,
    rp.username as receiver_username,
    rp.referral_code as receiver_referral_code,
    (t.sender_id = user_id_param) as is_sender
  FROM p2p_transfers t
  LEFT JOIN profiles sp ON t.sender_id = sp.id
  LEFT JOIN profiles rp ON t.receiver_id = rp.id
  WHERE t.sender_id = user_id_param OR t.receiver_id = user_id_param
  ORDER BY t.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to search users for P2P transfers
CREATE OR REPLACE FUNCTION search_users_for_p2p(
  search_term TEXT,
  search_type TEXT,
  current_user_id UUID
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  referral_code TEXT,
  email TEXT,
  rank TEXT,
  account_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.referral_code,
    p.email,
    p.rank,
    p.account_status
  FROM profiles p
  WHERE p.id != current_user_id
    AND (
      CASE search_type
        WHEN 'username' THEN p.username ILIKE '%' || search_term || '%'
        WHEN 'referral_code' THEN p.referral_code = UPPER(search_term)
        WHEN 'email' THEN p.email ILIKE '%' || search_term || '%'
        ELSE false
      END
    )
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for P2P transfers
ALTER TABLE p2p_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view their own transfers (sent or received)
CREATE POLICY "Users can view own transfers"
  ON p2p_transfers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can create transfers as sender
CREATE POLICY "Users can create transfers as sender"
  ON p2p_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Users cannot update or delete transfers (immutable records)
-- No update/delete policies needed as transfers should be immutable

-- Grant necessary permissions
GRANT SELECT, INSERT ON p2p_transfers TO authenticated;
GRANT EXECUTE ON FUNCTION process_p2p_transfer TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_transfer_history TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_for_p2p TO authenticated;