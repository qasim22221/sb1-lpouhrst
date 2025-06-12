-- Update recycle income logic - only $5 on first reactivation

-- Add tracking for first reactivation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_reactivation_claimed BOOLEAN DEFAULT false;

-- Function to process account reactivation with updated recycle income logic
CREATE OR REPLACE FUNCTION process_account_reactivation(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  recycle_bonus DECIMAL(10,2) := 0;
  activation_cost DECIMAL(10,2) := 21.00;
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
      user_id, bonus_type, amount, description
    ) VALUES (
      user_id_param, 'recycle_income', recycle_bonus,
      'First reactivation bonus - $5 (one-time only)'
    );
  END IF;

  -- Start Pool 1
  INSERT INTO pool_progress (
    user_id, pool_number, pool_amount, time_limit_minutes,
    direct_referral_requirement, timer_end, status
  ) VALUES (
    user_id_param, 1, 5, 30, 0,
    now() + INTERVAL '30 minutes', 'active'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Account reactivated successfully',
    'recycle_bonus', recycle_bonus,
    'activation_cost', activation_cost
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_account_reactivation TO authenticated;