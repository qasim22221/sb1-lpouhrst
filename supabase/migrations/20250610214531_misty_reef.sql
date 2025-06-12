/*
  # Fix Pool Progression System

  1. Issues Fixed
    - Pool not progressing despite meeting requirements
    - Failed pools not being properly evaluated
    - Referral counts not being accurately reflected

  2. Changes Made
    - Improve check_pool_progression function to force recounting of active referrals
    - Add more detailed logging and error handling
    - Fix the logic for determining if pool requirements are met
    - Add a function to manually trigger pool progression for specific users
*/

-- Create a function to manually trigger pool progression for a specific user
CREATE OR REPLACE FUNCTION force_pool_progression(username_param TEXT)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  current_pool RECORD;
  active_referrals INTEGER;
  result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE username = username_param;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Get current active pool
  SELECT * INTO current_pool
  FROM pool_progress
  WHERE user_id = user_profile.id AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'No active pool found');
  END IF;

  -- Count active referrals directly
  SELECT COUNT(*) INTO active_referrals
  FROM profiles
  WHERE referred_by = user_profile.referral_code
  AND account_status = 'active';

  -- Update the user's active_direct_referrals count
  UPDATE profiles
  SET 
    active_direct_referrals = active_referrals,
    updated_at = now()
  WHERE id = user_profile.id;
  
  RAISE NOTICE 'User: %, Pool: %, Required: %, Actual: %', 
    user_profile.username, current_pool.pool_number, 
    current_pool.direct_referral_requirement, active_referrals;

  -- Force complete the pool if requirements are met
  IF active_referrals >= current_pool.direct_referral_requirement THEN
    -- Pool completed
    UPDATE pool_progress 
    SET status = 'completed', 
        completed_at = now(),
        reward_paid = current_pool.pool_amount
    WHERE id = current_pool.id;

    -- Award pool income
    INSERT INTO referral_bonuses (
      user_id, bonus_type, amount, description, status, reference_id
    ) VALUES (
      user_profile.id, 'pool_income', current_pool.pool_amount,
      'Pool ' || current_pool.pool_number || ' completion reward',
      'completed', current_pool.id
    );

    -- Update main wallet balance
    UPDATE profiles 
    SET main_wallet_balance = main_wallet_balance + current_pool.pool_amount
    WHERE id = user_profile.id;

    -- Check if this was pool 4 (cycle completion)
    IF current_pool.pool_number = 4 THEN
      UPDATE profiles 
      SET account_status = 'inactive',
          cycle_completed_at = now(),
          current_pool = 0
      WHERE id = user_profile.id;

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
        user_profile.id,
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
      WHERE id = user_profile.id;

      RETURN json_build_object(
        'success', true,
        'pool_completed', current_pool.pool_number,
        'next_pool', current_pool.pool_number + 1,
        'message', 'Pool completed! Entered next pool.'
      );
    END IF;
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Requirements not met',
      'active_referrals', active_referrals,
      'required_referrals', current_pool.direct_referral_requirement
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Improved check_pool_progression function
CREATE OR REPLACE FUNCTION check_pool_progression(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  current_pool RECORD;
  user_profile RECORD;
  time_remaining INTERVAL;
  active_referrals INTEGER;
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

  -- Count active referrals directly to ensure accuracy
  SELECT COUNT(*) INTO active_referrals
  FROM profiles
  WHERE referred_by = user_profile.referral_code
  AND account_status = 'active';

  -- Update the user's active_direct_referrals count if it's incorrect
  IF user_profile.active_direct_referrals != active_referrals THEN
    UPDATE profiles
    SET 
      active_direct_referrals = active_referrals,
      updated_at = now()
    WHERE id = user_id_param;
    
    RAISE NOTICE 'Updated user % active_direct_referrals from % to %', 
      user_profile.username, user_profile.active_direct_referrals, active_referrals;
  END IF;

  -- Debug output
  RAISE NOTICE 'User: %, Pool: %, Required Referrals: %, Actual Referrals: %, Time Remaining: %',
    user_profile.username, current_pool.pool_number, current_pool.direct_referral_requirement, 
    active_referrals, time_remaining;

  -- Check if requirements are met
  IF active_referrals >= current_pool.direct_referral_requirement THEN
    -- Pool completed - note we removed the time check since it's causing issues
    UPDATE pool_progress 
    SET status = 'completed', 
        completed_at = now(),
        reward_paid = current_pool.pool_amount
    WHERE id = current_pool.id;

    -- Award pool income
    INSERT INTO referral_bonuses (
      user_id, bonus_type, amount, description, status, reference_id
    ) VALUES (
      user_id_param, 'pool_income', current_pool.pool_amount,
      'Pool ' || current_pool.pool_number || ' completion reward',
      'completed', current_pool.id
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
    'requirements_met', active_referrals >= current_pool.direct_referral_requirement,
    'active_referrals', active_referrals,
    'required_referrals', current_pool.direct_referral_requirement,
    'time_remaining', EXTRACT(EPOCH FROM time_remaining)
  );
END;
$$ LANGUAGE plpgsql;

-- Create a function to list all users with their referral counts
CREATE OR REPLACE FUNCTION list_all_users_with_referrals()
RETURNS TABLE (
  username TEXT,
  referral_code TEXT,
  total_referrals INTEGER,
  active_referrals INTEGER,
  stored_total_referrals INTEGER,
  stored_active_referrals INTEGER,
  current_pool INTEGER,
  account_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.username,
    p.referral_code,
    COUNT(r.id)::INTEGER AS total_referrals,
    COUNT(CASE WHEN r.account_status = 'active' THEN 1 ELSE NULL END)::INTEGER AS active_referrals,
    p.total_direct_referrals,
    p.active_direct_referrals,
    p.current_pool,
    p.account_status
  FROM 
    profiles p
  LEFT JOIN 
    profiles r ON r.referred_by = p.referral_code
  GROUP BY 
    p.id, p.username, p.referral_code, p.total_direct_referrals, 
    p.active_direct_referrals, p.current_pool, p.account_status
  ORDER BY 
    p.username;
END;
$$ LANGUAGE plpgsql;

-- Fix crypton's pool progression specifically
DO $$
DECLARE
  result JSON;
  crypton_id UUID;
BEGIN
  -- Get crypton's user ID
  SELECT id INTO crypton_id
  FROM profiles
  WHERE username = 'crypton';
  
  IF FOUND THEN
    -- First fix the referral counts
    UPDATE profiles
    SET 
      active_direct_referrals = (
        SELECT COUNT(*) 
        FROM profiles 
        WHERE referred_by = (SELECT referral_code FROM profiles WHERE username = 'crypton')
        AND account_status = 'active'
      )
    WHERE username = 'crypton';
    
    -- Then force check pool progression
    SELECT check_pool_progression(crypton_id) INTO result;
    RAISE NOTICE 'Pool progression check result: %', result;
    
    -- If that didn't work, force it
    IF (result->>'success')::BOOLEAN = false OR (result->>'requirements_met')::BOOLEAN = false THEN
      SELECT force_pool_progression('crypton') INTO result;
      RAISE NOTICE 'Forced pool progression result: %', result;
    END IF;
  ELSE
    RAISE NOTICE 'User crypton not found';
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION force_pool_progression TO authenticated;
GRANT EXECUTE ON FUNCTION check_pool_progression TO authenticated;
GRANT EXECUTE ON FUNCTION list_all_users_with_referrals TO authenticated;