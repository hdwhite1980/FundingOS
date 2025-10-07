-- Fix company_settings table to support upsert operations
-- Add unique constraint on user_id so onConflict works properly

-- First check if constraint already exists
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.company_settings'::regclass;

-- Add unique constraint on user_id if it doesn't exist
DO $$ 
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.company_settings'::regclass 
          AND conname = 'company_settings_user_id_key'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE public.company_settings 
        ADD CONSTRAINT company_settings_user_id_key UNIQUE (user_id);
        
        RAISE NOTICE '✅ Added unique constraint on company_settings.user_id';
    ELSE
        RAISE NOTICE '✓ Unique constraint already exists on company_settings.user_id';
    END IF;
END $$;

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.company_settings'::regclass
ORDER BY conname;

-- Check current data in company_settings
SELECT 
    id,
    user_id,
    organization_name,
    ein,
    tax_id,
    created_at
FROM public.company_settings
ORDER BY created_at DESC;
