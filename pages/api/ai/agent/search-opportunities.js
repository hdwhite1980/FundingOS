// pages/api/ai/agent/search-opp    // Initialize the enhanced discovery system
    let discoverySystem;
    try {
      discoverySystem = new AIEnhancedOpportunityDiscovery() // Constructor doesn't take parameters
      console.log('✅ AIEnhancedOpportunityDiscovery initialized successfully')
    } catch (importError) {
      console.error('Failed to initialize AIEnhancedOpportunityDiscovery:', importError)
      throw new Error(`Discovery system initialization failed: ${importError.message}`)
    }s.js
// UPDATED: Now uses enhanced AI-powered discovery system with 65+ sources and general web searches
import { createClient } from '@supabase/supabase-js'
import AIEnhancedOpportunityDiscovery from '../../../../lib/ai-enhanced-opportunity-discovery'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      userId, 
      searchQuery, 
      projectType, 
      organizationType, 
      location,
      fundingAmount,
      searchDepth = 'comprehensive' // Use comprehensive by default for enhanced system
    } = req.body

    if (!userId || !searchQuery) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    console.log(`🚨 LEGACY API WRAPPER: Redirecting to enhanced discovery for query: "${searchQuery}"`)

    // Initialize the enhanced discovery system
    let discoverySystem;
    try {
      discoverySystem = new AIEnhancedOpportunityDiscovery(supabase)
      console.log('✅ AIEnhancedOpportunityDiscovery initialized successfully')
    } catch (importError) {
      console.error('Failed to initialize AIEnhancedOpportunityDiscovery:', importError)
      throw new Error(`Discovery system initialization failed: ${importError.message}`)
    }
    
    // Call the enhanced search with correct parameters
    console.log('🔍 Calling performIntelligentWebSearch with params:', {
      searchQuery,
      projectType,
      organizationType
    })
    
    // Create a default intent analysis since we don't have conversation context
    const defaultIntentAnalysis = {
      searchIntent: 'general_funding_search',
      confidence: 0.7,
      recommendedDepth: 'comprehensive',
      prioritySources: ['government', 'foundations', 'grants_databases'],
      enhancedSearchTerms: [searchQuery],
      specificCategories: projectType ? [projectType] : [],
      organizationFocus: organizationType || 'general'
    }
    
    const results = await discoverySystem.performIntelligentWebSearch(
      searchQuery,
      projectType,
      organizationType,
      defaultIntentAnalysis
    )

    console.log(`✅ LEGACY API WRAPPER: Enhanced discovery found ${results?.opportunities?.length || 0} opportunities`)

    // Return in the format expected by the old API
    return res.status(200).json({
      success: true,
      query: searchQuery,
      opportunitiesFound: results?.opportunities?.length || 0,
      opportunities: results?.opportunities || [],
      searchSources: ['enhanced_ai_discovery'],
      timestamp: new Date().toISOString(),
      enhancedDiscovery: true // Flag to indicate using enhanced system
    })

  } catch (error) {
    console.error('❌ LEGACY API WRAPPER ERROR:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      searchQuery,
      projectType,
      organizationType
    })
    return res.status(500).json({ 
      error: 'Enhanced discovery system failed: ' + error.message,
      details: {
        searchQuery,
        projectType,
        organizationType,
        errorType: error.constructor.name
      }
    })
  }
}