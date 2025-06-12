/*
  # Complete Referral System Database Schema

  This file contains the complete database schema for the 7-stream income referral system.
  It includes all tables, functions, views, and security policies needed for the application.

  ## Core Features:
  1. User profiles and authentication
  2. Seven income streams
  3. Pool progression system
  4. Rank advancement
  5. Wallet management
  6. P2P transfers
  7. Withdrawal system
  8. Admin management
*/

-- =============================================
-- CORE TABLES
-- =============================================

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT REFERENCES profiles(referral_code) ON DELETE SET NULL,
  rank TEXT NOT NULL DEFAULT 'Starter',
  account_status TEXT NOT NULL DEFAULT 'inactive' CHECK (account_status IN ('active', 'inactive', 'suspended')),
  main_wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  fund_wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_direct_referrals INTEGER NOT NULL DEFAULT 0,
  active_direct_referrals INTEGER NOT NULL DEFAULT 0,
  current_pool INTEGER NOT NULL DEFAULT 0,
  transaction_pin TEXT,
  activation_date TIMESTAMPTZ,
  cycle_completed_at TIMESTAMPTZ,
  first_reactivation_claimed BOOLEAN DEFAULT false,
  activation_reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Referral Bonuses Table
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL CHECK (bonus_type IN (
    'direct_referral', 'level_income', 'pool_income', 
    'rank_sponsor_income', 'global_turnover_income', 
    'team_rewards', 'recycle_income'
  )),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pool Progress Table
CREATE TABLE IF NOT EXISTS pool_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pool_number INTEGER NOT NULL CHECK (pool_number BETWEEN 1 AND 4),
  pool_amount DECIMAL(10,2) NOT NULL,
  time_limit_minutes INTEGER NOT NULL,
  direct_referral_requirement INTEGER NOT NULL,
  rank_requirement TEXT NOT NULL,
  timer_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'failed')),
  completed_at TIMESTAMPTZ,
  reward_paid DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fund Wallet Transactions Table
CREATE TABLE IF NOT EXISTS fund_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'deposit', 'withdrawal', 'p2p_send', 'p2p_receive', 
    'activation', 'admin_adjustment'
  )),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- P2P Transfers Table
CREATE TABLE IF NOT EXISTS p2p_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL CHECK (net_amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  receiver_identifier TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  failed_reason TEXT,
  
  -- Constraints
  CONSTRAINT different_users CHECK (sender_id != receiver_id),
  CONSTRAINT valid_net_amount CHECK (net_amount = amount - fee)
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

-- Global Turnover Eligibility Table
CREATE TABLE IF NOT EXISTS global_turnover_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('11_direct', '21_direct')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team Reward Claims Table
CREATE TABLE IF NOT EXISTS team_reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_size INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('fast_track', 'standard')),
  amount DECIMAL(10,2) NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ADMIN TABLES
-- =============================================

-- Admin Roles Table
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id UUID REFERENCES admin_roles(id),
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin Sessions Table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin Activity Logs Table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, key)
);

-- Admin Notifications Table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  priority INTEGER DEFAULT 1,
  is_read BOOLEAN DEFAULT false,
  admin_user_id UUID REFERENCES admin_users(id),
  created_by UUID REFERENCES admin_users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

-- Sweep Monitoring Table
CREATE TABLE IF NOT EXISTS sweep_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  usdt_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  bnb_balance DECIMAL(10,6) NOT NULL DEFAULT 0,
  last_sweep_at TIMESTAMPTZ,
  next_sweep_at TIMESTAMPTZ,
  sweep_priority INTEGER DEFAULT 3 CHECK (sweep_priority IN (1, 2, 3)),
  gas_distributed BOOLEAN DEFAULT false,
  sweep_threshold DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  is_monitored BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sweep Transactions Table
CREATE TABLE IF NOT EXISTS sweep_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  usdt_amount DECIMAL(10,2) NOT NULL,
  bnb_gas_used DECIMAL(10,6) NOT NULL DEFAULT 0,
  transaction_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  gas_distribution_hash TEXT,
  sweep_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES
-- =============================================

-- Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_rank ON profiles(rank);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_activation_date ON profiles(activation_date);

