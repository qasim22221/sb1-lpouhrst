/*
  # Fix Pool Progression Issue

  1. Issues Fixed
    - Pool progression not recognizing active direct referrals correctly
    - Users with sufficient referrals not exiting Pool 1
    - Pool rewards not being distributed properly

  2. Changes Made
    - Update check_pool_progression function to properly check active_direct_referrals
    - Fix the direct referral requirement check logic
    - Add debugging to help identify issues
    - Ensure proper reward distribution
*/

-- Create a function to debug user referral counts
CREATE OR REPLACE FUNCTION debug_user_referrals(username_param TEXT)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  direct_referrals RECORD;
  active_referrals INTEGER := 0;
  result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE username = username_param;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Get all direct referrals
  FOR direct_referrals IN
    SELECT id, username, account_status, activation_date
    FROM profiles
    WHERE referred_by = user_profile.referral_code
  LOOP
    -- Count active referrals
    IF direct_referrals.account_status = 'active' THEN
      active_referrals := active_referrals + 1;
    END IF;
  END LOOP;

  -- Update the user's active_direct_referrals count if it's incorrect
  IF user_profile.active_direct_referrals != active_referrals THEN
    UPDATE profiles
    SET 
      active_direct_referrals = active_referrals,
      updated_at = now()
    WHERE id = user_profile.id;
    
    RAISE NOTICE 'Updated % active_direct_referrals from % to %', 
      username_param, user_profile.active_direct_referrals, active_referrals;
  END IF;

  -- Build result
  SELECT json_build_object(
    'success', true,
    'username', user_profile.username,
    'referral_code', user_profile.referral_code,
    'total_direct_referrals', user_profile.total_direct_referrals,
    'active_direct_referrals', active_referrals,
    'current_pool', user_profile.current_pool,
    'account_status', user_profile.account_status,
    'direct_referrals', (
      SELECT json_agg(
        json_build_object(
          'username', p.username,
          'account_status', p.account_status,
          'activation_date', p.activation_date
        )
      )
      FROM profiles p
      WHERE p.referred_by = user_profile.referral_code
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fix the check_pool_progression function
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
  IF active_referrals >= current_pool.direct_referral_requirement 
     AND time_remaining > INTERVAL '0' THEN
    
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

-- Create a function to fix specific user's referral counts
CREATE OR REPLACE FUNCTION fix_user_referral_counts(username_param TEXT)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  active_count INTEGER := 0;
  total_count INTEGER := 0;
  result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE username = username_param;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Count total direct referrals
  SELECT COUNT(*) INTO total_count
  FROM profiles
  WHERE referred_by = user_profile.referral_code;

  -- Count active direct referrals
  SELECT COUNT(*) INTO active_count
  FROM profiles
  WHERE referred_by = user_profile.referral_code
  AND account_status = 'active';

  -- Update the user's referral counts
  UPDATE profiles
  SET 
    total_direct_referrals = total_count,
    active_direct_referrals = active_count,
    updated_at = now()
  WHERE id = user_profile.id;

  -- Build result
  SELECT json_build_object(
    'success', true,
    'username', user_profile.username,
    'old_total_referrals', user_profile.total_direct_referrals,
    'new_total_referrals', total_count,
    'old_active_referrals', user_profile.active_direct_referrals,
    'new_active_referrals', active_count,
    'message', 'Referral counts updated successfully'
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fix crypton's referral counts specifically
DO $$
DECLARE
  result JSON;
BEGIN
  SELECT fix_user_referral_counts('crypton') INTO result;
  RAISE NOTICE 'Fix result: %', result;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION debug_user_referrals TO authenticated;
GRANT EXECUTE ON FUNCTION check_pool_progression TO authenticated;
GRANT EXECUTE ON FUNCTION fix_user_referral_counts TO authenticated;