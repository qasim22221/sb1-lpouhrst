/*
  # Fix Pool Progress Rank Requirement

  1. Functions Updated
    - `process_account_activation` - Add rank_requirement for Pool 1
    - `check_pool_progression` - Add rank_requirement for subsequent pools

  2. Changes
    - Pool 1: rank_requirement = 'Starter'
    - Pool 2: rank_requirement = 'Gold' 
    - Pool 3: rank_requirement = 'Platinum'
    - Pool 4: rank_requirement = 'Diamond'

  3. Security
    - Maintain existing permissions and validation
*/

-- Drop existing functions to recreate them with fixes
DROP FUNCTION IF EXISTS process_account_activation(UUID);
DROP FUNCTION IF EXISTS check_pool_progression(UUID);

-- Function to process initial account activation (FIXED)
CREATE OR REPLACE FUNCTION process_account_activation(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  activation_cost DECIMAL(10,2) := 21.00;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Check if account is already active
  IF user_profile.account_status = 'active' THEN
    RETURN json_build_object('success', false, 'message', 'Account is already active');
  END IF;

  -- Check if user has sufficient fund wallet balance
  IF user_profile.fund_wallet_balance < activation_cost THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient fund wallet balance for activation');
  END IF;

  -- Deduct activation cost from fund wallet
  UPDATE profiles 
  SET fund_wallet_balance = fund_wallet_balance - activation_cost
  WHERE id = user_id_param;

  -- Activate account
  UPDATE profiles 
  SET 
    account_status = 'active',
    current_pool = 1,
    activation_date = now()
  WHERE id = user_id_param;

  -- Create fund wallet transaction for activation cost
  INSERT INTO fund_wallet_transactions (
    user_id, transaction_type, amount, balance_before, balance_after,
    description
  ) VALUES (
    user_id_param, 'activation', -activation_cost,
    user_profile.fund_wallet_balance,
    user_profile.fund_wallet_balance - activation_cost,
    'Initial account activation fee'
  );

  -- Start Pool 1 (FIXED: Added rank_requirement)
  INSERT INTO pool_progress (
    user_id, pool_number, pool_amount, time_limit_minutes,
    direct_referral_requirement, timer_end, status, rank_requirement
  ) VALUES (
    user_id_param, 1, 5, 30, 0,
    now() + INTERVAL '30 minutes', 'active', 'Starter'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Account activated successfully',
    'activation_cost', activation_cost
  );
END;
$$ LANGUAGE plpgsql;

-- Updated pool progression function (FIXED)
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
      -- Enter next pool (FIXED: Added rank_requirement)
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
    'requirements_met', user_profile.active_direct_referrals >= current_pool.direct_referral_requirement,
    'time_remaining', EXTRACT(EPOCH FROM time_remaining)
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_account_activation TO authenticated;
GRANT EXECUTE ON FUNCTION check_pool_progression TO authenticated;