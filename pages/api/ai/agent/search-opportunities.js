// pages/api/ai/agent/search-opportunities.js
// UPDATED: Now uses enhanced AI-powered discovery system with 65+ sources and general web searches
import { createClient } from '@supabase/supabase-js'
import { AIEnhancedOpportunityDiscovery } from '../../../lib/ai-enhanced-opportunity-discovery.js'

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
    const discoverySystem = new AIEnhancedOpportunityDiscovery(supabase)
    
    // Call the enhanced search with comprehensive coverage
    const results = await discoverySystem.performIntelligentWebSearch(
      searchQuery, 
      {
        userId,
        projectType,
        organizationType,
        location,
        fundingAmount,
        searchDepth: 'comprehensive', // Always use comprehensive for best results
        includeGeneralWebSearch: true, // Enable general web searches
        includeSiteSpecificSearch: true, // Enable site-specific searches
        maxResults: 50 // Allow more results for comprehensive search
      }
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
    return res.status(500).json({ error: 'Enhanced discovery system failed: ' + error.message })
  }
}