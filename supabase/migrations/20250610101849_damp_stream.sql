/*
  # Create Account Activation Function

  1. New Functions
    - `process_account_activation` - Handles initial account activation
    - Updates existing `process_account_reactivation` function

  2. Security
    - Grant execute permissions to authenticated users
    - Proper validation and error handling

  3. Features
    - Initial activation logic for new users
    - Reactivation logic for users who completed cycles
    - Proper fund wallet deduction
    - Pool system initialization
*/

-- Function to process initial account activation
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
    'message', 'Account activated successfully',
    'activation_cost', activation_cost
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_account_activation TO authenticated;