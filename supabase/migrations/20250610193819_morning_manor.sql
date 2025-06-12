/*
  # Fix ON CONFLICT DO UPDATE Duplicate Error

  1. Issues Fixed
    - Remove duplicate entries in system_settings inserts
    - Ensure unique constraints are properly handled
    - Fix any duplicate key violations

  2. Changes Made
    - Remove duplicate system_settings entries
    - Add proper conflict resolution
    - Ensure no duplicate constrained values in single command
*/

-- First, let's clean up any existing duplicate system settings
DELETE FROM system_settings a USING system_settings b 
WHERE a.id > b.id 
AND a.category = b.category 
AND a.key = b.key;

-- Now insert system settings one by one to avoid conflicts
-- Platform Settings
INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'platform', 'maintenance_mode', 'false', 'Enable/disable maintenance mode', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'platform' AND key = 'maintenance_mode');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'platform', 'registration_enabled', 'true', 'Allow new user registrations', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'platform' AND key = 'registration_enabled');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'platform', 'min_withdrawal_amount', '10', 'Minimum withdrawal amount in USD', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'platform' AND key = 'min_withdrawal_amount');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'platform', 'max_withdrawal_amount', '10000', 'Maximum withdrawal amount in USD', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'platform' AND key = 'max_withdrawal_amount');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'platform', 'withdrawal_fee_percentage', '15', 'Withdrawal fee percentage', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'platform' AND key = 'withdrawal_fee_percentage');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'platform', 'p2p_transfer_enabled', 'true', 'Enable P2P transfers', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'platform' AND key = 'p2p_transfer_enabled');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'platform', 'pool_system_enabled', 'true', 'Enable pool system', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'platform' AND key = 'pool_system_enabled');

-- Wallet Settings
INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'wallet', 'master_wallet_address', '""', 'Master wallet address for gas distribution', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'wallet' AND key = 'master_wallet_address');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'wallet', 'min_bnb_reserve', '1.0', 'Minimum BNB to keep in master wallet', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'wallet' AND key = 'min_bnb_reserve');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'wallet', 'gas_distribution_amount', '0.001', 'Amount of BNB to distribute per wallet', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'wallet' AND key = 'gas_distribution_amount');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'wallet', 'auto_sweep_enabled', 'false', 'Enable automatic USDT sweeping', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'wallet' AND key = 'auto_sweep_enabled');

-- Sweep Thresholds
INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'wallet', 'sweep_threshold_high', '100', 'High priority sweep threshold in USDT', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'wallet' AND key = 'sweep_threshold_high');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'wallet', 'sweep_threshold_medium', '20', 'Medium priority sweep threshold in USDT', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'wallet' AND key = 'sweep_threshold_medium');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'wallet', 'sweep_threshold_low', '5', 'Low priority sweep threshold in USDT', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'wallet' AND key = 'sweep_threshold_low');

-- Income Distribution
INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'income', 'direct_referral_bonus', '5', 'Direct referral bonus amount in USD', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'income' AND key = 'direct_referral_bonus');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'income', 'level_income_rate', '0.5', 'Level income rate per activation in USD', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'income' AND key = 'level_income_rate');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'income', 'activation_cost', '21', 'Account activation cost in USD', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'income' AND key = 'activation_cost');

-- Pool Settings
INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'income', 'pool_1_amount', '5', 'Pool 1 reward amount in USD', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'income' AND key = 'pool_1_amount');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'income', 'pool_2_amount', '10', 'Pool 2 reward amount in USD', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'income' AND key = 'pool_2_amount');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'income', 'pool_3_amount', '15', 'Pool 3 reward amount in USD', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'income' AND key = 'pool_3_amount');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'income', 'pool_4_amount', '27', 'Pool 4 reward amount in USD', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'income' AND key = 'pool_4_amount');

-- Pool Time Limits
INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'income', 'pool_1_time', '30', 'Pool 1 time limit in minutes', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'income' AND key = 'pool_1_time');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'income', 'pool_2_time', '1440', 'Pool 2 time limit in minutes (24 hours)', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'income' AND key = 'pool_2_time');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'income', 'pool_3_time', '7200', 'Pool 3 time limit in minutes (5 days)', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'income' AND key = 'pool_3_time');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'income', 'pool_4_time', '21600', 'Pool 4 time limit in minutes (15 days)', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'income' AND key = 'pool_4_time');

