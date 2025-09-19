// pages/api/ai/agent/search-opportunities.js
// Simplified database search for Vercel environment compatibility

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

    console.log(`🔍 Database search for user ${userId}: "${searchQuery}"`)

    // Search existing opportunities in our database with intelligent matching
    let query = supabase.from('opportunities').select('*')
    
    // Build search terms from the query
    const searchTerms = searchQuery.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(' ')
      .filter(term => term.length > 2 && !['the', 'and', 'for', 'with', 'any', 'can', 'you'].includes(term))
    
    console.log('Using search terms:', searchTerms)
    
    if (searchTerms.length > 0) {
      // Create flexible search using OR conditions across multiple fields
      const searchConditions = []
      
      searchTerms.forEach(term => {
        searchConditions.push(`title.ilike.%${term}%`)
        searchConditions.push(`description.ilike.%${term}%`)
        searchConditions.push(`sponsor.ilike.%${term}%`)
      })
      
      query = query.or(searchConditions.join(','))
    }
    
    // Add organization type filter if provided and valid
    if (organizationType && organizationType !== 'unknown' && organizationType !== 'Unknown Organization') {
      try {
        // Try to filter by organization type, but don't fail if it doesn't work
        query = query.overlaps('organization_types', [organizationType])
      } catch (e) {
        console.warn('Organization type filter failed, continuing without it:', e.message)
      }
    }
    
    // Add project type considerations if provided
    if (projectType && projectType !== 'unknown' && projectType !== 'general') {
      try {
        const projectTypeKeywords = projectType.replace(/_/g, ' ').split(' ')
        const projectConditions = projectTypeKeywords.map(keyword => 
          `description.ilike.%${keyword}%`
        ).join(',')
        
        if (projectConditions) {
          query = query.or(projectConditions)
        }
      } catch (e) {
        console.warn('Project type filter failed, continuing without it:', e.message)
      }
    }
    
    // Order by most recent first and limit results
    query = query
      .order('created_at', { ascending: false })
      .limit(30)
    
    const { data: opportunities, error } = await query

    if (error) {
      console.error('Database search error:', error)
      
      // Fallback to simple recent opportunities
      const { data: fallbackOpportunities } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15)
      
      return res.status(200).json({
        success: true,
        query: searchQuery,
        opportunitiesFound: fallbackOpportunities?.length || 0,
        opportunities: fallbackOpportunities || [],
        searchSources: ['database_fallback'],
        timestamp: new Date().toISOString(),
        searchMethod: 'fallback_search',
        note: 'Used fallback search due to advanced query limitations'
      })
    }

    console.log(`✅ Database search found ${opportunities?.length || 0} opportunities`)

    // Return in the format expected by the agent
    return res.status(200).json({
      success: true,
      query: searchQuery,
      opportunitiesFound: opportunities?.length || 0,
      opportunities: opportunities || [],
      searchSources: ['database_search'],
      timestamp: new Date().toISOString(),
      searchMethod: 'intelligent_database_search'
    })

  } catch (error) {
    console.error('❌ Search endpoint error:', error)
    
    // Ultimate fallback - return recent opportunities
    try {
      const { data: recentOpportunities } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      return res.status(200).json({
        success: true,
        query: req.body.searchQuery || 'search',
        opportunitiesFound: recentOpportunities?.length || 0,
        opportunities: recentOpportunities || [],
        searchSources: ['recent_opportunities'],
        timestamp: new Date().toISOString(),
        searchMethod: 'emergency_fallback',
        note: 'Search customization failed, showing recent opportunities'
      })
    } catch (fallbackError) {
      console.error('❌ All search methods failed:', fallbackError)
      return res.status(500).json({ 
        error: 'All search methods failed: ' + error.message,
        details: {
          primaryError: error.message,
          fallbackError: fallbackError?.message
        }
      })
    }
  }
}