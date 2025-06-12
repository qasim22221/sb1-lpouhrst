-- Updated database schema for new income distribution logic

-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cycle_completed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activation_amount DECIMAL(10,2) DEFAULT 21.00;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activation_date TIMESTAMPTZ;

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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_turnover_user_status ON global_turnover_eligibility(user_id, status);
CREATE INDEX IF NOT EXISTS idx_global_turnover_end_date ON global_turnover_eligibility(end_date);
CREATE INDEX IF NOT EXISTS idx_team_rewards_user ON team_reward_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_activation_date ON profiles(activation_date);

-- Updated pool progression function
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
        direct_referral_requirement, timer_end, status
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
        'active'
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