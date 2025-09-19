// pages/api/ai/agent/search-opportunities.js
// SerpAPI-powered opportunity search with database fallback

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function searchWithSerperAPI(query, projectType, organizationType) {
  if (!process.env.SERPER_API_KEY) {
    console.warn('⚠️ SERPER_API_KEY not found - web search disabled')
    return []
  }
  
  try {
    console.log('🔍 Searching Serper API for:', query)
    
    // Build enhanced search query
    let searchTerms = query
    if (projectType && projectType !== 'unknown') {
      searchTerms += ' ' + projectType.replace(/_/g, ' ')
    }
    if (organizationType && organizationType !== 'unknown') {
      searchTerms += ' ' + organizationType
    }
    searchTerms += ' grants funding opportunities'
    
    const serpApiUrl = 'https://google.serper.dev/search'
    
    console.log('🌐 Making Serper API request...')
    
    const response = await fetch(serpApiUrl, {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchTerms,
        num: 15
      })
    })
    
    if (!response.ok) {
      throw new Error('Serper API responded with status: ' + response.status)
    }
    
    const data = await response.json()
    console.log('📊 Serper API returned results:', data.organic?.length || 0)
    
    if (data.organic && data.organic.length > 0) {
      return data.organic.map(item => ({
        title: item.title || 'No title',
        url: item.link || '',
        description: item.snippet || 'No description available',
        source: 'web_search',
        search_engine: 'google',
        position: item.position || 0,
        domain: item.displayLink || '',
        relevance_score: 0.8
      })).filter(opp => opp.url)
    }
    
    return []
  } catch (error) {
    console.error('❌ Serper API search failed:', error.message)
    return []
  }
}

async function searchDatabase(query, projectType, organizationType) {
  try {
    console.log('🗄️ Searching database for:', query)
    
    const searchTerms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(term => term.length > 2)
    
    let dbQuery = supabase.from('opportunities').select('*')
    
    if (searchTerms.length > 0) {
      const searchConditions = []
      searchTerms.forEach(term => {
        searchConditions.push('title.ilike.%' + term + '%')
        searchConditions.push('description.ilike.%' + term + '%')
        searchConditions.push('sponsor.ilike.%' + term + '%')
      })
      dbQuery = dbQuery.or(searchConditions.join(','))
    }
    
    const { data: opportunities, error } = await dbQuery
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) {
      console.error('Database search error:', error)
      return []
    }
    
    console.log('📊 Database search found:', opportunities?.length || 0)
    return opportunities || []
    
  } catch (error) {
    console.error('❌ Database search failed:', error)
    return []
  }
}

export default async function handler(req, res) {
  console.log('🚀 Search endpoint called with method:', req.method)
  console.log('🔧 Environment check - SERPER_API_KEY exists:', !!process.env.SERPER_API_KEY)
  console.log('🔧 Environment check - SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('🔧 Environment check - SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2))
    
    const { 
      userId, 
      searchQuery, 
      projectType, 
      organizationType
    } = req.body

    if (!userId || !searchQuery) {
      console.log('❌ Missing required parameters:', { userId: !!userId, searchQuery: !!searchQuery })
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    console.log('🔍 Starting search for user', userId, ':', searchQuery)

    // Start both searches in parallel
    const [webResults, dbResults] = await Promise.all([
      searchWithSerperAPI(searchQuery, projectType, organizationType),
      searchDatabase(searchQuery, projectType, organizationType)
    ])

    // Combine results
    const allOpportunities = [...webResults, ...dbResults]
    
    const searchSources = []
    if (webResults.length > 0) searchSources.push('serper_web_search')
    if (dbResults.length > 0) searchSources.push('database_search')
    
    console.log('✅ Search complete:', webResults.length, 'web +', dbResults.length, 'database =', allOpportunities.length, 'total')

    return res.status(200).json({
      success: true,
      query: searchQuery,
      opportunitiesFound: allOpportunities.length,
      opportunities: allOpportunities,
      searchSources,
      searchBreakdown: {
        webResults: webResults.length,
        databaseResults: dbResults.length,
        serperApiEnabled: !!process.env.SERPER_API_KEY
      },
      timestamp: new Date().toISOString(),
      searchMethod: 'serper_plus_database'
    })

  } catch (error) {
    console.error('❌ Search endpoint error:', error)
    
    // Emergency fallback
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
        searchSources: ['emergency_database_fallback'],
        timestamp: new Date().toISOString(),
        searchMethod: 'emergency_fallback',
        note: 'Primary search failed, showing recent opportunities',
        error: error.message
      })
    } catch (fallbackError) {
      console.error('❌ All search methods failed:', fallbackError)
      return res.status(500).json({ 
        error: 'All search methods failed',
        details: {
          primaryError: error.message,
          fallbackError: fallbackError?.message,
          serperApiEnabled: !!process.env.SERPER_API_KEY
        }
      })
    }
  }
}