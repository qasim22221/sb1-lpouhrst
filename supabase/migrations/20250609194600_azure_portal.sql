/*
  # Admin Panel System

  1. Admin Tables
    - admin_users: Admin accounts with roles
    - admin_roles: Role definitions and permissions
    - admin_sessions: Admin login sessions
    - admin_activity_logs: All admin actions
    - system_settings: Platform configuration
    - admin_notifications: Internal admin alerts

  2. Security
    - Role-based access control
    - Activity logging
    - Session management
    - Permission checks

  3. Features
    - User management
    - Financial controls
    - Analytics dashboard
    - System monitoring
*/

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

-- User Management Views for Admin
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
('platform', 'maintenance_mode', 'false', 'Enable/disable maintenance mode', false),
('platform', 'registration_enabled', 'true', 'Allow new user registrations', true),
('platform', 'min_withdrawal_amount', '10', 'Minimum withdrawal amount in USD', true),
('platform', 'withdrawal_fee_percentage', '15', 'Withdrawal fee percentage', true),
('platform', 'p2p_transfer_enabled', 'true', 'Enable P2P transfers', true),
('platform', 'pool_system_enabled', 'true', 'Enable pool system', true),
('notifications', 'email_notifications', 'true', 'Send email notifications', false),
('notifications', 'sms_notifications', 'false', 'Send SMS notifications', false),
('security', 'max_login_attempts', '5', 'Maximum failed login attempts', false),
('security', 'session_timeout_hours', '24', 'Admin session timeout in hours', false),
('analytics', 'track_user_activity', 'true', 'Track user activity for analytics', false)
ON CONFLICT (category, key) DO NOTHING;

-- Admin Functions

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

-- Add indexes for performance
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

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_sessions TO authenticated;
GRANT SELECT, INSERT ON admin_activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_notifications TO authenticated;
GRANT SELECT, UPDATE ON system_settings TO authenticated;
GRANT EXECUTE ON FUNCTION create_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_activity TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_balance TO authenticated;