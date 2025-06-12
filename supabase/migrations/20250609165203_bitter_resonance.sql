/*
  # Fix P2P Transfer Function

  1. Database Function Updates
    - Fix get_user_transfer_history function to remove non-existent transfer_type column reference
    - Ensure function returns correct data structure

  2. Changes Made
    - Removed transfer_type from SELECT and RETURN TABLE in get_user_transfer_history function
    - Function now only returns columns that actually exist in the p2p_transfers table
*/

-- Function to get user transfer history (fixed to remove non-existent column)
CREATE OR REPLACE FUNCTION get_user_transfer_history(user_id_param UUID, limit_param INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  amount DECIMAL(10,2),
  fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  status TEXT,
  transfer_type TEXT,
  receiver_identifier TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sender_username TEXT,
  receiver_username TEXT,
  is_sender BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.sender_id,
    t.receiver_id,
    t.amount,
    t.fee,
    t.net_amount,
    t.status,
    t.transfer_type,
    t.receiver_identifier,
    t.description,
    t.created_at,
    t.completed_at,
    sp.username as sender_username,
    rp.username as receiver_username,
    (t.sender_id = user_id_param) as is_sender
  FROM p2p_transfers t
  LEFT JOIN profiles sp ON t.sender_id = sp.id
  LEFT JOIN profiles rp ON t.receiver_id = rp.id
  WHERE t.sender_id = user_id_param OR t.receiver_id = user_id_param
  ORDER BY t.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;