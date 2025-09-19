// pages/api/ai/agent/search-opportunities-simple.js
// Simple fallback search endpoint that doesn't require external dependencies

import { createClient } from '@supabase/supabase-js'

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
      searchDepth = 'basic'
    } = req.body

    if (!userId || !searchQuery) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    console.log(`🔍 Simple search for: "${searchQuery}"`)

    // For now, search existing opportunities in the database
    let query = supabase.from('opportunities').select('*')
    
    // Add basic filtering based on search query
    const searchTerms = searchQuery.toLowerCase().split(' ')
    
    // Build a basic text search
    const searchConditions = searchTerms
      .filter(term => term.length > 2) // Skip very short words
      .map(term => `title.ilike.%${term}%,description.ilike.%${term}%,sponsor.ilike.%${term}%`)
      .join(',')
    
    if (searchConditions) {
      query = query.or(searchConditions)
    }
    
    // Add organization type filter if provided
    if (organizationType && organizationType !== 'unknown') {
      query = query.contains('organization_types', [organizationType])
    }
    
    // Limit results
    query = query.limit(50)
    
    const { data: opportunities, error } = await query

    if (error) {
      console.error('Database search error:', error)
      throw new Error('Database search failed')
    }

    console.log(`✅ Found ${opportunities?.length || 0} matching opportunities`)

    // Return in the format expected by the agent
    return res.status(200).json({
      success: true,
      query: searchQuery,
      opportunitiesFound: opportunities?.length || 0,
      opportunities: opportunities || [],
      searchSources: ['database_search'],
      timestamp: new Date().toISOString(),
      searchMethod: 'simple_database_search'
    })

  } catch (error) {
    console.error('❌ Simple search error:', error)
    return res.status(500).json({ 
      error: 'Search failed: ' + error.message,
      details: {
        searchQuery: req.body.searchQuery,
        errorType: error.constructor.name
      }
    })
  }
}