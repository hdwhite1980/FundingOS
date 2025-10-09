-- Check donations data
SELECT 
    COUNT(*) as donation_count,
    SUM(amount) as total_donations,
    AVG(amount) as avg_donation
FROM public.donations
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';

-- Check investments data
SELECT 
    COUNT(*) as investment_count,
    SUM(amount) as total_invested,
    AVG(amount) as avg_investment
FROM public.investments
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';

-- Check individual donations (adjust columns based on actual schema)
SELECT 
    id,
    donor_id,
    amount,
    donation_date,
    created_at
FROM public.donations
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ORDER BY created_at DESC
LIMIT 10;

-- Check individual investments
SELECT 
    id,
    investor_id,
    amount,
    investment_date,
    investment_type,
    status,
    created_at
FROM public.investments
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ORDER BY created_at DESC
LIMIT 10;
