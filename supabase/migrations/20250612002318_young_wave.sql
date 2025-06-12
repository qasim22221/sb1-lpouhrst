/*
  # Create Announcements System

  1. New Tables
    - `announcements` - System-wide announcements from admin

  2. Security
    - Enable RLS on new tables
    - Add appropriate policies
    - Grant necessary permissions

  3. Features
    - Admin-controlled announcements
    - Rotating announcement banner
    - Different announcement types (info, warning, promo, success)
*/

-- Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'promo')),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_date_range ON announcements(start_date, end_date);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements (read-only for users)
CREATE POLICY "Anyone can view active announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (is_active = true AND start_date <= now() AND end_date >= now());

-- Grant permissions
GRANT SELECT ON announcements TO authenticated;

-- Create updated_at trigger for announcements
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert real announcements
INSERT INTO announcements (
  title, 
  message, 
  type, 
  is_active, 
  start_date, 
  end_date
) VALUES 
(
  'Welcome to Referral Hub!', 
  'Start earning today by inviting friends and family. Each direct referral earns you $5 instantly!',
  'info',
  true,
  now(),
  now() + INTERVAL '30 days'
),
(
  'New Pool System Released', 
  'Our updated pool system now offers faster progression and higher rewards. Complete Pool 4 to earn $27!',
  'success',
  true,
  now(),
  now() + INTERVAL '14 days'
),
(
  'Limited Time Offer: Double Referral Bonus', 
  'For the next 7 days, earn double bonuses on all new referrals who activate their accounts!',
  'promo',
  true,
  now(),
  now() + INTERVAL '7 days'
),
(
  'Upcoming Maintenance', 
  'System maintenance scheduled for June 15, 2025 from 2-4 AM UTC. Some features may be temporarily unavailable.',
  'warning',
  true,
  now(),
  now() + INTERVAL '10 days'
),
(
  'New Mobile App Coming Soon', 
  'Our mobile app will be launching next month! Manage your referrals and earnings on the go.',
  'info',
  true,
  now() + INTERVAL '5 days',
  now() + INTERVAL '20 days'
);

-- Function to get active announcements
CREATE OR REPLACE FUNCTION get_active_announcements()
RETURNS SETOF announcements AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM announcements
  WHERE is_active = true
    AND start_date <= now()
    AND end_date >= now()
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_announcements TO authenticated;