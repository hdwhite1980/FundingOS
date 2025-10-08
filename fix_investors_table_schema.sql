-- Fix investors table schema to match application needs
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Check if investors table exists
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investors') THEN
    RAISE NOTICE 'Creating investors table...';
    
    CREATE TABLE public.investors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      company VARCHAR(255),
      investor_type VARCHAR(50) DEFAULT 'individual', -- 'individual', 'angel', 'venture_capital', 'family_office'
      status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'prospective'
      investment_range_min NUMERIC(15,2),
      investment_range_max NUMERIC(15,2),
      focus_areas TEXT,
      location VARCHAR(255),
      notes TEXT,
      website VARCHAR(500),
      linkedin VARCHAR(500),
      preferred_contact_method VARCHAR(50),
      last_contact_date TIMESTAMP WITH TIME ZONE,
      next_followup_date TIMESTAMP WITH TIME ZONE,
      tags TEXT[],
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX idx_investors_user_id ON public.investors(user_id);
    CREATE INDEX idx_investors_status ON public.investors(status);
    CREATE INDEX idx_investors_investor_type ON public.investors(investor_type);
    
    -- Enable RLS
    ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Users can view their own investors" ON public.investors
      FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own investors" ON public.investors
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own investors" ON public.investors
      FOR UPDATE USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete their own investors" ON public.investors
      FOR DELETE USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Investors table created successfully!';
  ELSE
    RAISE NOTICE 'Investors table already exists, checking for missing columns...';
    
    -- Add missing columns if they don't exist
    
    -- Check and add investor_type
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'investor_type') THEN
      ALTER TABLE public.investors ADD COLUMN investor_type VARCHAR(50) DEFAULT 'individual';
      RAISE NOTICE 'Added investor_type column';
    END IF;
    
    -- Check and add company
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'company') THEN
      ALTER TABLE public.investors ADD COLUMN company VARCHAR(255);
      RAISE NOTICE 'Added company column';
    END IF;
    
    -- Check and add status
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'status') THEN
      ALTER TABLE public.investors ADD COLUMN status VARCHAR(50) DEFAULT 'active';
      RAISE NOTICE 'Added status column';
    END IF;
    
    -- Check and add investment_range_min
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'investment_range_min') THEN
      ALTER TABLE public.investors ADD COLUMN investment_range_min NUMERIC(15,2);
      RAISE NOTICE 'Added investment_range_min column';
    END IF;
    
    -- Check and add investment_range_max
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'investment_range_max') THEN
      ALTER TABLE public.investors ADD COLUMN investment_range_max NUMERIC(15,2);
      RAISE NOTICE 'Added investment_range_max column';
    END IF;
    
    -- Check and add focus_areas
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'focus_areas') THEN
      ALTER TABLE public.investors ADD COLUMN focus_areas TEXT;
      RAISE NOTICE 'Added focus_areas column';
    END IF;
    
    -- Check and add location
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'location') THEN
      ALTER TABLE public.investors ADD COLUMN location VARCHAR(255);
      RAISE NOTICE 'Added location column';
    END IF;
    
    -- Check and add website
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'website') THEN
      ALTER TABLE public.investors ADD COLUMN website VARCHAR(500);
      RAISE NOTICE 'Added website column';
    END IF;
    
    -- Check and add linkedin
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'linkedin') THEN
      ALTER TABLE public.investors ADD COLUMN linkedin VARCHAR(500);
      RAISE NOTICE 'Added linkedin column';
    END IF;
    
    -- Check and add preferred_contact_method
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'preferred_contact_method') THEN
      ALTER TABLE public.investors ADD COLUMN preferred_contact_method VARCHAR(50);
      RAISE NOTICE 'Added preferred_contact_method column';
    END IF;
    
    -- Check and add last_contact_date
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'last_contact_date') THEN
      ALTER TABLE public.investors ADD COLUMN last_contact_date TIMESTAMP WITH TIME ZONE;
      RAISE NOTICE 'Added last_contact_date column';
    END IF;
    
    -- Check and add next_followup_date
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'next_followup_date') THEN
      ALTER TABLE public.investors ADD COLUMN next_followup_date TIMESTAMP WITH TIME ZONE;
      RAISE NOTICE 'Added next_followup_date column';
    END IF;
    
    -- Check and add tags
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'tags') THEN
      ALTER TABLE public.investors ADD COLUMN tags TEXT[];
      RAISE NOTICE 'Added tags column';
    END IF;
    
    -- Check and add metadata
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'metadata') THEN
      ALTER TABLE public.investors ADD COLUMN metadata JSONB DEFAULT '{}';
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
  AND table_name = 'investors'
ORDER BY ordinal_position;
