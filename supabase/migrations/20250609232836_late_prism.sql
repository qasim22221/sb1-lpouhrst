/*
  # Fix System Settings JSON Error

  1. Fix JSON formatting issues
    - Update problematic settings with proper JSON format
    - Ensure all string values are properly quoted
    - Fix boolean and numeric values

  2. Add missing tables for sweep management
    - Create tables for real sweep data
    - Add proper indexes and constraints
*/

-- Fix the specific problematic setting
UPDATE system_settings 
SET value = '""'
WHERE category = 'security' AND key = 'allowed_ips' AND (value = '' OR value IS NULL);

-- Fix any other empty string values
UPDATE system_settings 
SET value = '""'
WHERE value = '' OR value IS NULL;

-- Ensure all email addresses are properly quoted
UPDATE system_settings 
SET value = '"' || TRIM('"' FROM value) || '"'
WHERE key LIKE '%email%' AND value NOT LIKE '"%"';

-- Fix boolean values that might be incorrectly formatted
UPDATE system_settings 
SET value = CASE 
  WHEN LOWER(TRIM('"' FROM value)) = 'true' THEN 'true'
  WHEN LOWER(TRIM('"' FROM value)) = 'false' THEN 'false'
  ELSE value
END
WHERE LOWER(TRIM('"' FROM value)) IN ('true', 'false');

-- Fix numeric values that might be quoted
UPDATE system_settings 
SET value = TRIM('"' FROM value)
WHERE value ~ '^"[0-9]+(\.[0-9]+)?"$';

-- Ensure string values that aren't booleans or numbers are quoted
UPDATE system_settings 
SET value = '"' || REPLACE(value, '"', '') || '"'
WHERE value NOT LIKE '"%"'
  AND value NOT IN ('true', 'false')
  AND value !~ '^[0-9]+(\.[0-9]+)?$'
  AND LENGTH(value) > 0;

-- Create sweep monitoring table for real data
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

-- Create sweep transactions table
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sweep_monitoring_user ON sweep_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_sweep_monitoring_priority ON sweep_monitoring(sweep_priority);
CREATE INDEX IF NOT EXISTS idx_sweep_monitoring_next_sweep ON sweep_monitoring(next_sweep_at);
CREATE INDEX IF NOT EXISTS idx_sweep_transactions_user ON sweep_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sweep_transactions_status ON sweep_transactions(status);
CREATE INDEX IF NOT EXISTS idx_sweep_transactions_created_at ON sweep_transactions(created_at);

-- Enable RLS
ALTER TABLE sweep_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE sweep_transactions ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON sweep_monitoring TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sweep_transactions TO authenticated;

-- Create updated_at trigger for sweep_monitoring
CREATE TRIGGER update_sweep_monitoring_updated_at
    BEFORE UPDATE ON sweep_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_sweep_statistics TO authenticated;

-- Function to update master wallet configuration
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_master_wallet_config TO authenticated;