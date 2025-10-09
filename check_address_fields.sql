-- Check address fields in database for your user
SELECT 
  user_id,
  email,
  address_line1,
  address_line2,
  city,
  state,
  zip_code,
  phone,
  website
FROM user_profiles
WHERE email = 'hdwhite@ahts4me.com'
LIMIT 1;
