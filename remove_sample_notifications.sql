-- Remove sample notifications (any with grant-1, grant-2, grant-3 or app-123 in metadata)
DELETE FROM public.notifications
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
  AND (
    metadata::text LIKE '%grant-1%'
    OR metadata::text LIKE '%grant-2%'
    OR metadata::text LIKE '%grant-3%'
    OR metadata::text LIKE '%app-123%'
  );

-- Alternatively, to remove ALL notifications for your user (use with caution)
-- DELETE FROM public.notifications
-- WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';

-- Verify notifications are removed
SELECT 
    id,
    type,
    title,
    message,
    metadata,
    is_read,
    created_at
FROM public.notifications
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ORDER BY created_at DESC;

-- Check total count
SELECT COUNT(*) as total_notifications
FROM public.notifications
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';
