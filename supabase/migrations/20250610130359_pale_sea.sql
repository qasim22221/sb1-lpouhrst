/*
  # Fix P2P Transfer Function - Drop and Recreate

  1. Database Function Updates
    - Drop existing get_user_transfer_history function
    - Recreate with correct column structure
    - Remove reference to non-existent receiver_identifier column

  2. Changes Made
    - DROP FUNCTION to remove existing function with wrong signature
    - CREATE new function with correct return structure
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_user_transfer_history(UUID, INTEGER);

-- Recreate the function with the correct signature
CREATE OR REPLACE FUNCTION get_user_transfer_history(user_id_param UUID, limit_param INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  amount DECIMAL(10,2),
  fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  status TEXT,
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_transfer_history TO authenticated;