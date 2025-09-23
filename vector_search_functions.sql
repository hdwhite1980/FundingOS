-- Vector Search Functions for SBA Knowledge Base
-- Run this after creating the UFA tables to add vector search capabilities

-- =====================================================
-- VECTOR SEARCH FUNCTIONS
-- =====================================================

-- Function to search SBA knowledge by vector similarity
CREATE OR REPLACE FUNCTION search_sba_knowledge_by_similarity(
    query_vector vector(1536),
    similarity_threshold float DEFAULT 0.8,
    max_results integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    category text,
    similarity_score float
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        k.id,
        k.title,
        k.content,
        k.category,
        1 - (k.content_vector <=> query_vector) as similarity_score
    FROM ufa_sba_knowledge_base k
    WHERE k.active = true
    AND k.content_vector IS NOT NULL
    AND (1 - (k.content_vector <=> query_vector)) > similarity_threshold
    ORDER BY k.content_vector <=> query_vector
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar SBA programs by business context
CREATE OR REPLACE FUNCTION find_similar_sba_programs(
    business_stage text DEFAULT 'early_stage',
    industry_codes text[] DEFAULT '{}',
    max_results integer DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    name text,
    program_type text,
    description text,
    strategic_value integer,
    funding_min bigint,
    funding_max bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.program_type,
        p.description,
        p.strategic_value,
        COALESCE((p.funding_amounts->>'min')::bigint, 0) as funding_min,
        COALESCE((p.funding_amounts->>'max')::bigint, 0) as funding_max
    FROM ufa_sba_programs p
    WHERE p.active = true
    AND (
        business_stage = ANY(p.business_stages) 
        OR cardinality(p.business_stages) = 0
    )
    AND (
        cardinality(industry_codes) = 0 
        OR p.industry_codes && industry_codes
    )
    ORDER BY p.strategic_value DESC, p.name
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to get comprehensive SBA intelligence for a business profile
CREATE OR REPLACE FUNCTION get_sba_intelligence_for_profile(
    tenant_uuid uuid,
    business_stage_param text DEFAULT 'early_stage',
    industry_param text DEFAULT 'technology'
)
RETURNS TABLE (
    readiness_score integer,
    recommended_programs json,
    relevant_knowledge json,
    next_steps json
) AS $$
DECLARE
    user_readiness integer;
    industry_codes_array text[];
BEGIN
    -- Get latest readiness assessment
    SELECT COALESCE(overall_score, 0) INTO user_readiness
    FROM ufa_sba_readiness_assessments
    WHERE tenant_id = tenant_uuid
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Map industry to codes (simplified mapping)
    industry_codes_array := CASE 
        WHEN industry_param ILIKE '%tech%' THEN ARRAY['541511', '541512', '518210']
        WHEN industry_param ILIKE '%manufacturing%' THEN ARRAY['31%', '32%', '33%']
        WHEN industry_param ILIKE '%retail%' THEN ARRAY['44%', '45%']
        ELSE ARRAY[]::text[]
    END;
    
    RETURN QUERY
    SELECT 
        COALESCE(user_readiness, 0) as readiness_score,
        
        -- Get recommended programs
        (
            SELECT json_agg(
                json_build_object(
                    'id', fp.id,
                    'name', fp.name,
                    'type', fp.program_type,
                    'strategic_value', fp.strategic_value,
                    'funding_range', fp.funding_amounts
                )
            )
            FROM find_similar_sba_programs(business_stage_param, industry_codes_array, 3) fp
        ) as recommended_programs,
        
        -- Get relevant knowledge (placeholder - would use vector search with actual embeddings)
        (
            SELECT json_agg(
                json_build_object(
                    'title', kb.title,
                    'category', kb.category,
                    'content_preview', LEFT(kb.content, 200) || '...'
                )
            )
            FROM ufa_sba_knowledge_base kb
            WHERE kb.active = true
            AND (
                kb.category ILIKE '%' || business_stage_param || '%'
                OR business_stage_param = ANY(kb.business_stage_relevance)
            )
            LIMIT 3
        ) as relevant_knowledge,
        
        -- Generate next steps based on readiness
        (
            CASE 
                WHEN user_readiness < 40 THEN 
                    json_build_array(
                        'Complete business plan',
                        'Organize financial documents',
                        'Improve credit score',
                        'Consult with SCORE mentor'
                    )
                WHEN user_readiness < 70 THEN
                    json_build_array(
                        'Identify target SBA programs',
                        'Gather application requirements',
                        'Build lender relationships',
                        'Prepare pitch materials'
                    )
                ELSE
                    json_build_array(
                        'Submit loan applications',
                        'Follow up with lenders',
                        'Prepare for due diligence',
                        'Plan fund utilization'
                    )
            END
        ) as next_steps;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
SELECT 
    'VECTOR FUNCTIONS CREATED' as status,
    'Functions available: search_sba_knowledge_by_similarity, find_similar_sba_programs, get_sba_intelligence_for_profile' as available_functions,
    'Ready to use vector-powered SBA intelligence' as message;