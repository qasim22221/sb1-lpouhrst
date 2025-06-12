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
  'Invite friends and earn up to $5 per referral with our new system. Start building your network today!',
  'info',
  true,
  now(),
  now() + INTERVAL '30 days'
),
(
  'Limited Time Promotion', 
  'Activate your account today and get a 10% bonus on your first deposit! Offer valid until June 20, 2025.',
  'promo',
  true,
  now(),
  now() + INTERVAL '7 days'
),
(
  'System Maintenance', 
  'Scheduled maintenance on June 15, 2025 from 2:00 AM to 4:00 AM UTC. Service may be temporarily unavailable.',
  'warning',
  true,
  now(),
  now() + INTERVAL '14 days'
),
(
  'New Feature: P2P Transfers', 
  'You can now transfer funds directly to other users with zero fees! Try it out in the Wallet section.',
  'success',
  true,
  now(),
  now() + INTERVAL '10 days'
),
(
  'Referral Contest', 
  'Refer the most users this month and win a $500 bonus! Contest ends June 30, 2025.',
  'promo',
  true,
  now(),
  now() + INTERVAL '20 days'
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

-- Create real notifications for users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get all users
  FOR user_record IN SELECT id, username FROM profiles LOOP
    -- Create income notification
    PERFORM create_notification(
      user_record.id,
      'income',
      'Welcome Bonus',
      'Welcome to Referral Hub! You have received a $5 welcome bonus.',
      '{"amount": 5, "type": "welcome_bonus"}'
    );
    
    -- Create system notification
    PERFORM create_notification(
      user_record.id,
      'system',
      'Account Created Successfully',
      'Your account has been created successfully. Start by activating your account and inviting friends.',
      '{}'
    );
    
    -- Create referral notification
    PERFORM create_notification(
      user_record.id,
      'referral',
      'Start Earning Now',
      'Share your referral code with friends to start earning. Each direct referral earns you $5!',
      '{"referral_code": "' || (SELECT referral_code FROM profiles WHERE id = user_record.id) || '"}'
    );
  END LOOP;
END $$;

-- Create a trigger to automatically create notifications for new referrals
CREATE OR REPLACE FUNCTION create_referral_notification()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
BEGIN
  -- Only proceed if there's a referrer
  IF NEW.referred_by IS NOT NULL THEN
    -- Get the referrer's ID
    SELECT id INTO referrer_id
    FROM profiles
    WHERE referral_code = NEW.referred_by;
    
    IF referrer_id IS NOT NULL THEN
      -- Create notification for the referrer
      PERFORM create_notification(
        referrer_id,
        'referral',
        'New Referral Joined',
        'User ' || NEW.username || ' has joined using your referral code!',
        jsonb_build_object('username', NEW.username, 'referral_code', NEW.referral_code)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS referral_notification_trigger ON profiles;
CREATE TRIGGER referral_notification_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_notification();

-- Create a trigger for pool completion notifications
CREATE OR REPLACE FUNCTION create_pool_completion_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the pool was completed (status changed to 'completed')
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Create notification for the user
    PERFORM create_notification(
      NEW.user_id,
      'pool',
      'Pool ' || NEW.pool_number || ' Completed',
      'Congratulations! You have completed Pool ' || NEW.pool_number || ' and earned $' || NEW.pool_amount || '.',
      jsonb_build_object('pool_number', NEW.pool_number, 'amount', NEW.pool_amount)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS pool_completion_notification_trigger ON pool_progress;
CREATE TRIGGER pool_completion_notification_trigger
  AFTER INSERT OR UPDATE ON pool_progress
  FOR EACH ROW
  EXECUTE FUNCTION create_pool_completion_notification();

-- Create a trigger for income notifications
CREATE OR REPLACE FUNCTION create_income_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the bonus was completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Create notification for the user
    PERFORM create_notification(
      NEW.user_id,
      'income',
      CASE 
        WHEN NEW.bonus_type = 'direct_referral' THEN 'Direct Referral Bonus'
        WHEN NEW.bonus_type = 'level_income' THEN 'Level Income'
        WHEN NEW.bonus_type = 'rank_sponsor_income' THEN 'Rank Sponsor Bonus'
        WHEN NEW.bonus_type = 'global_turnover_income' THEN 'Global Turnover Income'
        WHEN NEW.bonus_type = 'team_rewards' THEN 'Team Reward'
        WHEN NEW.bonus_type = 'recycle_income' THEN 'Recycle Bonus'
        ELSE 'Income Received'
      END,
      'You received $' || NEW.amount || ' from ' || 
      CASE 
        WHEN NEW.bonus_type = 'direct_referral' THEN 'a direct referral bonus'
        WHEN NEW.bonus_type = 'level_income' THEN 'level income'
        WHEN NEW.bonus_type = 'rank_sponsor_income' THEN 'a rank sponsor bonus'
        WHEN NEW.bonus_type = 'global_turnover_income' THEN 'global turnover income'
        WHEN NEW.bonus_type = 'team_rewards' THEN 'a team reward'
        WHEN NEW.bonus_type = 'recycle_income' THEN 'a recycle bonus'
        ELSE 'an income source'
      END || '.',
      jsonb_build_object('amount', NEW.amount, 'type', NEW.bonus_type)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS income_notification_trigger ON referral_bonuses;
CREATE TRIGGER income_notification_trigger
  AFTER INSERT OR UPDATE ON referral_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION create_income_notification();