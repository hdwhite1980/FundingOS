-- Check if you have any applications and their status
SELECT 
    id,
    user_id,
    project_name,
    grant_title,
    status,
    amount_requested,
    amount_awarded,
    submission_date,
    created_at,
    updated_at
FROM public.applications
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ORDER BY created_at DESC;

-- Check application statistics
SELECT 
    status,
    COUNT(*) as count,
    SUM(amount_requested) as total_requested,
    SUM(amount_awarded) as total_awarded
FROM public.applications
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
GROUP BY status;
