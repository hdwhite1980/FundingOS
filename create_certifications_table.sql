-- Create certifications table for user and organization certifications/credentials
-- This table supports multi-tenant isolation and tracks various types of certifications

-- Create the certifications table
CREATE TABLE public.certifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Certification details
    certification_name VARCHAR(255) NOT NULL,
    certification_type VARCHAR(100), -- e.g., 'professional', 'technical', 'safety', 'quality', 'industry'
    issuing_organization VARCHAR(255),
    certification_number VARCHAR(100),
    
    -- Dates
    issue_date DATE,
    expiration_date DATE,
    renewal_date DATE,
    
    -- Status and validity
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'suspended', 'pending'
    is_verified BOOLEAN DEFAULT false,
    verification_source VARCHAR(255),
    
    -- Documentation
    description TEXT,
    certificate_url TEXT, -- Link to certificate document
    verification_url TEXT, -- Link to verify certification online
    
    -- Metadata
    tags TEXT[], -- Array of tags for categorization
    metadata JSONB DEFAULT '{}', -- Flexible storage for additional data
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_certifications_user_id ON public.certifications(user_id);
CREATE INDEX idx_certifications_organization_id ON public.certifications(organization_id);
CREATE INDEX idx_certifications_type ON public.certifications(certification_type);
CREATE INDEX idx_certifications_status ON public.certifications(status);
CREATE INDEX idx_certifications_expiration ON public.certifications(expiration_date);
CREATE INDEX idx_certifications_tags ON public.certifications USING GIN(tags);
CREATE INDEX idx_certifications_metadata ON public.certifications USING GIN(metadata);

-- Enable Row Level Security
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multi-tenant isolation

-- Policy for users to see their own certifications
CREATE POLICY "Users can view own certifications" ON public.certifications
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() IN (
            SELECT user_id FROM public.user_profiles 
            WHERE id = certifications.organization_id
        )
    );

-- Policy for users to insert their own certifications
CREATE POLICY "Users can insert own certifications" ON public.certifications
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Policy for users to update their own certifications
CREATE POLICY "Users can update own certifications" ON public.certifications
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.uid() IN (
            SELECT user_id FROM public.user_profiles 
            WHERE id = certifications.organization_id
        )
    ) WITH CHECK (
        auth.uid() = user_id OR 
        auth.uid() IN (
            SELECT user_id FROM public.user_profiles 
            WHERE id = certifications.organization_id
        )
    );

-- Policy for users to delete their own certifications
CREATE POLICY "Users can delete own certifications" ON public.certifications
    FOR DELETE USING (
        auth.uid() = user_id OR 
        auth.uid() IN (
            SELECT user_id FROM public.user_profiles 
            WHERE id = certifications.organization_id
        )
    );

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_certifications_updated_at 
    BEFORE UPDATE ON public.certifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to check for expiring certifications
CREATE OR REPLACE FUNCTION get_expiring_certifications(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
    id BIGINT,
    certification_name VARCHAR(255),
    expiration_date DATE,
    days_until_expiration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.certification_name,
        c.expiration_date,
        (c.expiration_date - CURRENT_DATE)::INTEGER as days_until_expiration
    FROM public.certifications c
    WHERE 
        c.user_id = auth.uid() AND
        c.status = 'active' AND
        c.expiration_date IS NOT NULL AND
        c.expiration_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day' * days_ahead)
    ORDER BY c.expiration_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some example certification types for reference
INSERT INTO public.certifications (user_id, certification_name, certification_type, issuing_organization, description, status, created_by)
VALUES 
    -- These are examples - they won't insert unless you have matching user_ids
    -- You can run this after creating your first user
    /*
    (auth.uid(), 'Project Management Professional (PMP)', 'professional', 'Project Management Institute', 'Professional project management certification', 'active', auth.uid()),
    (auth.uid(), 'Certified Public Accountant (CPA)', 'professional', 'State Board of Accountancy', 'Professional accounting certification', 'active', auth.uid()),
    (auth.uid(), 'ISO 9001 Quality Management', 'quality', 'ISO International Organization for Standardization', 'Quality management system certification', 'active', auth.uid()),
    (auth.uid(), 'OSHA Safety Training', 'safety', 'Occupational Safety and Health Administration', 'Workplace safety training certification', 'active', auth.uid()),
    (auth.uid(), 'AWS Certified Solutions Architect', 'technical', 'Amazon Web Services', 'Cloud architecture certification', 'active', auth.uid())
    */
ON CONFLICT DO NOTHING;

-- Create a view for active certifications with expiration warnings
CREATE OR REPLACE VIEW active_certifications_with_status AS
SELECT 
    c.*,
    CASE 
        WHEN c.expiration_date IS NULL THEN 'no_expiration'
        WHEN c.expiration_date < CURRENT_DATE THEN 'expired'
        WHEN c.expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'valid'
    END as expiration_status,
    CASE 
        WHEN c.expiration_date IS NOT NULL THEN 
            (c.expiration_date - CURRENT_DATE)::INTEGER
        ELSE NULL
    END as days_until_expiration
FROM public.certifications c
WHERE c.status = 'active';

-- Grant necessary permissions
GRANT ALL ON public.certifications TO authenticated;
GRANT ALL ON SEQUENCE public.certifications_id_seq TO authenticated;
GRANT SELECT ON active_certifications_with_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_certifications(INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.certifications IS 'User and organization certifications, credentials, and professional qualifications';
COMMENT ON COLUMN public.certifications.certification_type IS 'Type of certification: professional, technical, safety, quality, industry, etc.';
COMMENT ON COLUMN public.certifications.status IS 'Certification status: active, expired, suspended, pending';
COMMENT ON COLUMN public.certifications.is_verified IS 'Whether the certification has been verified through official channels';
COMMENT ON COLUMN public.certifications.metadata IS 'Flexible JSONB storage for additional certification-specific data';
COMMENT ON COLUMN public.certifications.tags IS 'Array of tags for categorization and searching';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Certifications table created successfully with RLS policies and supporting functions';
    RAISE NOTICE 'You can now track user and organization certifications with proper multi-tenant isolation';
    RAISE NOTICE 'Use get_expiring_certifications() function to check for certificates expiring soon';
END $$;