-- Add is_required field to compliance tables for categorization
-- This allows tracking which compliance items are mandatory vs optional/conditional
-- Run this in Supabase SQL Editor

-- ============================================
-- Add is_required to compliance_tracking
-- ============================================

-- Check if column already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'compliance_tracking' 
      AND column_name = 'is_required'
  ) THEN
    ALTER TABLE public.compliance_tracking 
    ADD COLUMN is_required BOOLEAN DEFAULT true;
    
    RAISE NOTICE 'Added is_required column to compliance_tracking';
  ELSE
    RAISE NOTICE 'is_required column already exists in compliance_tracking';
  END IF;
END $$;

-- ============================================
-- Add is_required to compliance_recurring
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'compliance_recurring' 
      AND column_name = 'is_required'
  ) THEN
    ALTER TABLE public.compliance_recurring 
    ADD COLUMN is_required BOOLEAN DEFAULT true;
    
    RAISE NOTICE 'Added is_required column to compliance_recurring';
  ELSE
    RAISE NOTICE 'is_required column already exists in compliance_recurring';
  END IF;
END $$;

-- ============================================
-- Create indexes for performance
-- ============================================

-- Index for filtering by required status
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_is_required 
ON public.compliance_tracking(is_required);

CREATE INDEX IF NOT EXISTS idx_compliance_documents_is_required 
ON public.compliance_documents(is_required);

CREATE INDEX IF NOT EXISTS idx_compliance_recurring_is_required 
ON public.compliance_recurring(is_required);

-- ============================================
-- Add comments for documentation
-- ============================================

COMMENT ON COLUMN public.compliance_tracking.is_required IS 
'Indicates if this compliance item is required (true) or optional/conditional (false)';

COMMENT ON COLUMN public.compliance_documents.is_required IS 
'Indicates if this document is required (true) or optional/conditional (false)';

COMMENT ON COLUMN public.compliance_recurring.is_required IS 
'Indicates if this recurring compliance item is required (true) or optional/conditional (false)';

-- ============================================
-- Verification
-- ============================================

SELECT 
  'compliance_tracking' as table_name,
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'compliance_tracking' 
      AND column_name = 'is_required'
  ) as has_is_required_field
UNION ALL
SELECT 
  'compliance_documents' as table_name,
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'compliance_documents' 
      AND column_name = 'is_required'
  ) as has_is_required_field
UNION ALL
SELECT 
  'compliance_recurring' as table_name,
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'compliance_recurring' 
      AND column_name = 'is_required'
  ) as has_is_required_field;

-- ============================================
-- Sample query to verify data structure
-- ============================================

-- Show sample of compliance tracking with new field
SELECT 
  id, 
  title, 
  is_required, 
  priority, 
  status,
  deadline_date
FROM public.compliance_tracking 
LIMIT 5;

-- Show sample of compliance documents with required field
SELECT 
  id, 
  document_name, 
  is_required, 
  status,
  expiration_date
FROM public.compliance_documents 
LIMIT 5;

-- Show sample of compliance recurring with new field
SELECT 
  id, 
  name, 
  is_required, 
  frequency,
  next_due_date
FROM public.compliance_recurring 
LIMIT 5;
