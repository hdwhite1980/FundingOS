-- Create investments table for tracking investor contributions
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Check if investments table exists
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investments') THEN
    RAISE NOTICE 'Creating investments table...';
    
    CREATE TABLE public.investments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
      project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
      amount NUMERIC(15,2) NOT NULL,
      investment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      investment_type VARCHAR(50) DEFAULT 'equity', -- 'equity', 'convertible_note', 'safe', 'grant', 'loan', 'other'
      status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
      notes TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX idx_investments_user_id ON public.investments(user_id);
    CREATE INDEX idx_investments_investor_id ON public.investments(investor_id);
    CREATE INDEX idx_investments_project_id ON public.investments(project_id);
    CREATE INDEX idx_investments_investment_date ON public.investments(investment_date);
    CREATE INDEX idx_investments_user_id_created_at ON public.investments(user_id, created_at);
    
    -- Enable RLS
    ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Users can view their own investments" ON public.investments
      FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own investments" ON public.investments
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own investments" ON public.investments
      FOR UPDATE USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete their own investments" ON public.investments
      FOR DELETE USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Investments table created successfully!';
  ELSE
    RAISE NOTICE 'Investments table already exists, checking for missing columns...';
    
    -- Add missing columns if they don't exist
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investments' AND column_name = 'investor_id') THEN
      ALTER TABLE public.investments ADD COLUMN investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added investor_id column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investments' AND column_name = 'project_id') THEN
      ALTER TABLE public.investments ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added project_id column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investments' AND column_name = 'amount') THEN
      ALTER TABLE public.investments ADD COLUMN amount NUMERIC(15,2) NOT NULL DEFAULT 0;
      RAISE NOTICE 'Added amount column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investments' AND column_name = 'investment_date') THEN
      ALTER TABLE public.investments ADD COLUMN investment_date DATE NOT NULL DEFAULT CURRENT_DATE;
      RAISE NOTICE 'Added investment_date column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investments' AND column_name = 'investment_type') THEN
      ALTER TABLE public.investments ADD COLUMN investment_type VARCHAR(50) DEFAULT 'equity';
      RAISE NOTICE 'Added investment_type column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investments' AND column_name = 'status') THEN
      ALTER TABLE public.investments ADD COLUMN status VARCHAR(50) DEFAULT 'completed';
      RAISE NOTICE 'Added status column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investments' AND column_name = 'notes') THEN
      ALTER TABLE public.investments ADD COLUMN notes TEXT;
      RAISE NOTICE 'Added notes column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investments' AND column_name = 'metadata') THEN
      ALTER TABLE public.investments ADD COLUMN metadata JSONB DEFAULT '{}';
      RAISE NOTICE 'Added metadata column';
    END IF;
    
    RAISE NOTICE 'Schema check complete!';
  END IF;
END $$;

-- ============================================
-- PART 2: Verification - Show final schema
-- ============================================

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'investments'
ORDER BY ordinal_position;
