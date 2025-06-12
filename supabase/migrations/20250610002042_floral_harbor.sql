/*
  # Sweep System Database Schema

  1. New Tables
    - `deposits` - Track all incoming deposits
    - `user_wallets` - Store user wallet addresses and encrypted private keys
    - `notifications` - System notifications for users

  2. Updates
    - Add sweep-related columns to existing tables
    - Add indexes for performance
    - Add RLS policies

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for user access
*/

-- Deposits Table
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  transaction_hash TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'swept', 'sweep_failed')),
  network TEXT NOT NULL DEFAULT 'BEP20',
  sweep_transaction_hash TEXT,
  airdrop_transaction_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Wallets Table (for deposit addresses)
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_address TEXT UNIQUE NOT NULL,
  private_key TEXT NOT NULL, -- Encrypted private key
  mnemonic TEXT, -- Encrypted mnemonic phrase
  network TEXT NOT NULL DEFAULT 'BEP20',
  is_monitored BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add sweep-related columns to withdrawals table if not exists
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS sweep_transaction_hash TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS airdrop_transaction_hash TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_wallet_address ON deposits(wallet_address);
CREATE INDEX IF NOT EXISTS idx_deposits_transaction_hash ON deposits(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_monitored ON user_wallets(is_monitored);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable RLS
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deposits
CREATE POLICY "Users can view own deposits"
  ON deposits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage all deposits"
  ON deposits
  FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for user_wallets
CREATE POLICY "Users can view own wallets"
  ON user_wallets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own wallets"
  ON user_wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage all wallets"
  ON user_wallets
  FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON deposits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;

-- Function to add funds to user's fund wallet
CREATE OR REPLACE FUNCTION add_to_fund_wallet(
  user_id_param UUID,
  amount_param DECIMAL(10,2),
  description_param TEXT
)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  new_balance DECIMAL(10,2);
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Calculate new balance
  new_balance := user_profile.fund_wallet_balance + amount_param;

  -- Update fund wallet balance
  UPDATE profiles 
  SET fund_wallet_balance = new_balance
  WHERE id = user_id_param;

  -- Create transaction record
  INSERT INTO fund_wallet_transactions (
    user_id, transaction_type, amount, balance_before, balance_after, description
  ) VALUES (
    user_id_param, 'deposit', amount_param,
    user_profile.fund_wallet_balance, new_balance, description_param
  );

  RETURN json_build_object(
    'success', true,
    'new_balance', new_balance,
    'amount_added', amount_param
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_to_fund_wallet TO authenticated;

-- Function to get user wallet or create one
CREATE OR REPLACE FUNCTION get_or_create_user_wallet(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  existing_wallet RECORD;
  wallet_address TEXT;
  private_key TEXT;
BEGIN
  -- Check if user already has a wallet
  SELECT * INTO existing_wallet
  FROM user_wallets
  WHERE user_id = user_id_param
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'wallet_address', existing_wallet.wallet_address,
      'is_new', false
    );
  END IF;

  -- In a real implementation, this would generate a new wallet
  -- For now, we'll return a placeholder that the application will handle
  RETURN json_build_object(
    'success', false,
    'message', 'Wallet generation must be handled by the application',
    'is_new', true
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_or_create_user_wallet TO authenticated;

-- Create updated_at triggers
CREATE TRIGGER update_deposits_updated_at
    BEFORE UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_wallets_updated_at
    BEFORE UPDATE ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();