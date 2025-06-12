/*
  # Create admin roles table

  1. New Tables
    - `admin_roles`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Role identifier (e.g., 'super_admin', 'admin', 'sub_admin')
      - `display_name` (text) - Human readable role name
      - `description` (text) - Role description
      - `permissions` (jsonb) - Role permissions object
      - `is_active` (boolean) - Whether role is active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `admin_roles` table
    - Add policy for authenticated admin users to read roles

  3. Initial Data
    - Insert default admin roles (super_admin, admin, sub_admin)
*/

CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for admin users to read roles
CREATE POLICY "Admin users can read roles"
  ON admin_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert default admin roles
INSERT INTO admin_roles (name, display_name, description, permissions) VALUES
(
  'super_admin',
  'Super Administrator',
  'Full system access with all permissions',
  '{
    "users": {"view": true, "create": true, "edit": true, "delete": true, "manage_balances": true},
    "finances": {"view": true, "approve_withdrawals": true, "adjust_balances": true, "view_reports": true},
    "system": {"view_settings": true, "edit_settings": true, "view_logs": true, "manage_admins": true},
    "analytics": {"view_all": true, "export_data": true},
    "notifications": {"create": true, "manage": true}
  }'
),
(
  'admin',
  'Administrator',
  'Standard admin access with most permissions',
  '{
    "users": {"view": true, "create": true, "edit": true, "delete": false, "manage_balances": true},
    "finances": {"view": true, "approve_withdrawals": true, "adjust_balances": false, "view_reports": true},
    "system": {"view_settings": true, "edit_settings": true, "view_logs": true, "manage_admins": false},
    "analytics": {"view_all": true, "export_data": false},
    "notifications": {"create": true, "manage": false}
  }'
),
(
  'sub_admin',
  'Sub Administrator',
  'Limited admin access for specific tasks',
  '{
    "users": {"view": true, "create": false, "edit": true, "delete": false, "manage_balances": false},
    "finances": {"view": true, "approve_withdrawals": false, "adjust_balances": false, "view_reports": true},
    "system": {"view_settings": true, "edit_settings": false, "view_logs": false, "manage_admins": false},
    "analytics": {"view_all": false, "export_data": false},
    "notifications": {"create": false, "manage": false}
  }'
)
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_roles_updated_at
    BEFORE UPDATE ON admin_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();