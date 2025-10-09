-- Check what values are actually stored in the database for your user
SELECT 
  user_id,
  email,
  years_in_operation,
  full_time_staff,
  board_size,
  annual_budget,
  updated_at
FROM user_profiles
WHERE email = 'hdwhite@ahts4me.com'  -- Replace with your email if different
ORDER BY updated_at DESC
LIMIT 1;