-- Security Settings
INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'security', 'max_login_attempts', '5', 'Maximum failed login attempts', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'security' AND key = 'max_login_attempts');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'security', 'session_timeout_hours', '24', 'Admin session timeout in hours', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'security' AND key = 'session_timeout_hours');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'security', 'require_email_verification', 'true', 'Require email verification', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'security' AND key = 'require_email_verification');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'security', 'require_transaction_pin', 'true', 'Require PIN for transactions', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'security' AND key = 'require_transaction_pin');

-- Notification Settings
INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'notifications', 'email_notifications', 'true', 'Send email notifications', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'notifications' AND key = 'email_notifications');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'notifications', 'sms_notifications', 'false', 'Send SMS notifications', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'notifications' AND key = 'sms_notifications');

INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'notifications', 'admin_email', '"admin@referralhub.com"', 'Admin email for alerts', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'notifications' AND key = 'admin_email');

-- Analytics Settings
INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'analytics', 'track_user_activity', 'true', 'Track user activity for analytics', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'analytics' AND key = 'track_user_activity');

-- Fee Settings
INSERT INTO system_settings (category, key, value, description, is_public) 
SELECT 'fees', 'main_to_fund_transfer_fee', '10', 'Main to fund wallet transfer fee percentage', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'fees' AND key = 'main_to_fund_transfer_fee');

-- Ensure master wallet config doesn't have duplicates
DELETE FROM master_wallet_config WHERE id NOT IN (
  SELECT MIN(id) FROM master_wallet_config GROUP BY wallet_address
);

-- Insert default master wallet config if none exists
INSERT INTO master_wallet_config (
  wallet_address,
  min_bnb_reserve,
  gas_distribution_amount,
  sweep_threshold_high,
  sweep_threshold_medium,
  sweep_threshold_low,
  auto_sweep_enabled
) 
SELECT 
  '0x0000000000000000000000000000000000000000',
  1.0,
  0.001,
  100.00,
  20.00,
  5.00,
  false
WHERE NOT EXISTS (SELECT 1 FROM master_wallet_config);

-- Ensure admin roles don't have duplicates
DELETE FROM admin_roles WHERE id NOT IN (
  SELECT MIN(id) FROM admin_roles GROUP BY name
);

-- Insert admin roles if they don't exist
INSERT INTO admin_roles (name, display_name, description, permissions)
SELECT 'super_admin', 'Super Administrator', 'Full system access', '{
  "users": {"view": true, "create": true, "edit": true, "delete": true, "manage_balances": true},
  "finances": {"view": true, "approve_withdrawals": true, "adjust_balances": true, "view_reports": true},
  "system": {"view_settings": true, "edit_settings": true, "view_logs": true, "manage_admins": true},
  "analytics": {"view_all": true, "export_data": true},
  "notifications": {"create": true, "manage": true}
}'
WHERE NOT EXISTS (SELECT 1 FROM admin_roles WHERE name = 'super_admin');

INSERT INTO admin_roles (name, display_name, description, permissions)
SELECT 'admin', 'Administrator', 'Most system features', '{
  "users": {"view": true, "create": true, "edit": true, "delete": false, "manage_balances": true},
  "finances": {"view": true, "approve_withdrawals": true, "adjust_balances": false, "view_reports": true},
  "system": {"view_settings": true, "edit_settings": false, "view_logs": true, "manage_admins": false},
  "analytics": {"view_all": true, "export_data": false},
  "notifications": {"create": true, "manage": false}
}'
WHERE NOT EXISTS (SELECT 1 FROM admin_roles WHERE name = 'admin');

INSERT INTO admin_roles (name, display_name, description, permissions)
SELECT 'sub_admin', 'Sub Administrator', 'Limited access', '{
  "users": {"view": true, "create": false, "edit": true, "delete": false, "manage_balances": false},
  "finances": {"view": true, "approve_withdrawals": false, "adjust_balances": false, "view_reports": true},
  "system": {"view_settings": true, "edit_settings": false, "view_logs": false, "manage_admins": false},
  "analytics": {"view_all": false, "export_data": false},
  "notifications": {"create": false, "manage": false}
}'
WHERE NOT EXISTS (SELECT 1 FROM admin_roles WHERE name = 'sub_admin');

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully fixed ON CONFLICT DO UPDATE duplicate error';
END $$;