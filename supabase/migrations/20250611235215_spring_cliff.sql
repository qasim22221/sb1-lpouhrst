/*
  # Add Notifications and Announcements Tables

  1. New Tables
    - `notifications` - User-specific notifications
    - `announcements` - System-wide announcements

  2. Security
    - Enable RLS on new tables
    - Add appropriate policies
    - Grant necessary permissions

  3. Features
    - Real-time notifications for users
    - Admin-controlled announcements
    - Notification tracking and management
*/

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
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_date_range ON announcements(start_date, end_date);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for announcements (read-only for users)
CREATE POLICY "Anyone can view active announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (is_active = true AND start_date <= now() AND end_date >= now());

-- Grant permissions
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT SELECT ON announcements TO authenticated;

-- Create updated_at trigger for announcements
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample announcements
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
  'Invite friends and earn up to $5 per referral with our new system.',
  'info',
  true,
  now(),
  now() + INTERVAL '30 days'
),
(
  'Limited Time Promotion', 
  'Activate your account today and get a 10% bonus on your first deposit!',
  'promo',
  true,
  now(),
  now() + INTERVAL '7 days'
),
(
  'System Maintenance', 
  'Scheduled maintenance on June 15, 2025. Service may be temporarily unavailable.',
  'warning',
  true,
  now(),
  now() + INTERVAL '14 days'
);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  user_id_param UUID,
  type_param TEXT,
  title_param TEXT,
  message_param TEXT,
  data_param JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    created_at
  ) VALUES (
    user_id_param,
    type_param,
    title_param,
    message_param,
    data_param,
    now()
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_as_read(
  user_id_param UUID,
  notification_ids UUID[] DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF notification_ids IS NULL THEN
    -- Mark all notifications as read
    UPDATE notifications
    SET is_read = true
    WHERE user_id = user_id_param AND is_read = false;
  ELSE
    -- Mark specific notifications as read
    UPDATE notifications
    SET is_read = true
    WHERE user_id = user_id_param AND id = ANY(notification_ids) AND is_read = false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_notifications_as_read TO authenticated;

-- Create sample notifications for testing
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get a sample user
  SELECT id INTO user_record FROM profiles LIMIT 1;
  
  IF FOUND THEN
    -- Create sample notifications
    PERFORM create_notification(
      user_record.id,
      'income',
      'Direct Referral Bonus',
      'You received a $5 direct referral bonus!',
      '{"amount": 5, "type": "direct_referral"}'
    );
    
    PERFORM create_notification(
      user_record.id,
      'referral',
      'New Referral Joined',
      'A new user has joined using your referral code.',
      '{"username": "newuser123"}'
    );
    
    PERFORM create_notification(
      user_record.id,
      'pool',
      'Pool 1 Completed',
      'Congratulations! You have completed Pool 1 and earned $5.',
      '{"pool": 1, "amount": 5}'
    );
  END IF;
END $$;