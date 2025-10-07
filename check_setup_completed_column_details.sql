-- Get detailed column information for setup_completed
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    is_identity,
    is_generated,
    generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name = 'setup_completed';

-- Try a direct raw query to see what PostgreSQL returns
SELECT setup_completed FROM public.user_profiles 
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';
