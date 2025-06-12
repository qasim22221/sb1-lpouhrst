/*
  # System Settings and Master Wallet Configuration

  1. New Tables
    - `master_wallet_config` - Master wallet configuration for gas management
    - `gas_operations` - Log of gas distribution and sweep operations
    - `withdrawal_addresses` - User withdrawal addresses

  2. Updates
    - Add more system settings for income distribution
    - Add gas management settings
    - Add sweep configuration

  3. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Master Wallet Configuration Table
CREATE TABLE IF NOT EXISTS master_wallet_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  min_bnb_reserve DECIMAL(10,6) NOT NULL DEFAULT 1.0,
  gas_distribution_amount DECIMAL(10,6) NOT NULL DEFAULT 0.001,
  sweep_threshold_high DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  sweep_threshold_medium DECIMAL(10,2) NOT NULL DEFAULT 20.00,
  sweep_threshold_low DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  auto_sweep_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gas Operations Log Table
CREATE TABLE IF NOT EXISTS gas_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('distribute', 'sweep', 'batch')),
  wallet_addresses TEXT[] NOT NULL,
  bnb_amount DECIMAL(10,6) NOT NULL DEFAULT 0,
  gas_used INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Withdrawal Addresses Table
CREATE TABLE IF NOT EXISTS withdrawal_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  label TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'BEP20',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ
);

-- Withdrawals Table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL CHECK (net_amount > 0),
  withdrawal_address TEXT NOT NULL,
  address_label TEXT NOT NULL,
  source_wallet TEXT NOT NULL DEFAULT 'main' CHECK (source_wallet IN ('main', 'fund')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  transaction_hash TEXT,
  withdrawal_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  transfer_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  
  CONSTRAINT valid_net_amount CHECK (net_amount = amount - fee)
);

-- Insert additional system settings
INSERT INTO system_settings (category, key, value, description, is_public) VALUES
-- Master Wallet Settings
('wallet', 'master_wallet_address', '""', 'Master wallet address for gas distribution', false),
('wallet', 'master_wallet_private_key', '""', 'Encrypted private key for master wallet', false),
('wallet', 'min_bnb_reserve', '1.0', 'Minimum BNB to keep in master wallet', false),
('wallet', 'gas_distribution_amount', '0.001', 'Amount of BNB to distribute per wallet', false),
('wallet', 'auto_sweep_enabled', 'false', 'Enable automatic USDT sweeping', false),

-- Sweep Thresholds
('wallet', 'sweep_threshold_high', '100', 'High priority sweep threshold in USDT', false),
('wallet', 'sweep_threshold_medium', '20', 'Medium priority sweep threshold in USDT', false),
('wallet', 'sweep_threshold_low', '5', 'Low priority sweep threshold in USDT', false),

-- Income Distribution
('income', 'direct_referral_bonus', '5', 'Direct referral bonus amount in USD', false),
('income', 'level_income_rate', '0.5', 'Level income rate per activation in USD', false),
('income', 'activation_cost', '21', 'Account activation cost in USD', true),

-- Pool Settings
('income', 'pool_1_amount', '5', 'Pool 1 reward amount in USD', false),
('income', 'pool_2_amount', '10', 'Pool 2 reward amount in USD', false),
('income', 'pool_3_amount', '15', 'Pool 3 reward amount in USD', false),
('income', 'pool_4_amount', '27', 'Pool 4 reward amount in USD', false),

-- Pool Time Limits (in minutes)
('income', 'pool_1_time', '30', 'Pool 1 time limit in minutes', false),
('income', 'pool_2_time', '1440', 'Pool 2 time limit in minutes (24 hours)', false),
('income', 'pool_3_time', '7200', 'Pool 3 time limit in minutes (5 days)', false),
('income', 'pool_4_time', '21600', 'Pool 4 time limit in minutes (15 days)', false),

-- Rank Requirements
('rewards', 'gold_referrals', '1', 'Direct referrals needed for Gold rank', false),
('rewards', 'platinum_referrals', '2', 'Direct referrals needed for Platinum rank', false),
('rewards', 'diamond_referrals', '4', 'Direct referrals needed for Diamond rank', false),
('rewards', 'ambassador_referrals', '10', 'Direct referrals needed for Ambassador rank', false),
('rewards', 'ambassador_team_size', '50', 'Team size needed for Ambassador rank', false),

-- Global Turnover
('global', 'global_turnover_11_days', '11', 'Days to achieve 11 referrals for 1% turnover', false),
('global', 'global_turnover_21_days', '21', 'Days to achieve 21 referrals for 2% turnover', false),
('global', 'global_turnover_1_percent', '1', '1% global turnover rate', false),
('global', 'global_turnover_2_percent', '2', '2% global turnover rate', false),

-- Team Rewards
('rewards', 'team_reward_25_fast', '20', 'Fast track reward for 25 team members', false),
('rewards', 'team_reward_25_standard', '10', 'Standard reward for 25 team members', false),
('rewards', 'team_reward_50_fast', '50', 'Fast track reward for 50 team members', false),
('rewards', 'team_reward_50_standard', '20', 'Standard reward for 50 team members', false),
('rewards', 'team_reward_100_fast', '100', 'Fast track reward for 100 team members', false),
('rewards', 'team_reward_100_standard', '40', 'Standard reward for 100 team members', false),

-- Fee Settings
('fees', 'withdrawal_fee_percentage', '15', 'Withdrawal fee percentage', true),
('fees', 'main_to_fund_transfer_fee', '10', 'Main to fund wallet transfer fee percentage', true),

-- Platform Limits
('platform', 'min_withdrawal_amount', '10', 'Minimum withdrawal amount in USD', true),
('platform', 'max_withdrawal_amount', '10000', 'Maximum withdrawal amount in USD', true),
('platform', 'p2p_transfer_enabled', 'true', 'Enable P2P transfers between users', true)

ON CONFLICT (category, key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- Insert default master wallet config
INSERT INTO master_wallet_config (
  wallet_address,
  min_bnb_reserve,
  gas_distribution_amount,
  sweep_threshold_high,
  sweep_threshold_medium,
  sweep_threshold_low,
  auto_sweep_enabled
) VALUES (
  '0x0000000000000000000000000000000000000000',
  1.0,
  0.001,
  100.00,
  20.00,
  5.00,
  false
) ON CONFLICT DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gas_operations_type ON gas_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_gas_operations_status ON gas_operations(status);
CREATE INDEX IF NOT EXISTS idx_gas_operations_created_at ON gas_operations(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawal_addresses_user ON withdrawal_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_addresses_verified ON withdrawal_addresses(is_verified);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);

-- Enable RLS
ALTER TABLE master_wallet_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for withdrawal_addresses
CREATE POLICY "Users can view own withdrawal addresses"
  ON withdrawal_addresses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawal addresses"
  ON withdrawal_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for withdrawals
CREATE POLICY "Users can view own withdrawals"
  ON withdrawals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawals"
  ON withdrawals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON master_wallet_config TO authenticated;
GRANT SELECT, INSERT ON gas_operations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON withdrawal_addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON withdrawals TO authenticated;

-- Create updated_at trigger for master_wallet_config
CREATE TRIGGER update_master_wallet_config_updated_at
    BEFORE UPDATE ON master_wallet_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();