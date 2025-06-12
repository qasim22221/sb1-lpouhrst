/*
  # Fix Pool Progression System

  1. Issues Fixed
    - Pool progression skipping from Pool 1 to Pool 3
    - Incorrect income distribution for pools
    - Direct referral count not being properly used for pool progression

  2. Changes Made
    - Fix check_pool_progression function to properly handle pool progression
    - Ensure each pool has the correct direct referral requirement
    - Fix income distribution for completed pools
*/

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
      user_id_param, 'pool_income', current_pool.pool_amount,
      'Pool ' || current_pool.pool_number || ' completion reward',
      'completed', current_pool.id
    );

    -- Update main wallet balance
    UPDATE profiles 
    SET main_wallet_balance = main_wallet_balance + current_pool.pool_amount
    WHERE id = user_id_param;

    -- Create notification for pool completion
    PERFORM create_notification(
      user_id_param,
      'pool',
      'Pool ' || current_pool.pool_number || ' Completed',
      'Congratulations! You have completed Pool ' || current_pool.pool_number || ' and earned $' || current_pool.pool_amount || '.',
      json_build_object('pool', current_pool.pool_number, 'amount', current_pool.pool_amount)
    );

    -- Check if this was pool 4 (cycle completion)
    IF current_pool.pool_number = 4 THEN
      UPDATE profiles 
      SET account_status = 'inactive',
          cycle_completed_at = now(),
          current_pool = 0
      WHERE id = user_id_param;

      -- Create notification for cycle completion
      PERFORM create_notification(
        user_id_param,
        'cycle',
        'Cycle Completed',
        'Congratulations! You have completed the full cycle. Your account is now inactive and ready for reactivation.',
        json_build_object('cycle_completed', true)
      );

      RETURN json_build_object(
        'success', true,
        'pool_completed', 4,
        'cycle_completed', true,
        'message', 'Cycle completed! Account is now inactive.'
      );
    ELSE
      -- FIXED: Enter next pool with correct pool number (no skipping)
      -- Pool 1 -> Pool 2 -> Pool 3 -> Pool 4
      INSERT INTO pool_progress (
        user_id, pool_number, pool_amount, time_limit_minutes,
        direct_referral_requirement, timer_end, status, rank_requirement
      ) VALUES (
        user_id_param,
        current_pool.pool_number + 1, -- Increment by 1 only
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
        -- FIXED: Correct direct referral requirements for each pool
        CASE current_pool.pool_number + 1
          WHEN 2 THEN 2 -- Pool 2 requires 2 referrals
          WHEN 3 THEN 3 -- Pool 3 requires 3 referrals
          WHEN 4 THEN 4 -- Pool 4 requires 4 referrals
          ELSE 1
        END,
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

      -- Create notification for entering new pool
      PERFORM create_notification(
        user_id_param,
        'pool',
        'Entered Pool ' || (current_pool.pool_number + 1),
        'You have entered Pool ' || (current_pool.pool_number + 1) || '. Complete the requirements to earn $' || 
        CASE current_pool.pool_number + 1
          WHEN 2 THEN '10'
          WHEN 3 THEN '15'
          WHEN 4 THEN '27'
        END || '.',
        json_build_object('pool', current_pool.pool_number + 1)
      );

      RETURN json_build_object(
        'success', true,
        'pool_completed', current_pool.pool_number,
        'next_pool', current_pool.pool_number + 1,
        'message', 'Pool completed! Entered next pool.'
      );
    END IF;

  ELSIF time_remaining <= INTERVAL '0' THEN
    -- Pool expired - Set special status when referrals are insufficient
    IF active_referrals < current_pool.direct_referral_requirement THEN
      UPDATE pool_progress 
      SET status = 'expired_needs_referrals', completed_at = now()
      WHERE id = current_pool.id;

      -- Create notification for expired pool
      PERFORM create_notification(
        user_id_param,
        'pool',
        'Pool ' || current_pool.pool_number || ' Expired',
        'Your Pool ' || current_pool.pool_number || ' has expired. You need ' || 
        (current_pool.direct_referral_requirement - active_referrals) || ' more active referrals to progress.',
        json_build_object(
          'pool', current_pool.pool_number, 
          'needs_referrals', true,
          'active_referrals', active_referrals,
          'required_referrals', current_pool.direct_referral_requirement
        )
      );

      RETURN json_build_object(
        'success', false,
        'pool_expired', current_pool.pool_number,
        'needs_referrals', true,
        'active_referrals', active_referrals,
        'required_referrals', current_pool.direct_referral_requirement,
        'message', 'Pool expired. Need more referrals to progress.'
      );
    ELSE
      -- Regular expiry (shouldn't happen with our new logic, but just in case)
      UPDATE pool_progress 
      SET status = 'expired', completed_at = now()
      WHERE id = current_pool.id;

      RETURN json_build_object(
        'success', false,
        'pool_expired', current_pool.pool_number,
        'message', 'Pool expired due to time limit'
      );
    END IF;
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

-- Function to fix existing pool progression issues
CREATE OR REPLACE FUNCTION fix_pool_progression_issues()
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
  active_pool RECORD;
  active_referrals INTEGER;
BEGIN
  -- Loop through all users with active pools
  FOR user_record IN 
    SELECT p.id, p.username, p.referral_code, p.active_direct_referrals
    FROM profiles p
    JOIN pool_progress pp ON p.id = pp.user_id
    WHERE pp.status = 'active'
  LOOP
    -- Get the active pool for this user
    SELECT * INTO active_pool
    FROM pool_progress
    WHERE user_id = user_record.id AND status = 'active'
    LIMIT 1;
    
    IF FOUND THEN
      -- Count active referrals directly
      SELECT COUNT(*) INTO active_referrals
      FROM profiles
      WHERE referred_by = user_record.referral_code
      AND account_status = 'active';
      
      -- Update the user's active_direct_referrals count if it's incorrect
      IF user_record.active_direct_referrals != active_referrals THEN
        UPDATE profiles
        SET 
          active_direct_referrals = active_referrals,
          updated_at = now()
        WHERE id = user_record.id;
        
        RAISE NOTICE 'Updated user % active_direct_referrals from % to %', 
          user_record.username, user_record.active_direct_referrals, active_referrals;
      END IF;
      
      -- Fix pool direct_referral_requirement if it's incorrect
      IF active_pool.pool_number = 1 AND active_pool.direct_referral_requirement != 1 THEN
        UPDATE pool_progress
        SET direct_referral_requirement = 1
        WHERE id = active_pool.id;
        
        RAISE NOTICE 'Fixed Pool 1 requirement for user %', user_record.username;
      ELSIF active_pool.pool_number = 2 AND active_pool.direct_referral_requirement != 2 THEN
        UPDATE pool_progress
        SET direct_referral_requirement = 2
        WHERE id = active_pool.id;
        
        RAISE NOTICE 'Fixed Pool 2 requirement for user %', user_record.username;
      ELSIF active_pool.pool_number = 3 AND active_pool.direct_referral_requirement != 3 THEN
        UPDATE pool_progress
        SET direct_referral_requirement = 3
        WHERE id = active_pool.id;
        
        RAISE NOTICE 'Fixed Pool 3 requirement for user %', user_record.username;
      ELSIF active_pool.pool_number = 4 AND active_pool.direct_referral_requirement != 4 THEN
        UPDATE pool_progress
        SET direct_referral_requirement = 4
        WHERE id = active_pool.id;
        
        RAISE NOTICE 'Fixed Pool 4 requirement for user %', user_record.username;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the fix function
SELECT fix_pool_progression_issues();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_pool_progression TO authenticated;