-- Check donations table schema and data
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'donations'
ORDER BY ordinal_position;

-- Then check your donations data
SELECT *
FROM public.donations
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ORDER BY created_at DESC;

-- Get donation totals
SELECT 
    COUNT(*) as donation_count,
    SUM(amount) as total_donations,
    AVG(amount) as avg_donation
FROM public.donations
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';