-- Referral Bonuses Indexes
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_user_id ON referral_bonuses(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_bonus_type ON referral_bonuses(bonus_type);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_status ON referral_bonuses(status);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_reference_id ON referral_bonuses(reference_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_created_at ON referral_bonuses(created_at);

-- Pool Progress Indexes
CREATE INDEX IF NOT EXISTS idx_pool_progress_user_id ON pool_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_pool_progress_status ON pool_progress(status);
CREATE INDEX IF NOT EXISTS idx_pool_progress_pool_number ON pool_progress(pool_number);
CREATE INDEX IF NOT EXISTS idx_pool_progress_timer_end ON pool_progress(timer_end);
CREATE INDEX IF NOT EXISTS idx_pool_progress_rank_requirement ON pool_progress(rank_requirement);

-- Fund Wallet Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_fund_wallet_transactions_user_id ON fund_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fund_wallet_transactions_type ON fund_wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_fund_wallet_transactions_created_at ON fund_wallet_transactions(created_at);

-- P2P Transfers Indexes
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_sender ON p2p_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_receiver ON p2p_transfers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_status ON p2p_transfers(status);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_created_at ON p2p_transfers(created_at);

-- Withdrawals Indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);

-- Withdrawal Addresses Indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_addresses_user ON withdrawal_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_addresses_verified ON withdrawal_addresses(is_verified);

-- User Wallets Indexes
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_monitored ON user_wallets(is_monitored);

-- Deposits Indexes
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_wallet_address ON deposits(wallet_address);
CREATE INDEX IF NOT EXISTS idx_deposits_transaction_hash ON deposits(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at);

-- Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Global Turnover Indexes
CREATE INDEX IF NOT EXISTS idx_global_turnover_user_status ON global_turnover_eligibility(user_id, status);
CREATE INDEX IF NOT EXISTS idx_global_turnover_end_date ON global_turnover_eligibility(end_date);

-- Team Rewards Indexes
CREATE INDEX IF NOT EXISTS idx_team_rewards_user ON team_reward_claims(user_id);

-- Admin Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_user ON admin_activity_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user ON admin_notifications(admin_user_id);

-- Gas Operations Indexes
CREATE INDEX IF NOT EXISTS idx_gas_operations_type ON gas_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_gas_operations_status ON gas_operations(status);
CREATE INDEX IF NOT EXISTS idx_gas_operations_created_at ON gas_operations(created_at);

-- Sweep Monitoring Indexes
CREATE INDEX IF NOT EXISTS idx_sweep_monitoring_user ON sweep_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_sweep_monitoring_priority ON sweep_monitoring(sweep_priority);
CREATE INDEX IF NOT EXISTS idx_sweep_monitoring_next_sweep ON sweep_monitoring(next_sweep_at);

-- Sweep Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_sweep_transactions_user ON sweep_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sweep_transactions_status ON sweep_transactions(status);
CREATE INDEX IF NOT EXISTS idx_sweep_transactions_created_at ON sweep_transactions(created_at);

-- =============================================
-- VIEWS
-- =============================================

-- Login Lookup View (for username/email lookup without recursion)
CREATE OR REPLACE VIEW login_lookup AS
SELECT 
  id,
  username,
  email,
  referral_code
FROM profiles;

-- Admin User Overview
CREATE OR REPLACE VIEW admin_user_overview AS
SELECT 
  p.id,
  p.username,
  p.email,
  p.rank,
  p.account_status,
  p.main_wallet_balance,
  p.fund_wallet_balance,
  p.total_direct_referrals,
  p.active_direct_referrals,
  p.current_pool,
  p.created_at,
  p.activation_date,
  p.cycle_completed_at,
  COALESCE(income_stats.total_income, 0) as total_income,
  COALESCE(withdrawal_stats.total_withdrawn, 0) as total_withdrawn,
  COALESCE(referrer.username, 'Direct') as referred_by_username
FROM profiles p
LEFT JOIN (
  SELECT 
    user_id,
    SUM(amount) as total_income
  FROM referral_bonuses 
  WHERE status = 'completed'
  GROUP BY user_id
) income_stats ON p.id = income_stats.user_id
LEFT JOIN (
  SELECT 
    user_id,
    SUM(amount) as total_withdrawn
  FROM withdrawals 
  WHERE status = 'completed'
  GROUP BY user_id
) withdrawal_stats ON p.id = withdrawal_stats.user_id
LEFT JOIN profiles referrer ON p.referred_by = referrer.referral_code;

-- Financial Overview for Admin
CREATE OR REPLACE VIEW admin_financial_overview AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users,
  SUM(CASE WHEN account_status = 'active' THEN 1 ELSE 0 END) as active_users,
  SUM(main_wallet_balance) as total_main_balance,
  SUM(fund_wallet_balance) as total_fund_balance,
  AVG(main_wallet_balance) as avg_main_balance,
  AVG(fund_wallet_balance) as avg_fund_balance
FROM profiles
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =============================================
-- FUNCTIONS - USER MANAGEMENT
-- =============================================

-- Function to create user profile
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  username_param TEXT,
  email_param TEXT,
  referral_code_param TEXT,
  referred_by_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  referrer_profile RECORD;
  new_profile_id UUID;
BEGIN
  -- Validate input
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User ID is required');
  END IF;

  IF username_param IS NULL OR LENGTH(TRIM(username_param)) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Username is required');
  END IF;

  IF email_param IS NULL OR LENGTH(TRIM(email_param)) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Email is required');
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Profile already exists for this user');
  END IF;

  -- Check if username is already taken
  IF EXISTS (SELECT 1 FROM profiles WHERE username = username_param) THEN
    RETURN json_build_object('success', false, 'error', 'Username already taken');
  END IF;

  -- Check if referral code is already taken
  IF EXISTS (SELECT 1 FROM profiles WHERE referral_code = referral_code_param) THEN
    RETURN json_build_object('success', false, 'error', 'Referral code already taken');
  END IF;

  -- Validate referrer if provided
  IF referred_by_param IS NOT NULL AND LENGTH(TRIM(referred_by_param)) > 0 THEN
    SELECT * INTO referrer_profile
    FROM profiles
    WHERE referral_code = TRIM(referred_by_param);

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Invalid referral code');
    END IF;
  END IF;

  -- Create the profile
  BEGIN
    INSERT INTO profiles (
      id,
      username,
      email,
      referral_code,
      referred_by,
      rank,
      account_status,
      main_wallet_balance,
      fund_wallet_balance,
      total_direct_referrals,
      active_direct_referrals,
      current_pool,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      TRIM(username_param),
      TRIM(email_param),
      TRIM(referral_code_param),
      CASE 
        WHEN referred_by_param IS NOT NULL AND LENGTH(TRIM(referred_by_param)) > 0 
        THEN TRIM(referred_by_param) 
        ELSE NULL 
      END,
      'Starter',
      'inactive',
      0.00,
      0.00,
      0,
      0,
      0,
      now(),
      now()
    ) RETURNING id INTO new_profile_id;

    RETURN json_build_object(
      'success', true, 
      'message', 'Profile created successfully',
      'profile_id', new_profile_id
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Failed to create profile: ' || SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTIONS - INCOME STREAMS
-- =============================================

-- Function to award direct referral bonus
CREATE OR REPLACE FUNCTION award_direct_referral_bonus(
  user_id_param UUID,
  referrer_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_profile RECORD;
  bonus_amount DECIMAL(10,2) := 5.00; -- $5 direct referral bonus
BEGIN
  -- Get referrer profile
  SELECT * INTO referrer_profile
  FROM profiles
  WHERE id = referrer_id_param;

  IF NOT FOUND THEN
    RAISE NOTICE 'Referrer not found: %', referrer_id_param;
    RETURN FALSE;
  END IF;

  -- Check if referrer account is active
  IF referrer_profile.account_status != 'active' THEN
    RAISE NOTICE 'Referrer account not active: %', referrer_id_param;
    RETURN FALSE;
  END IF;

  -- Award direct referral bonus
  INSERT INTO referral_bonuses (
    user_id, bonus_type, amount, description, status, reference_id
  ) VALUES (
    referrer_id_param, 'direct_referral', bonus_amount,
    'Direct referral bonus for ' || (SELECT username FROM profiles WHERE id = user_id_param),
    'completed', user_id_param
  );

  -- Update referrer's main wallet balance
  UPDATE profiles 
  SET 
    main_wallet_balance = main_wallet_balance + bonus_amount,
    total_direct_referrals = COALESCE(total_direct_referrals, 0) + 1,
    active_direct_referrals = COALESCE(active_direct_referrals, 0) + 1
  WHERE id = referrer_id_param;

  RAISE NOTICE 'Direct referral bonus awarded to %: $%', referrer_id_param, bonus_amount;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to distribute level income (for levels 2-7)
CREATE OR REPLACE FUNCTION distribute_level_income(
  user_id_param UUID,
  referrer_code_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_referrer_code TEXT := referrer_code_param;
  current_level INTEGER := 1;
  max_level INTEGER := 7;
  level_bonus DECIMAL(10,2) := 0.5; -- $0.5 per level
  upline_profile RECORD;
  grand_upline_profile RECORD;
BEGIN
  -- Skip level 1 (direct referrer) as they get direct referral bonus
  current_level := 2;
  
  -- Get the upline's referrer (level 2)
  SELECT * INTO upline_profile
  FROM profiles
  WHERE referral_code = current_referrer_code;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No upline found for referral code: %', current_referrer_code;
    RETURN FALSE;
  END IF;
  
  -- Get the upline's referrer code for next level
  current_referrer_code := upline_profile.referred_by;
  
  -- Process levels 2-7
  WHILE current_level <= max_level AND current_referrer_code IS NOT NULL LOOP
    -- Get the profile for this level
    SELECT * INTO grand_upline_profile
    FROM profiles
    WHERE referral_code = current_referrer_code;
    
    IF NOT FOUND THEN
      -- No more uplines, exit loop
      EXIT;
    END IF;
    
    -- Only award level income if upline is active
    IF grand_upline_profile.account_status = 'active' THEN
      -- Award level income
      INSERT INTO referral_bonuses (
        user_id, bonus_type, amount, description, status, reference_id
      ) VALUES (
        grand_upline_profile.id, 'level_income', level_bonus,
        'Level ' || current_level || ' income from ' || (SELECT username FROM profiles WHERE id = user_id_param),
        'completed', user_id_param
      );
      
      -- Update upline's main wallet balance
      UPDATE profiles 
      SET main_wallet_balance = main_wallet_balance + level_bonus
      WHERE id = grand_upline_profile.id;
      
      RAISE NOTICE 'Level % income awarded to %: $%', current_level, grand_upline_profile.id, level_bonus;
    ELSE
      RAISE NOTICE 'Upline at level % is not active: %', current_level, grand_upline_profile.id;
    END IF;
    
    -- Move to next level
    current_level := current_level + 1;
    current_referrer_code := grand_upline_profile.referred_by;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update user rank
CREATE OR REPLACE FUNCTION update_user_rank(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  user_profile RECORD;
  old_rank TEXT;
  new_rank TEXT;
  direct_referrals INTEGER;
  team_size INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  old_rank := user_profile.rank;
  direct_referrals := COALESCE(user_profile.total_direct_referrals, 0);
  
  -- Calculate team size (simplified - direct referrals only for now)
  SELECT COUNT(*) INTO team_size
  FROM profiles
  WHERE referred_by = user_profile.referral_code;
  
  -- Determine new rank based on requirements
  IF direct_referrals >= 10 AND team_size >= 50 THEN
    new_rank := 'Ambassador';
  ELSIF direct_referrals >= 4 THEN
    new_rank := 'Diamond';
  ELSIF direct_referrals >= 2 THEN
    new_rank := 'Platinum';
  ELSIF direct_referrals >= 1 THEN
    new_rank := 'Gold';
  ELSE
    new_rank := 'Starter';
  END IF;
  
  -- Update rank if changed
  IF new_rank != old_rank THEN
    UPDATE profiles
    SET rank = new_rank
    WHERE id = user_id_param;
    
    RAISE NOTICE 'User % rank updated from % to %', user_id_param, old_rank, new_rank;
  END IF;
  
  RETURN new_rank;
END;
$$ LANGUAGE plpgsql;

-- Function to award rank sponsor bonus
CREATE OR REPLACE FUNCTION award_rank_sponsor_bonus(
  user_id_param UUID,
  new_rank_param TEXT,
  referrer_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_profile RECORD;
  bonus_amount DECIMAL(10,2) := 0;
BEGIN
  -- Skip if not a rank that earns bonus
  IF new_rank_param NOT IN ('Gold', 'Platinum', 'Diamond', 'Ambassador') THEN
    RETURN FALSE;
  END IF;
  
  -- Get referrer profile
  SELECT * INTO referrer_profile
  FROM profiles
  WHERE id = referrer_id_param;
  
  IF NOT FOUND OR referrer_profile.account_status != 'active' THEN
    RETURN FALSE;
  END IF;
  
  -- Determine bonus amount based on rank
  CASE new_rank_param
    WHEN 'Gold' THEN bonus_amount := 1.00;
    WHEN 'Platinum' THEN bonus_amount := 2.00;
    WHEN 'Diamond' THEN bonus_amount := 3.00;
    WHEN 'Ambassador' THEN bonus_amount := 4.00;
  END CASE;
  
  -- Award rank sponsor bonus
  INSERT INTO referral_bonuses (
    user_id, bonus_type, amount, description, status, reference_id
  ) VALUES (
    referrer_id_param, 'rank_sponsor_income', bonus_amount,
    'Rank sponsor bonus for ' || (SELECT username FROM profiles WHERE id = user_id_param) || ' reaching ' || new_rank_param,
    'completed', user_id_param
  );
  
  -- Update referrer's main wallet balance
  UPDATE profiles 
  SET main_wallet_balance = main_wallet_balance + bonus_amount
  WHERE id = referrer_id_param;
  
  RAISE NOTICE 'Rank sponsor bonus awarded to % for % reaching %: $%', 
    referrer_id_param, user_id_param, new_rank_param, bonus_amount;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check pool progression
CREATE OR REPLACE FUNCTION check_pool_progression(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  current_pool RECORD;
  user_profile RECORD;
  time_remaining INTERVAL;
  result JSON;
BEGIN
  -- Get current active pool
  SELECT * INTO current_pool
  FROM pool_progress
  WHERE user_id = user_id_param AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'No active pool found');
  END IF;

  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_id_param;

  -- Calculate time remaining
  time_remaining := current_pool.timer_end - now();

  -- Check if requirements are met
  IF user_profile.active_direct_referrals >= current_pool.direct_referral_requirement 
     AND time_remaining > INTERVAL '0' THEN
    
    -- Pool completed
    UPDATE pool_progress 
    SET status = 'completed', 
        completed_at = now(),
        reward_paid = current_pool.pool_amount
    WHERE id = current_pool.id;

    -- Award pool income
    INSERT INTO referral_bonuses (
      user_id, bonus_type, amount, description, reference_id
    ) VALUES (
      user_id_param, 'pool_income', current_pool.pool_amount,
      'Pool ' || current_pool.pool_number || ' completion reward',
      current_pool.id
    );

    -- Update main wallet balance
    UPDATE profiles 
    SET main_wallet_balance = main_wallet_balance + current_pool.pool_amount
    WHERE id = user_id_param;

    -- Check if this was pool 4 (cycle completion)
    IF current_pool.pool_number = 4 THEN
      UPDATE profiles 
      SET account_status = 'inactive',
          cycle_completed_at = now(),
          current_pool = 0
      WHERE id = user_id_param;

      RETURN json_build_object(
        'success', true,
        'pool_completed', 4,
        'cycle_completed', true,
        'message', 'Cycle completed! Account is now inactive.'
      );
    ELSE
      -- Enter next pool
      INSERT INTO pool_progress (
        user_id, pool_number, pool_amount, time_limit_minutes,
        direct_referral_requirement, timer_end, status, rank_requirement
      ) VALUES (
        user_id_param,
        current_pool.pool_number + 1,
        CASE current_pool.pool_number + 1
          WHEN 2 THEN 10
          WHEN 3 THEN 15
          WHEN 4 THEN 27
        END,
        CASE current_pool.pool_number + 1
          WHEN 2 THEN 1440
          WHEN 3 THEN 7200
          WHEN 4 THEN 21600
        END,
        current_pool.pool_number, -- Cumulative requirement
        now() + CASE current_pool.pool_number + 1
          WHEN 2 THEN INTERVAL '1440 minutes'
          WHEN 3 THEN INTERVAL '7200 minutes'
          WHEN 4 THEN INTERVAL '21600 minutes'
        END,
        'active',
        CASE current_pool.pool_number + 1
          WHEN 2 THEN 'Gold'
          WHEN 3 THEN 'Platinum'
          WHEN 4 THEN 'Diamond'
        END
      );

      UPDATE profiles 
      SET current_pool = current_pool.pool_number + 1
      WHERE id = user_id_param;

      RETURN json_build_object(
        'success', true,
        'pool_completed', current_pool.pool_number,
        'next_pool', current_pool.pool_number + 1,
        'message', 'Pool completed! Entered next pool.'
      );
    END IF;

  ELSIF time_remaining <= INTERVAL '0' THEN
    -- Pool expired
    UPDATE pool_progress 
    SET status = 'expired', completed_at = now()
    WHERE id = current_pool.id;

    RETURN json_build_object(
      'success', false,
      'pool_expired', current_pool.pool_number,
      'message', 'Pool expired due to time limit'
    );
  END IF;

  -- Pool still in progress
  RETURN json_build_object(
    'success', true,
    'message', 'Pool in progress',
    'requirements_met', user_profile.active_direct_referrals >= current_pool.direct_referral_requirement,
    'time_remaining', EXTRACT(EPOCH FROM time_remaining)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check global turnover eligibility
CREATE OR REPLACE FUNCTION check_global_turnover_eligibility(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  days_since_registration INTEGER;
  existing_eligibility RECORD;
  result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_id_param;

  IF NOT FOUND OR user_profile.account_status != 'active' THEN
    RETURN json_build_object('success', false, 'message', 'Account must be active');
  END IF;

  -- Calculate days since registration
  days_since_registration := EXTRACT(DAY FROM now() - user_profile.created_at);

  -- Check existing eligibility
  SELECT * INTO existing_eligibility
  FROM global_turnover_eligibility
  WHERE user_id = user_id_param AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check for 21 direct referrals in 21 days
  IF user_profile.active_direct_referrals >= 21 AND days_since_registration <= 21 THEN
    IF existing_eligibility IS NULL OR existing_eligibility.level != '21_direct' THEN
      -- Create new eligibility
      INSERT INTO global_turnover_eligibility (
        user_id, level, start_date, end_date, status
      ) VALUES (
        user_id_param, '21_direct', now(),
        user_profile.created_at + INTERVAL '21 days', 'active'
      );

      RETURN json_build_object(
        'success', true,
        'level', '21_direct',
        'percentage', 2,
        'message', 'Qualified for 2% global turnover income'
      );
    END IF;
  -- Check for 11 direct referrals in 11 days
  ELSIF user_profile.active_direct_referrals >= 11 AND days_since_registration <= 11 THEN
    IF existing_eligibility IS NULL OR existing_eligibility.level != '11_direct' THEN
      -- Create new eligibility
      INSERT INTO global_turnover_eligibility (
        user_id, level, start_date, end_date, status
      ) VALUES (
        user_id_param, '11_direct', now(),
        user_profile.created_at + INTERVAL '21 days', 'active'
      );

      RETURN json_build_object(
        'success', true,
        'level', '11_direct',
        'percentage', 1,
        'message', 'Qualified for 1% global turnover income'
      );
    END IF;
  END IF;

  -- Check if existing eligibility needs updating
  IF existing_eligibility IS NOT NULL THEN
    IF existing_eligibility.level = '21_direct' AND user_profile.active_direct_referrals < 21 THEN
      IF user_profile.active_direct_referrals >= 11 THEN
        -- Downgrade to 1%
        UPDATE global_turnover_eligibility
        SET level = '11_direct'
        WHERE id = existing_eligibility.id;

        RETURN json_build_object(
          'success', true,
          'level', '11_direct',
          'percentage', 1,
          'message', 'Downgraded to 1% due to referral count'
        );
      ELSE
        -- Pause eligibility
        UPDATE global_turnover_eligibility
        SET status = 'paused'
        WHERE id = existing_eligibility.id;

        RETURN json_build_object(
          'success', false,
          'message', 'Global turnover paused - need more active referrals'
        );
      END IF;
    ELSIF existing_eligibility.level = '11_direct' AND user_profile.active_direct_referrals < 11 THEN
      -- Pause eligibility
      UPDATE global_turnover_eligibility
      SET status = 'paused'
      WHERE id = existing_eligibility.id;

      RETURN json_build_object(
        'success', false,
        'message', 'Global turnover paused - need at least 11 active referrals'
      );
    END IF;
  END IF;

  RETURN json_build_object(
    'success', false,
    'message', 'Not eligible for global turnover income'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check team rewards
CREATE OR REPLACE FUNCTION check_team_rewards(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  team_size INTEGER;
  days_since_registration INTEGER;
  reward_config RECORD;
  claimed_sizes INTEGER[];
  result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_id_param;

  IF NOT FOUND OR user_profile.account_status != 'active' THEN
    RETURN json_build_object('success', false, 'message', 'Account must be active');
  END IF;

  -- Calculate team size (recursive function would be needed for full implementation)
  -- For now, using a simplified calculation
  SELECT COUNT(*) INTO team_size
  FROM profiles
  WHERE referred_by = (SELECT referral_code FROM profiles WHERE id = user_id_param);

  -- Calculate days since registration
  days_since_registration := EXTRACT(DAY FROM now() - user_profile.created_at);

  -- Get already claimed reward sizes
  SELECT ARRAY_AGG(team_size) INTO claimed_sizes
  FROM team_reward_claims
  WHERE user_id = user_id_param;

  claimed_sizes := COALESCE(claimed_sizes, ARRAY[]::INTEGER[]);

  -- Check each reward tier (simplified - would need full team size calculation)
  FOR reward_config IN 
    SELECT * FROM (VALUES
      (25, 20, 10, 10, 25),
      (50, 50, 20, 10, 20),
      (100, 100, 40, 15, 30),
      (250, 300, 120, 25, 50),
      (500, 700, 300, 40, 80),
      (1000, 1500, 600, 60, 120),
      (2500, 5000, 2000, 90, 180),
      (50000, 15000, 8000, 120, 220),
      (100000, 35000, 18000, 150, 400)
    ) AS t(size, fast_amount, std_amount, fast_days, std_days)
  LOOP
    IF team_size >= reward_config.size AND NOT (reward_config.size = ANY(claimed_sizes)) THEN
      IF days_since_registration <= reward_config.fast_days THEN
        -- Award fast track reward
        INSERT INTO team_reward_claims (
          user_id, team_size, reward_type, amount, claimed_at
        ) VALUES (
          user_id_param, reward_config.size, 'fast_track', 
          reward_config.fast_amount, now()
        );

        INSERT INTO referral_bonuses (
          user_id, bonus_type, amount, description
        ) VALUES (
          user_id_param, 'team_rewards', reward_config.fast_amount,
          'Fast track team reward: ' || reward_config.size || ' members'
        );

        UPDATE profiles 
        SET main_wallet_balance = main_wallet_balance + reward_config.fast_amount
        WHERE id = user_id_param;

        RETURN json_build_object(
          'success', true,
          'reward_type', 'fast_track',
          'amount', reward_config.fast_amount,
          'team_size', reward_config.size
        );
      ELSIF days_since_registration <= reward_config.std_days THEN
        -- Award standard reward
        INSERT INTO team_reward_claims (
          user_id, team_size, reward_type, amount, claimed_at
        ) VALUES (
          user_id_param, reward_config.size, 'standard', 
          reward_config.std_amount, now()
        );

        INSERT INTO referral_bonuses (
          user_id, bonus_type, amount, description
        ) VALUES (
          user_id_param, 'team_rewards', reward_config.std_amount,
          'Standard team reward: ' || reward_config.size || ' members'
        );

        UPDATE profiles 
        SET main_wallet_balance = main_wallet_balance + reward_config.std_amount
        WHERE id = user_id_param;

        RETURN json_build_object(
          'success', true,
          'reward_type', 'standard',
          'amount', reward_config.std_amount,
          'team_size', reward_config.size
        );
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', false,
    'message', 'No team rewards available at current team size: ' || team_size
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTIONS - ACCOUNT MANAGEMENT
-- =============================================

-- Function to process initial account activation
CREATE OR REPLACE FUNCTION process_account_activation(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  activation_cost DECIMAL(10,2) := 21.00;
  referrer_id UUID;
  referrer_code TEXT;
  new_rank TEXT;
BEGIN
  -- Start transaction
  BEGIN
    -- Get user profile
    SELECT * INTO user_profile
    FROM profiles
    WHERE id = user_id_param;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    -- Check if account is already active
    IF user_profile.account_status = 'active' THEN
      RETURN json_build_object('success', false, 'message', 'Account is already active');
    END IF;

    -- Check if user has sufficient fund wallet balance
    IF user_profile.fund_wallet_balance < activation_cost THEN
      RETURN json_build_object('success', false, 'message', 'Insufficient fund wallet balance for activation');
    END IF;

    -- Get referrer information
    IF user_profile.referred_by IS NOT NULL THEN
      SELECT id, referral_code INTO referrer_id, referrer_code
      FROM profiles
      WHERE referral_code = user_profile.referred_by;
    END IF;

    -- Deduct activation cost from fund wallet
    UPDATE profiles 
    SET fund_wallet_balance = fund_wallet_balance - activation_cost
    WHERE id = user_id_param;

    -- Activate account
    UPDATE profiles 
    SET 
      account_status = 'active',
      current_pool = 1,
      activation_date = now()
    WHERE id = user_id_param;

    -- Create fund wallet transaction for activation cost
    INSERT INTO fund_wallet_transactions (
      user_id, transaction_type, amount, balance_before, balance_after,
      description
    ) VALUES (
      user_id_param, 'activation', -activation_cost,
      user_profile.fund_wallet_balance,
      user_profile.fund_wallet_balance - activation_cost,
      'Initial account activation fee'
    );

    -- Start Pool 1
    INSERT INTO pool_progress (
      user_id, pool_number, pool_amount, time_limit_minutes,
      direct_referral_requirement, timer_end, status, rank_requirement
    ) VALUES (
      user_id_param, 1, 5, 30, 0,
      now() + INTERVAL '30 minutes', 'active', 'Starter'
    );

    -- Distribute income to uplines if user was referred
    IF referrer_id IS NOT NULL THEN
      -- 1. Award direct referral bonus to referrer
      PERFORM award_direct_referral_bonus(user_id_param, referrer_id);
      
      -- 2. Distribute level income to levels 2-7
      PERFORM distribute_level_income(user_id_param, referrer_code);
      
      -- 3. Update referrer's rank based on new referral count
      new_rank := update_user_rank(referrer_id);
      
      -- 4. Award rank sponsor bonus if applicable
      IF new_rank != user_profile.rank AND new_rank IN ('Gold', 'Platinum', 'Diamond', 'Ambassador') THEN
        -- Find referrer's referrer (if any)
        DECLARE
          referrer_of_referrer_id UUID;
        BEGIN
          SELECT id INTO referrer_of_referrer_id
          FROM profiles
          WHERE referral_code = referrer_code;
          
          IF FOUND THEN
            PERFORM award_rank_sponsor_bonus(referrer_id, new_rank, referrer_of_referrer_id);
          END IF;
        END;
      END IF;
    END IF;

    -- Commit transaction
    RETURN json_build_object(
      'success', true,
      'message', 'Account activated successfully',
      'activation_cost', activation_cost,
      'income_distributed', referrer_id IS NOT NULL
    );
  EXCEPTION WHEN OTHERS THEN
    -- Rollback transaction on error
    RAISE NOTICE 'Error in account activation: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'message', 'Error during activation: ' || SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to process account reactivation
CREATE OR REPLACE FUNCTION process_account_reactivation(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  recycle_bonus DECIMAL(10,2) := 0;
  activation_cost DECIMAL(10,2) := 21.00;
  referrer_id UUID;
  referrer_code TEXT;
BEGIN
  -- Start transaction
  BEGIN
    -- Get user profile
    SELECT * INTO user_profile
    FROM profiles
    WHERE id = user_id_param;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    -- Check if account is inactive
    IF user_profile.account_status != 'inactive' THEN
      RETURN json_build_object('success', false, 'message', 'Account must be inactive to reactivate');
    END IF;

    -- Check if user completed a cycle
    IF user_profile.cycle_completed_at IS NULL THEN
      RETURN json_build_object('success', false, 'message', 'Must complete a full cycle before reactivating');
    END IF;

    -- Check if user has sufficient fund wallet balance
    IF user_profile.fund_wallet_balance < activation_cost THEN
      RETURN json_build_object('success', false, 'message', 'Insufficient fund wallet balance for reactivation');
    END IF;

    -- Get referrer information
    IF user_profile.referred_by IS NOT NULL THEN
      SELECT id, referral_code INTO referrer_id, referrer_code
      FROM profiles
      WHERE referral_code = user_profile.referred_by;
    END IF;

    -- Calculate recycle bonus (only for first reactivation)
    IF NOT user_profile.first_reactivation_claimed THEN
      recycle_bonus := 5.00;
    END IF;

    -- Deduct activation cost from fund wallet
    UPDATE profiles 
    SET fund_wallet_balance = fund_wallet_balance - activation_cost
    WHERE id = user_id_param;

    -- Reactivate account
    UPDATE profiles 
    SET 
      account_status = 'active',
      current_pool = 1,
      activation_date = now(),
      first_reactivation_claimed = true,
      main_wallet_balance = main_wallet_balance + recycle_bonus
    WHERE id = user_id_param;

    -- Create fund wallet transaction for activation cost
    INSERT INTO fund_wallet_transactions (
      user_id, transaction_type, amount, balance_before, balance_after,
      description
    ) VALUES (
      user_id_param, 'activation', -activation_cost,
      user_profile.fund_wallet_balance,
      user_profile.fund_wallet_balance - activation_cost,
      'Account reactivation fee'
    );

    -- Award recycle income bonus if applicable
    IF recycle_bonus > 0 THEN
      INSERT INTO referral_bonuses (
        user_id, bonus_type, amount, description, status, reference_id
      ) VALUES (
        user_id_param, 'recycle_income', recycle_bonus,
        'First reactivation bonus - $5 (one-time only)',
        'completed', user_id_param
      );
    END IF;

    -- Start Pool 1
    INSERT INTO pool_progress (
      user_id, pool_number, pool_amount, time_limit_minutes,
      direct_referral_requirement, timer_end, status, rank_requirement
    ) VALUES (
      user_id_param, 1, 5, 30, 0,
      now() + INTERVAL '30 minutes', 'active', 'Starter'
    );

    -- Distribute income to uplines if user was referred
    IF referrer_id IS NOT NULL THEN
      -- 1. Award direct referral bonus to referrer
      PERFORM award_direct_referral_bonus(user_id_param, referrer_id);
      
      -- 2. Distribute level income to levels 2-7
      PERFORM distribute_level_income(user_id_param, referrer_code);
    END IF;

    -- Commit transaction
    RETURN json_build_object(
      'success', true,
      'message', 'Account reactivated successfully',
      'recycle_bonus', recycle_bonus,
      'activation_cost', activation_cost,
      'income_distributed', referrer_id IS NOT NULL
    );
  EXCEPTION WHEN OTHERS THEN
    -- Rollback transaction on error
    RAISE NOTICE 'Error in account reactivation: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'message', 'Error during reactivation: ' || SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTIONS - WALLET MANAGEMENT
-- =============================================

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

-- Function to get or create user wallet
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

-- Function to process P2P transfer
CREATE OR REPLACE FUNCTION process_p2p_transfer(
  sender_id_param UUID,
  receiver_id_param UUID,
  amount_param DECIMAL(10,2),
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
    receiver_identifier, description, status
  ) VALUES (
    sender_id_param, receiver_id_param, amount_param, fee_amount, net_amount,
    receiver_identifier_param, description_param, 'completed'
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

-- Function to get user transfer history
CREATE OR REPLACE FUNCTION get_user_transfer_history(user_id_param UUID, limit_param INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  amount DECIMAL(10,2),
  fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  status TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sender_username TEXT,
  receiver_username TEXT,
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
    t.description,
    t.created_at,
    t.completed_at,
    sp.username as sender_username,
    rp.username as receiver_username,
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

-- =============================================
-- FUNCTIONS - ADMIN MANAGEMENT
-- =============================================

-- Function to create admin user
CREATE OR REPLACE FUNCTION create_admin_user(
  email_param TEXT,
  username_param TEXT,
  password_param TEXT,
  role_name_param TEXT,
  first_name_param TEXT DEFAULT NULL,
  last_name_param TEXT DEFAULT NULL,
  created_by_param UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  role_record RECORD;
  admin_id UUID;
BEGIN
  -- Get role
  SELECT * INTO role_record
  FROM admin_roles
  WHERE name = role_name_param AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid role specified');
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM admin_users WHERE email = email_param) THEN
    RETURN json_build_object('success', false, 'message', 'Email already exists');
  END IF;

  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM admin_users WHERE username = username_param) THEN
    RETURN json_build_object('success', false, 'message', 'Username already exists');
  END IF;

  -- Create admin user (password should be hashed by application)
  INSERT INTO admin_users (
    email, username, password_hash, role_id, first_name, last_name, created_by
  ) VALUES (
    email_param, username_param, password_param, role_record.id, 
    first_name_param, last_name_param, created_by_param
  ) RETURNING id INTO admin_id;

  -- Log the action
  INSERT INTO admin_activity_logs (
    admin_user_id, action, resource_type, resource_id, details
  ) VALUES (
    created_by_param, 'CREATE_ADMIN_USER', 'admin_user', admin_id::TEXT,
    json_build_object('email', email_param, 'username', username_param, 'role', role_name_param)
  );

  RETURN json_build_object(
    'success', true, 
    'message', 'Admin user created successfully',
    'admin_id', admin_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_users', (SELECT COUNT(*) FROM profiles WHERE account_status = 'active'),
    'inactive_users', (SELECT COUNT(*) FROM profiles WHERE account_status = 'inactive'),
    'total_deposits', (SELECT COALESCE(SUM(amount), 0) FROM fund_wallet_transactions WHERE transaction_type = 'deposit'),
    'total_withdrawals', (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'completed'),
    'pending_withdrawals', (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'),
    'total_main_balance', (SELECT COALESCE(SUM(main_wallet_balance), 0) FROM profiles),
    'total_fund_balance', (SELECT COALESCE(SUM(fund_wallet_balance), 0) FROM profiles),
    'today_registrations', (SELECT COUNT(*) FROM profiles WHERE DATE(created_at) = CURRENT_DATE),
    'today_activations', (SELECT COUNT(*) FROM profiles WHERE DATE(activation_date) = CURRENT_DATE),
    'total_referral_income', (SELECT COALESCE(SUM(amount), 0) FROM referral_bonuses WHERE status = 'completed'),
    'total_pool_rewards', (SELECT COALESCE(SUM(reward_paid), 0) FROM pool_progress WHERE status = 'completed')
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Function to log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity(
  admin_user_id_param UUID,
  action_param TEXT,
  resource_type_param TEXT DEFAULT NULL,
  resource_id_param TEXT DEFAULT NULL,
  details_param JSONB DEFAULT NULL,
  ip_address_param INET DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO admin_activity_logs (
    admin_user_id, action, resource_type, resource_id, details, ip_address, user_agent
  ) VALUES (
    admin_user_id_param, action_param, resource_type_param, resource_id_param, 
    details_param, ip_address_param, user_agent_param
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update user balance (admin only)
CREATE OR REPLACE FUNCTION admin_update_user_balance(
  admin_id_param UUID,
  user_id_param UUID,
  wallet_type_param TEXT,
  amount_param DECIMAL(10,2),
  reason_param TEXT
)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  old_balance DECIMAL(10,2);
  new_balance DECIMAL(10,2);
BEGIN
  -- Validate wallet type
  IF wallet_type_param NOT IN ('main', 'fund') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid wallet type');
  END IF;

  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = user_id_param;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Get current balance
  IF wallet_type_param = 'main' THEN
    old_balance := user_profile.main_wallet_balance;
    new_balance := old_balance + amount_param;
    
    UPDATE profiles 
    SET main_wallet_balance = new_balance 
    WHERE id = user_id_param;
  ELSE
    old_balance := user_profile.fund_wallet_balance;
    new_balance := old_balance + amount_param;
    
    UPDATE profiles 
    SET fund_wallet_balance = new_balance 
    WHERE id = user_id_param;
  END IF;

  -- Create transaction record
  INSERT INTO fund_wallet_transactions (
    user_id, transaction_type, amount, balance_before, balance_after, description
  ) VALUES (
    user_id_param, 'admin_adjustment', amount_param, old_balance, new_balance,
    'Admin balance adjustment: ' || reason_param
  );

  -- Log admin activity
  PERFORM log_admin_activity(
    admin_id_param, 'UPDATE_USER_BALANCE', 'user', user_id_param::TEXT,
    json_build_object(
      'wallet_type', wallet_type_param,
      'amount', amount_param,
      'old_balance', old_balance,
      'new_balance', new_balance,
      'reason', reason_param
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Balance updated successfully',
    'old_balance', old_balance,
    'new_balance', new_balance
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update system setting
CREATE OR REPLACE FUNCTION update_system_setting(
  category_param TEXT,
  key_param TEXT,
  value_param TEXT,
  admin_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  setting_exists BOOLEAN;
BEGIN
  -- Check if setting exists
  SELECT EXISTS(
    SELECT 1 FROM system_settings 
    WHERE category = category_param AND key = key_param
  ) INTO setting_exists;
  
  IF setting_exists THEN
    -- Update existing setting
    UPDATE system_settings
    SET 
      value = value_param,
      updated_by = admin_id_param,
      updated_at = now()
    WHERE 
      category = category_param AND key = key_param;
  ELSE
    -- Insert new setting
    INSERT INTO system_settings (
      category, key, value, updated_by
    ) VALUES (
      category_param, key_param, value_param, admin_id_param
    );
  END IF;
  
  -- Log the action
  INSERT INTO admin_activity_logs (
    admin_user_id, action, resource_type, resource_id, details
  ) VALUES (
    admin_id_param, 
    'UPDATE_SETTING', 
    'system_setting', 
    category_param || '.' || key_param,
    json_build_object('category', category_param, 'key', key_param, 'value', value_param)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get system settings by category
CREATE OR REPLACE FUNCTION get_system_settings_by_category(category_param TEXT)
RETURNS SETOF system_settings AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM system_settings
  WHERE category = category_param
  ORDER BY key;
END;
$$ LANGUAGE plpgsql;

-- Function to get all system settings
CREATE OR REPLACE FUNCTION get_all_system_settings()
RETURNS SETOF system_settings AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM system_settings
  ORDER BY category, key;
END;
$$ LANGUAGE plpgsql;

-- Function to get public system settings
CREATE OR REPLACE FUNCTION get_public_system_settings()
RETURNS SETOF system_settings AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM system_settings
  WHERE is_public = true
  ORDER BY category, key;
END;
$$ LANGUAGE plpgsql;

-- Function to update master wallet config
CREATE OR REPLACE FUNCTION update_master_wallet_config(
  wallet_address_param TEXT,
  min_bnb_reserve_param DECIMAL(10,6),
  gas_distribution_amount_param DECIMAL(10,6),
  sweep_threshold_high_param DECIMAL(10,2),
  sweep_threshold_medium_param DECIMAL(10,2),
  sweep_threshold_low_param DECIMAL(10,2),
  auto_sweep_enabled_param BOOLEAN,
  admin_id_param UUID
)
RETURNS JSON AS $$
DECLARE
  config_id UUID;
BEGIN
  -- Update or insert master wallet config
  INSERT INTO master_wallet_config (
    wallet_address,
    min_bnb_reserve,
    gas_distribution_amount,
    sweep_threshold_high,
    sweep_threshold_medium,
    sweep_threshold_low,
    auto_sweep_enabled
  ) VALUES (
    wallet_address_param,
    min_bnb_reserve_param,
    gas_distribution_amount_param,
    sweep_threshold_high_param,
    sweep_threshold_medium_param,
    sweep_threshold_low_param,
    auto_sweep_enabled_param
  )
  ON CONFLICT (id) DO UPDATE SET
    wallet_address = EXCLUDED.wallet_address,
    min_bnb_reserve = EXCLUDED.min_bnb_reserve,
    gas_distribution_amount = EXCLUDED.gas_distribution_amount,
    sweep_threshold_high = EXCLUDED.sweep_threshold_high,
    sweep_threshold_medium = EXCLUDED.sweep_threshold_medium,
    sweep_threshold_low = EXCLUDED.sweep_threshold_low,
    auto_sweep_enabled = EXCLUDED.auto_sweep_enabled,
    updated_at = now()
  RETURNING id INTO config_id;

  -- Log the action
  INSERT INTO admin_activity_logs (
    admin_user_id, action, resource_type, resource_id, details
  ) VALUES (
    admin_id_param, 
    'UPDATE_MASTER_WALLET_CONFIG', 
    'master_wallet_config', 
    config_id::TEXT,
    json_build_object(
      'wallet_address', wallet_address_param,
      'auto_sweep_enabled', auto_sweep_enabled_param
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Master wallet configuration updated successfully',
    'config_id', config_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get sweep statistics
CREATE OR REPLACE FUNCTION get_sweep_statistics()
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_wallets_monitored', (SELECT COUNT(*) FROM sweep_monitoring WHERE is_monitored = true),
    'wallets_needing_gas', (SELECT COUNT(*) FROM sweep_monitoring WHERE gas_distributed = false AND usdt_balance >= sweep_threshold),
    'wallets_ready_to_sweep', (SELECT COUNT(*) FROM sweep_monitoring WHERE gas_distributed = true AND usdt_balance >= sweep_threshold),
    'total_usdt_available', (SELECT COALESCE(SUM(usdt_balance), 0) FROM sweep_monitoring WHERE usdt_balance >= sweep_threshold),
    'high_priority_wallets', (SELECT COUNT(*) FROM sweep_monitoring WHERE sweep_priority = 1 AND usdt_balance >= sweep_threshold),
    'medium_priority_wallets', (SELECT COUNT(*) FROM sweep_monitoring WHERE sweep_priority = 2 AND usdt_balance >= sweep_threshold),
    'low_priority_wallets', (SELECT COUNT(*) FROM sweep_monitoring WHERE sweep_priority = 3 AND usdt_balance >= sweep_threshold),
    'total_swept_today', (SELECT COALESCE(SUM(usdt_amount), 0) FROM sweep_transactions WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'),
    'total_gas_used_today', (SELECT COALESCE(SUM(bnb_gas_used), 0) FROM sweep_transactions WHERE DATE(created_at) = CURRENT_DATE),
    'pending_sweeps', (SELECT COUNT(*) FROM sweep_transactions WHERE status = 'pending'),
    'failed_sweeps_today', (SELECT COUNT(*) FROM sweep_transactions WHERE DATE(created_at) = CURRENT_DATE AND status = 'failed')
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert Default Admin Roles
INSERT INTO admin_roles (name, display_name, description, permissions) VALUES
('super_admin', 'Super Administrator', 'Full system access', '{
  "users": {"view": true, "create": true, "edit": true, "delete": true, "manage_balances": true},
  "finances": {"view": true, "approve_withdrawals": true, "adjust_balances": true, "view_reports": true},
  "system": {"view_settings": true, "edit_settings": true, "view_logs": true, "manage_admins": true},
  "analytics": {"view_all": true, "export_data": true},
  "notifications": {"create": true, "manage": true}
}'),
('admin', 'Administrator', 'Most system features', '{
  "users": {"view": true, "create": true, "edit": true, "delete": false, "manage_balances": true},
  "finances": {"view": true, "approve_withdrawals": true, "adjust_balances": false, "view_reports": true},
  "system": {"view_settings": true, "edit_settings": false, "view_logs": true, "manage_admins": false},
  "analytics": {"view_all": true, "export_data": false},
  "notifications": {"create": true, "manage": false}
}'),
('sub_admin', 'Sub Administrator', 'Limited access', '{
  "users": {"view": true, "create": false, "edit": true, "delete": false, "manage_balances": false},
  "finances": {"view": true, "approve_withdrawals": false, "adjust_balances": false, "view_reports": true},
  "system": {"view_settings": true, "edit_settings": false, "view_logs": false, "manage_admins": false},
  "analytics": {"view_all": false, "export_data": false},
  "notifications": {"create": false, "manage": false}
}')
ON CONFLICT (name) DO NOTHING;

-- Insert Default System Settings
INSERT INTO system_settings (category, key, value, description, is_public) VALUES
-- Platform Settings
('platform', 'maintenance_mode', 'false', 'Enable/disable maintenance mode', false),
('platform', 'registration_enabled', 'true', 'Allow new user registrations', true),
('platform', 'min_withdrawal_amount', '10', 'Minimum withdrawal amount in USD', true),
('platform', 'withdrawal_fee_percentage', '15', 'Withdrawal fee percentage', true),
('platform', 'p2p_transfer_enabled', 'true', 'Enable P2P transfers', true),
('platform', 'pool_system_enabled', 'true', 'Enable pool system', true),

-- Income Settings
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
('platform', 'p2p_transfer_enabled', 'true', 'Enable P2P transfers between users', true),

-- Security Settings
('security', 'max_login_attempts', '5', 'Maximum failed login attempts', false),
('security', 'session_timeout_hours', '24', 'Admin session timeout in hours', false),
('security', 'require_email_verification', 'true', 'Require email verification', true),
('security', 'require_transaction_pin', 'true', 'Require PIN for transactions', true),
('security', 'ip_restriction_enabled', 'false', 'Restrict admin access to specific IPs', false),
('security', 'allowed_ips', '""', 'Comma-separated list of allowed IPs', false)

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

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_turnover_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_wallet_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sweep_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE sweep_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public can read basic profile data"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "System can insert profiles"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Referral Bonuses Policies
CREATE POLICY "Users can view own bonuses"
  ON referral_bonuses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Pool Progress Policies
CREATE POLICY "Users can view own pool progress"
  ON pool_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Fund Wallet Transactions Policies
CREATE POLICY "Users can view own transactions"
  ON fund_wallet_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- P2P Transfers Policies
CREATE POLICY "Users can view own transfers"
  ON p2p_transfers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create transfers as sender"
  ON p2p_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Withdrawals Policies
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

-- Withdrawal Addresses Policies
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

-- User Wallets Policies
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

-- Deposits Policies
CREATE POLICY "Users can view own deposits"
  ON deposits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Notifications Policies
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

-- Global Turnover Eligibility Policies
CREATE POLICY "Users can view own global turnover eligibility"
  ON global_turnover_eligibility
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Team Reward Claims Policies
CREATE POLICY "Users can view own team reward claims"
  ON team_reward_claims
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON referral_bonuses TO authenticated;
GRANT SELECT ON pool_progress TO authenticated;
GRANT SELECT ON fund_wallet_transactions TO authenticated;
GRANT SELECT, INSERT ON p2p_transfers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON withdrawals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON withdrawal_addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_wallets TO authenticated;
GRANT SELECT ON deposits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT ON global_turnover_eligibility TO authenticated;
GRANT SELECT ON team_reward_claims TO authenticated;
GRANT SELECT ON login_lookup TO authenticated;

-- Grant execute permissions for functions
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION process_account_activation TO authenticated;
GRANT EXECUTE ON FUNCTION process_account_reactivation TO authenticated;
GRANT EXECUTE ON FUNCTION check_pool_progression TO authenticated;
GRANT EXECUTE ON FUNCTION check_global_turnover_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION check_team_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION process_p2p_transfer TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_transfer_history TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_for_p2p TO authenticated;
GRANT EXECUTE ON FUNCTION add_to_fund_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user_wallet TO authenticated;

-- =============================================
-- TRIGGERS
-- =============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_bonuses_updated_at
    BEFORE UPDATE ON referral_bonuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_turnover_eligibility_updated_at
    BEFORE UPDATE ON global_turnover_eligibility
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_roles_updated_at
    BEFORE UPDATE ON admin_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_master_wallet_config_updated_at
    BEFORE UPDATE ON master_wallet_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_wallets_updated_at
    BEFORE UPDATE ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deposits_updated_at
    BEFORE UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sweep_monitoring_updated_at
    BEFORE UPDATE ON sweep_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();