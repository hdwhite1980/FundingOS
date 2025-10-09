-- Check what's ACTUALLY in the database RIGHT NOW
SELECT 
  user_id,
  email,
  address_line1,
  city,
  state,
  zip_code,
  phone,
  website,
  service_radius,
  updated_at
FROM user_profiles
WHERE email = 'hdwhite@ahts4me.com'
ORDER BY updated_at DESC
LIMIT 1;
