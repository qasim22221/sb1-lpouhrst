/*
  # Fix Income Distribution System

  1. New Functions
    - `award_direct_referral_bonus` - Awards $5 to direct referrer
    - `distribute_level_income` - Distributes $0.5 to levels 2-7 in upline
    - `update_user_rank` - Updates user rank based on referral count
    - `award_rank_sponsor_bonus` - Awards bonuses when referrals achieve new ranks

  2. Updates
    - Modify `process_account_activation` to distribute income
    - Modify `process_account_reactivation` to distribute income
    - Add proper transaction handling with BEGIN/EXCEPTION blocks

  3. Features
    - Complete income distribution on activation
    - Proper referral tracking and counting
    - Rank progression and sponsor bonuses
*/

-- Function to award direct referral bonus
CREATE OR REPLACE FUNCTION award_direct_referral_bonus(
  user_id_param UUID,
  referrer_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_profile RECORD;
  bonus_amount DECIMAL(10,2) := 5.00; -- $5 direct referral bonus
BEGIN
  -- Get referrer profile
  SELECT * INTO referrer_profile
  FROM profiles
  WHERE id = referrer_id_param;

  IF NOT FOUND THEN
    RAISE NOTICE 'Referrer not found: %', referrer_id_param;
    RETURN FALSE;
  END IF;

  -- Check if referrer account is active
  IF referrer_profile.account_status != 'active' THEN
    RAISE NOTICE 'Referrer account not active: %', referrer_id_param;
    RETURN FALSE;
  END IF;

  -- Award direct referral bonus
  INSERT INTO referral_bonuses (
    user_id, bonus_type, amount, description, status, reference_id
  ) VALUES (
    referrer_id_param, 'direct_referral', bonus_amount,
    'Direct referral bonus for ' || (SELECT username FROM profiles WHERE id = user_id_param),
    'completed', user_id_param
  );

  -- Update referrer's main wallet balance
  UPDATE profiles 
  SET 
    main_wallet_balance = main_wallet_balance + bonus_amount,
    total_direct_referrals = COALESCE(total_direct_referrals, 0) + 1,
    active_direct_referrals = COALESCE(active_direct_referrals, 0) + 1
  WHERE id = referrer_id_param;

  RAISE NOTICE 'Direct referral bonus awarded to %: $%', referrer_id_param, bonus_amount;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to distribute level income (for levels 2-7)
CREATE OR REPLACE FUNCTION distribute_level_income(
  user_id_param UUID,
  referrer_code_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_referrer_code TEXT := referrer_code_param;
  current_level INTEGER := 1;
  max_level INTEGER := 7;
  level_bonus DECIMAL(10,2) := 0.5; -- $0.5 per level
  upline_profile RECORD;
  grand_upline_profile RECORD;
BEGIN
  -- Skip level 1 (direct referrer) as they get direct referral bonus
  current_level := 2;
  
  -- Get the upline's referrer (level 2)
  SELECT * INTO upline_profile
  FROM profiles
  WHERE referral_code = current_referrer_code;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No upline found for referral code: %', current_referrer_code;
    RETURN FALSE;
  END IF;
  
  -- Get the upline's referrer code for next level
  current_referrer_code := upline_profile.referred_by;
  
  -- Process levels 2-7
  WHILE current_level <= max_level AND current_referrer_code IS NOT NULL LOOP
    -- Get the profile for this level
    SELECT * INTO grand_upline_profile
    FROM profiles
    WHERE referral_code = current_referrer_code;
    
    IF NOT FOUND THEN
      -- No more uplines, exit loop
      EXIT;
    END IF;
    
    -- Only award level income if upline is active
    IF grand_upline_profile.account_status = 'active' THEN
      -- Award level income
      INSERT INTO referral_bonuses (
        user_id, bonus_type, amount, description, status, reference_id
      ) VALUES (
        grand_upline_profile.id, 'level_income', level_bonus,
        'Level ' || current_level || ' income from ' || (SELECT username FROM profiles WHERE id = user_id_param),
        'completed', user_id_param
      );
      
      -- Update upline's main wallet balance
      UPDATE profiles 
      SET main_wallet_balance = main_wallet_balance + level_bonus
      WHERE id = grand_upline_profile.id;
      
      RAISE NOTICE 'Level % income awarded to %: $%', current_level, grand_upline_profile.id, level_bonus;
    ELSE
      RAISE NOTICE 'Upline at level % is not active: %', current_level, grand_upline_profile.id;
    END IF;
    
    -- Move to next level
    current_level := current_level + 1;
    current_referrer_code := grand_upline_profile.referred_by;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update user rank
CREATE OR REPLACE FUNCTION update_user_rank(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  user_profile RECORD;
  old_rank TEXT;
  new_rank TEXT;
  direct_referrals INTEGER;
  team_size INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  old_rank := user_profile.rank;
  direct_referrals := COALESCE(user_profile.total_direct_referrals, 0);
  
  -- Calculate team size (simplified - direct referrals only for now)
  SELECT COUNT(*) INTO team_size
  FROM profiles
  WHERE referred_by = user_profile.referral_code;
  
  -- Determine new rank based on requirements
  IF direct_referrals >= 10 AND team_size >= 50 THEN
    new_rank := 'Ambassador';
  ELSIF direct_referrals >= 4 THEN
    new_rank := 'Diamond';
  ELSIF direct_referrals >= 2 THEN
    new_rank := 'Platinum';
  ELSIF direct_referrals >= 1 THEN
    new_rank := 'Gold';
  ELSE
    new_rank := 'Starter';
  END IF;
  
  -- Update rank if changed
  IF new_rank != old_rank THEN
    UPDATE profiles
    SET rank = new_rank
    WHERE id = user_id_param;
    
    RAISE NOTICE 'User % rank updated from % to %', user_id_param, old_rank, new_rank;
  END IF;
  
  RETURN new_rank;
END;
$$ LANGUAGE plpgsql;

-- Function to award rank sponsor bonus
CREATE OR REPLACE FUNCTION award_rank_sponsor_bonus(
  user_id_param UUID,
  new_rank_param TEXT,
  referrer_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_profile RECORD;
  bonus_amount DECIMAL(10,2) := 0;
BEGIN
  -- Skip if not a rank that earns bonus
  IF new_rank_param NOT IN ('Gold', 'Platinum', 'Diamond', 'Ambassador') THEN
    RETURN FALSE;
  END IF;
  
  -- Get referrer profile
  SELECT * INTO referrer_profile
  FROM profiles
  WHERE id = referrer_id_param;
  
  IF NOT FOUND OR referrer_profile.account_status != 'active' THEN
    RETURN FALSE;
  END IF;
  
  -- Determine bonus amount based on rank
  CASE new_rank_param
    WHEN 'Gold' THEN bonus_amount := 1.00;
    WHEN 'Platinum' THEN bonus_amount := 2.00;
    WHEN 'Diamond' THEN bonus_amount := 3.00;
    WHEN 'Ambassador' THEN bonus_amount := 4.00;
  END CASE;
  
  -- Award rank sponsor bonus
  INSERT INTO referral_bonuses (
    user_id, bonus_type, amount, description, status, reference_id
  ) VALUES (
    referrer_id_param, 'rank_sponsor_income', bonus_amount,
    'Rank sponsor bonus for ' || (SELECT username FROM profiles WHERE id = user_id_param) || ' reaching ' || new_rank_param,
    'completed', user_id_param
  );
  
  -- Update referrer's main wallet balance
  UPDATE profiles 
  SET main_wallet_balance = main_wallet_balance + bonus_amount
  WHERE id = referrer_id_param;
  
  RAISE NOTICE 'Rank sponsor bonus awarded to % for % reaching %: $%', 
    referrer_id_param, user_id_param, new_rank_param, bonus_amount;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Updated function to process initial account activation with income distribution
CREATE OR REPLACE FUNCTION process_account_activation(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  activation_cost DECIMAL(10,2) := 21.00;
  referrer_id UUID;
  referrer_code TEXT;
  new_rank TEXT;
BEGIN
  -- Start transaction
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

    -- Get referrer information
    IF user_profile.referred_by IS NOT NULL THEN
      SELECT id, referral_code INTO referrer_id, referrer_code
      FROM profiles
      WHERE referral_code = user_profile.referred_by;
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

    -- Start Pool 1
    INSERT INTO pool_progress (
      user_id, pool_number, pool_amount, time_limit_minutes,
      direct_referral_requirement, timer_end, status, rank_requirement
    ) VALUES (
      user_id_param, 1, 5, 30, 0,
      now() + INTERVAL '30 minutes', 'active', 'Starter'
    );

    -- Distribute income to uplines if user was referred
    IF referrer_id IS NOT NULL THEN
      -- 1. Award direct referral bonus to referrer
      PERFORM award_direct_referral_bonus(user_id_param, referrer_id);
      
      -- 2. Distribute level income to levels 2-7
      PERFORM distribute_level_income(user_id_param, referrer_code);
      
      -- 3. Update referrer's rank based on new referral count
      new_rank := update_user_rank(referrer_id);
      
      -- 4. Award rank sponsor bonus if applicable
      IF new_rank != user_profile.rank AND new_rank IN ('Gold', 'Platinum', 'Diamond', 'Ambassador') THEN
        -- Find referrer's referrer (if any)
        DECLARE
          referrer_of_referrer_id UUID;
        BEGIN
          SELECT id INTO referrer_of_referrer_id
          FROM profiles
          WHERE referral_code = referrer_code;
          
          IF FOUND THEN
            PERFORM award_rank_sponsor_bonus(referrer_id, new_rank, referrer_of_referrer_id);
          END IF;
        END;
      END IF;
    END IF;

    -- Commit transaction
    RETURN json_build_object(
      'success', true,
      'message', 'Account activated successfully',
      'activation_cost', activation_cost,
      'income_distributed', referrer_id IS NOT NULL
    );
  EXCEPTION WHEN OTHERS THEN
    -- Rollback transaction on error
    RAISE NOTICE 'Error in account activation: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'message', 'Error during activation: ' || SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to process account reactivation with income distribution
CREATE OR REPLACE FUNCTION process_account_reactivation(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  recycle_bonus DECIMAL(10,2) := 0;
  activation_cost DECIMAL(10,2) := 21.00;
  referrer_id UUID;
  referrer_code TEXT;
BEGIN
  -- Start transaction
  BEGIN
    -- Get user profile
    SELECT * INTO user_profile
    FROM profiles
    WHERE id = user_id_param;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    -- Check if account is inactive
    IF user_profile.account_status != 'inactive' THEN
      RETURN json_build_object('success', false, 'message', 'Account must be inactive to reactivate');
    END IF;

    -- Check if user completed a cycle
    IF user_profile.cycle_completed_at IS NULL THEN
      RETURN json_build_object('success', false, 'message', 'Must complete a full cycle before reactivating');
    END IF;

    -- Check if user has sufficient fund wallet balance
    IF user_profile.fund_wallet_balance < activation_cost THEN
      RETURN json_build_object('success', false, 'message', 'Insufficient fund wallet balance for reactivation');
    END IF;

    -- Get referrer information
    IF user_profile.referred_by IS NOT NULL THEN
      SELECT id, referral_code INTO referrer_id, referrer_code
      FROM profiles
      WHERE referral_code = user_profile.referred_by;
    END IF;

    -- Calculate recycle bonus (only for first reactivation)
    IF NOT user_profile.first_reactivation_claimed THEN
      recycle_bonus := 5.00;
    END IF;

    -- Deduct activation cost from fund wallet
    UPDATE profiles 
    SET fund_wallet_balance = fund_wallet_balance - activation_cost
    WHERE id = user_id_param;

    -- Reactivate account
    UPDATE profiles 
    SET 
      account_status = 'active',
      current_pool = 1,
      activation_date = now(),
      first_reactivation_claimed = true,
      main_wallet_balance = main_wallet_balance + recycle_bonus
    WHERE id = user_id_param;

    -- Create fund wallet transaction for activation cost
    INSERT INTO fund_wallet_transactions (
      user_id, transaction_type, amount, balance_before, balance_after,
      description
    ) VALUES (
      user_id_param, 'activation', -activation_cost,
      user_profile.fund_wallet_balance,
      user_profile.fund_wallet_balance - activation_cost,
      'Account reactivation fee'
    );

    -- Award recycle income bonus if applicable
    IF recycle_bonus > 0 THEN
      INSERT INTO referral_bonuses (
        user_id, bonus_type, amount, description, status, reference_id
      ) VALUES (
        user_id_param, 'recycle_income', recycle_bonus,
        'First reactivation bonus - $5 (one-time only)',
        'completed', user_id_param
      );
    END IF;

    -- Start Pool 1
    INSERT INTO pool_progress (
      user_id, pool_number, pool_amount, time_limit_minutes,
      direct_referral_requirement, timer_end, status, rank_requirement
    ) VALUES (
      user_id_param, 1, 5, 30, 0,
      now() + INTERVAL '30 minutes', 'active', 'Starter'
    );

    -- Distribute income to uplines if user was referred
    IF referrer_id IS NOT NULL THEN
      -- 1. Award direct referral bonus to referrer
      PERFORM award_direct_referral_bonus(user_id_param, referrer_id);
      
      -- 2. Distribute level income to levels 2-7
      PERFORM distribute_level_income(user_id_param, referrer_code);
    END IF;

    -- Commit transaction
    RETURN json_build_object(
      'success', true,
      'message', 'Account reactivated successfully',
      'recycle_bonus', recycle_bonus,
      'activation_cost', activation_cost,
      'income_distributed', referrer_id IS NOT NULL
    );
  EXCEPTION WHEN OTHERS THEN
    -- Rollback transaction on error
    RAISE NOTICE 'Error in account reactivation: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'message', 'Error during reactivation: ' || SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION award_direct_referral_bonus TO authenticated;
GRANT EXECUTE ON FUNCTION distribute_level_income TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_rank TO authenticated;
GRANT EXECUTE ON FUNCTION award_rank_sponsor_bonus TO authenticated;
GRANT EXECUTE ON FUNCTION process_account_activation TO authenticated;
GRANT EXECUTE ON FUNCTION process_account_reactivation TO authenticated;