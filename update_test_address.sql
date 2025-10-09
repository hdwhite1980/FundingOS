-- Update your profile with test address data
UPDATE user_profiles
SET 
  address_line1 = '123 Main St',
  address_line2 = 'Suite 100',
  city = 'Atlanta',
  state = 'GA',
  zip_code = '30303',
  phone = '555-123-4567',
  website = 'https://example.com',
  updated_at = NOW()
WHERE email = 'hdwhite@ahts4me.com';

-- Verify the update
SELECT 
  email,
  address_line1,
  city,
  state,
  zip_code,
  phone,
  website
FROM user_profiles
WHERE email = 'hdwhite@ahts4me.com';
