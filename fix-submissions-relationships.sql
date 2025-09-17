-- FIX SUBMISSIONS TABLE FOREIGN KEY RELATIONSHIPS
-- This fixes the relationship issues between submissions, projects, and opportunities

-- ================================================================
-- 1. CHECK AND FIX SUBMISSIONS TABLE STRUCTURE
-- ================================================================

-- First, let's see what columns exist in submissions table
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '📋 CHECKING SUBMISSIONS TABLE STRUCTURE';
    RAISE NOTICE '=======================================================';
    
    -- Check if submissions table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'submissions'
    ) THEN
        RAISE NOTICE '✅ submissions table exists';
        
        -- List all columns in submissions table
        FOR rec IN 
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'submissions'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  📄 Column: % (% - %)', rec.column_name, rec.data_type, 
                CASE WHEN rec.is_nullable = 'YES' THEN 'nullable' ELSE 'not null' END;
        END LOOP;
    ELSE
        RAISE NOTICE '❌ submissions table does not exist';
    END IF;
END $$;

-- ================================================================
-- 2. ADD MISSING COLUMNS TO SUBMISSIONS TABLE IF NEEDED
-- ================================================================

-- Add project_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'submissions' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE public.submissions ADD COLUMN project_id UUID;
        RAISE NOTICE '✅ Added project_id column to submissions';
    ELSE
        RAISE NOTICE '✅ project_id column already exists in submissions';
    END IF;
END $$;

-- Add opportunity_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'submissions' 
        AND column_name = 'opportunity_id'
    ) THEN
        ALTER TABLE public.submissions ADD COLUMN opportunity_id UUID;
        RAISE NOTICE '✅ Added opportunity_id column to submissions';
    ELSE
        RAISE NOTICE '✅ opportunity_id column already exists in submissions';
    END IF;
END $$;

-- ================================================================
-- 3. CREATE FOREIGN KEY CONSTRAINTS
-- ================================================================

-- Drop existing foreign key constraints if they exist (to avoid conflicts)
DO $$
BEGIN
    -- Drop project_id foreign key if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'submissions'
        AND constraint_name = 'submissions_project_id_fkey'
    ) THEN
        ALTER TABLE public.submissions DROP CONSTRAINT submissions_project_id_fkey;
        RAISE NOTICE '🔄 Dropped existing project_id foreign key';
    END IF;
    
    -- Drop opportunity_id foreign key if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'submissions'
        AND constraint_name = 'submissions_opportunity_id_fkey'
    ) THEN
        ALTER TABLE public.submissions DROP CONSTRAINT submissions_opportunity_id_fkey;
        RAISE NOTICE '🔄 Dropped existing opportunity_id foreign key';
    END IF;
END $$;

-- Clean up orphaned data and add foreign key constraint for project_id
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'projects'
    ) THEN
        -- First, check for orphaned records
        SELECT COUNT(*) INTO orphaned_count
        FROM public.submissions s
        WHERE s.project_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = s.project_id
        );
        
        IF orphaned_count > 0 THEN
            RAISE NOTICE '🧹 Found % orphaned submissions with invalid project_id', orphaned_count;
            
            -- Set orphaned project_id to NULL (safer than deleting)
            UPDATE public.submissions 
            SET project_id = NULL
            WHERE project_id IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM public.projects p 
                WHERE p.id = project_id
            );
            
            RAISE NOTICE '🧹 Set % orphaned project_id values to NULL', orphaned_count;
        ELSE
            RAISE NOTICE '✅ No orphaned project_id records found';
        END IF;
        
        -- Now add the foreign key constraint
        ALTER TABLE public.submissions 
        ADD CONSTRAINT submissions_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added foreign key constraint: submissions.project_id -> projects.id';
    ELSE
        RAISE NOTICE '⚠️  projects table does not exist - cannot create foreign key';
    END IF;
END $$;

-- Clean up orphaned data and add foreign key constraint for opportunity_id
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'opportunities'
    ) THEN
        -- First, check for orphaned records
        SELECT COUNT(*) INTO orphaned_count
        FROM public.submissions s
        WHERE s.opportunity_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM public.opportunities o 
            WHERE o.id = s.opportunity_id
        );
        
        IF orphaned_count > 0 THEN
            RAISE NOTICE '🧹 Found % orphaned submissions with invalid opportunity_id', orphaned_count;
            
            -- Option 1: Set orphaned opportunity_id to NULL (safer)
            UPDATE public.submissions 
            SET opportunity_id = NULL
            WHERE opportunity_id IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM public.opportunities o 
                WHERE o.id = opportunity_id
            );
            
            RAISE NOTICE '🧹 Set % orphaned opportunity_id values to NULL', orphaned_count;
            
            -- Option 2: Delete orphaned records (uncomment if preferred)
            -- DELETE FROM public.submissions 
            -- WHERE opportunity_id IS NOT NULL 
            -- AND NOT EXISTS (
            --     SELECT 1 FROM public.opportunities o 
            --     WHERE o.id = opportunity_id
            -- );
            -- RAISE NOTICE '🧹 Deleted % orphaned submission records', orphaned_count;
        ELSE
            RAISE NOTICE '✅ No orphaned opportunity_id records found';
        END IF;
        
        -- Now add the foreign key constraint
        ALTER TABLE public.submissions 
        ADD CONSTRAINT submissions_opportunity_id_fkey 
        FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added foreign key constraint: submissions.opportunity_id -> opportunities.id';
    ELSE
        RAISE NOTICE '⚠️  opportunities table does not exist - cannot create foreign key';
    END IF;
END $$;

-- ================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ================================================================

-- Create indexes for foreign key columns
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON public.submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_opportunity_id ON public.submissions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at);

-- ================================================================
-- 5. VERIFY TABLE RELATIONSHIPS
-- ================================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '🔗 CHECKING TABLE RELATIONSHIPS';
    RAISE NOTICE '=======================================================';
    
    -- Check foreign key constraints on submissions table
    FOR rec IN 
        SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        AND tc.table_name = 'submissions'
    LOOP
        RAISE NOTICE '✅ Foreign Key: %.% -> %.%', 
            rec.table_name, rec.column_name, 
            rec.foreign_table_name, rec.foreign_column_name;
    END LOOP;
    
    -- Check if no foreign keys found
    IF NOT FOUND THEN
        RAISE NOTICE '⚠️  No foreign key relationships found on submissions table';
    END IF;
END $$;

-- ================================================================
-- 6. FINAL VERIFICATION
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '✅ SUBMISSIONS TABLE RELATIONSHIP FIX COMPLETE';
    RAISE NOTICE '=======================================================';
    
    -- Summary of what should now work
    RAISE NOTICE '';
    RAISE NOTICE '📋 FIXED RELATIONSHIPS:';
    RAISE NOTICE '  - submissions.project_id -> projects.id';
    RAISE NOTICE '  - submissions.opportunity_id -> opportunities.id';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 DASHBOARD QUERIES SHOULD NOW WORK:';
    RAISE NOTICE '  - Recent activity with project details';
    RAISE NOTICE '  - Grant submissions with opportunity info';
    RAISE NOTICE '';
    RAISE NOTICE '=======================================================';
END $$;