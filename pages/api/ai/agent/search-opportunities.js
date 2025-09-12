// pages/api/ai/agent/search-opportunities.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Search engines and APIs we can use
const SEARCH_SOURCES = {
  // Google Custom Search API (requires setup)
  google: async (query, apiKey, searchEngineId) => {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`
    const response = await fetch(url)
    return response.json()
  },
  
  // Bing Web Search API (requires setup)
  bing: async (query, subscriptionKey) => {
    const url = 'https://api.bing.microsoft.com/v7.0/search'
    const response = await fetch(`${url}?q=${encodeURIComponent(query)}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey
      }
    })
    return response.json()
  },
  
}

// Common grant and funding websites to search
const FUNDING_SOURCES = [
  'grants.gov',
  'foundation.org',
  'guidestar.org',
  'candid.org',
  'grantspace.org',
  'nonprofitfinancefund.org',
  'cof.org',
  'afpglobal.org'
]

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
      searchDepth = 'basic' // basic, thorough, comprehensive
    } = req.body

    if (!userId || !searchQuery) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Construct enhanced search queries
    const searchQueries = buildSearchQueries(searchQuery, projectType, organizationType, location, fundingAmount)
    
    // Perform searches
    const searchResults = await performWebSearches(searchQueries, searchDepth)
    
    // Process and filter results
    const opportunities = await processSearchResults(searchResults, projectType, organizationType)
    
    // Store discovered opportunities for the user
    const storedOpportunities = await storeDiscoveredOpportunities(userId, opportunities)

    // Also insert new grants into the shared opportunities table for all users
    await storeSharedOpportunities(opportunities)

    // Log the search activity
    await logSearchActivity(userId, searchQuery, opportunities.length)

    return res.status(200).json({
      success: true,
      query: searchQuery,
      opportunitiesFound: opportunities.length,
      opportunities: storedOpportunities,
      searchSources: Object.keys(searchResults),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error searching for opportunities:', error)
    return res.status(500).json({ error: 'Failed to search for opportunities' })
  }
}

function buildSearchQueries(baseQuery, projectType, organizationType, location, fundingAmount) {
  const queries = []
  
  // Base query with organization type
  queries.push(`${baseQuery} grants ${organizationType || 'nonprofit'}`)
  
  // Location-specific searches
  if (location) {
    queries.push(`${baseQuery} grants ${location}`)
    queries.push(`${location} ${organizationType || 'nonprofit'} funding opportunities`)
  }
  
  // Project type specific
  if (projectType) {
    queries.push(`${projectType} grants ${organizationType || 'nonprofit'}`)
    queries.push(`${projectType} funding opportunities 2024 2025`)
  }
  
  // Funding amount specific
  if (fundingAmount) {
    const amountRange = fundingAmount > 100000 ? 'large grants' : fundingAmount > 25000 ? 'medium grants' : 'small grants'
    queries.push(`${baseQuery} ${amountRange}`)
  }
  
  // General opportunity searches
  queries.push(`${baseQuery} foundation grants`)
  queries.push(`${baseQuery} federal funding opportunities`)
  queries.push(`${organizationType || 'nonprofit'} grants deadlines 2024 2025`)
  
  return queries
}

async function performWebSearches(queries, searchDepth) {
  const results = {
    web: [],
    news: [],
    specific: []
  }
  
  try {
    // Use available search APIs
    for (const query of queries.slice(0, searchDepth === 'comprehensive' ? 10 : searchDepth === 'thorough' ? 6 : 3)) {
      
      // Try DuckDuckGo first (free)
      try {
        const ddgResults = await SEARCH_SOURCES.duckduckgo(query)
        if (ddgResults && ddgResults.RelatedTopics) {
          results.web.push(...ddgResults.RelatedTopics.slice(0, 5))
        }
      } catch (error) {
        console.error('DuckDuckGo search error:', error)
      }
      
      // If Google API is configured, use it
      if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
        try {
          const googleResults = await SEARCH_SOURCES.google(
            query, 
            process.env.GOOGLE_SEARCH_API_KEY, 
            process.env.GOOGLE_SEARCH_ENGINE_ID
          )
          if (googleResults && googleResults.items) {
            results.web.push(...googleResults.items.slice(0, 5))
          }
        } catch (error) {
          console.error('Google search error:', error)
        }
      }
      
      // If Bing API is configured, use it
      if (process.env.BING_SEARCH_API_KEY) {
        try {
          const bingResults = await SEARCH_SOURCES.bing(query, process.env.BING_SEARCH_API_KEY)
          if (bingResults && bingResults.webPages && bingResults.webPages.value) {
            results.web.push(...bingResults.webPages.value.slice(0, 5))
          }
        } catch (error) {
          console.error('Bing search error:', error)
        }
      }
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
  } catch (error) {
    console.error('Web search error:', error)
  }
  
  return results
}

async function processSearchResults(searchResults, projectType, organizationType) {
  const opportunities = []
  const processedUrls = new Set()
  
  // Keywords that indicate funding opportunities
  const fundingKeywords = [
    'grant', 'funding', 'award', 'fellowship', 'scholarship', 'foundation',
    'opportunity', 'application', 'deadline', 'rfp', 'proposal', 'competition',
    'prize', 'contest', 'investment', 'seed funding', 'venture capital'
  ]
  
  // Process web results
  for (const result of searchResults.web) {
    try {
      const url = result.link || result.url || result.URL
      const title = result.title || result.Text || result.name
      const snippet = result.snippet || result.FirstURL || result.description
      
      if (!url || !title || processedUrls.has(url)) continue
      processedUrls.add(url)
      
      // Check if this looks like a funding opportunity
      const text = `${title} ${snippet}`.toLowerCase()
      const relevanceScore = fundingKeywords.reduce((score, keyword) => {
        return score + (text.includes(keyword) ? 1 : 0)
      }, 0)
      
      if (relevanceScore >= 2) { // Must match at least 2 funding keywords
        
        // Extract potential details
        const deadlineMatch = snippet?.match(/deadline[:\s]*([^.]*)/i)
        const amountMatch = snippet?.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/g)
        
        opportunities.push({
          id: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: title.substring(0, 200),
          description: snippet?.substring(0, 500) || 'No description available',
          source: 'web_search',
          source_url: url,
          relevance_score: relevanceScore,
          deadline_info: deadlineMatch ? deadlineMatch[1].trim() : null,
          amount_info: amountMatch ? amountMatch.join(', ') : null,
          discovered_at: new Date().toISOString(),
          search_type: 'internet',
          organization_type: organizationType,
          project_type: projectType
        })
      }
      
    } catch (error) {
      console.error('Error processing search result:', error)
    }
  }
  
  // Sort by relevance score
  return opportunities.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 20)
}

async function storeDiscoveredOpportunities(userId, opportunities) {
  try {
    const opportunitiesToStore = opportunities.map(opp => ({
      ...opp,
      discovered_by_user: userId,
      status: 'discovered',
      needs_review: true
    }))
    
    const { data, error } = await supabase
      .from('discovered_opportunities')
      .upsert(opportunitiesToStore, { 
        onConflict: 'source_url',
        ignoreDuplicates: true 
      })
      .select()
    
    if (error) {
      console.error('Error storing opportunities:', error)
      return opportunities // Return original if storage fails
    }
    
    return data || opportunities
    
  } catch (error) {
    console.error('Error in storeDiscoveredOpportunities:', error)
    return opportunities
  }
}

// Store discovered grants in the shared opportunities table
async function storeSharedOpportunities(opportunities) {
  try {
    if (!opportunities || opportunities.length === 0) return
    // Map web search results to shared opportunity schema
    const sharedOpps = opportunities.map(opp => ({
      external_id: opp.source_url, // Use URL as external_id for web grants
      source: 'web_search',
      title: opp.title,
      sponsor: opp.source_url ? new URL(opp.source_url).hostname : 'Web',
      description: opp.description,
      amount_min: null,
      amount_max: null,
      deadline_date: opp.deadline_info || null,
      deadline_type: opp.deadline_info ? 'fixed' : 'rolling',
      organization_types: [opp.organization_type || 'nonprofit'],
      project_types: [opp.project_type || 'general'],
      source_url: opp.source_url,
      relevance_score: opp.relevance_score,
      last_updated: new Date().toISOString(),
      status: 'active'
    }))
    // Upsert into opportunities table
    const { error } = await supabase
      .from('opportunities')
      .upsert(sharedOpps, { onConflict: 'external_id,source', ignoreDuplicates: false })
    if (error) {
      console.error('Error storing shared opportunities:', error)
    }
  } catch (error) {
    console.error('Error in storeSharedOpportunities:', error)
  }
}

async function logSearchActivity(userId, query, resultsCount) {
  try {
    await supabase
      .from('ai_agent_activity')
      .insert({
        user_id: userId,
        activity_type: 'web_search',
        details: {
          query,
          results_found: resultsCount,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging search activity:', error)
  }
}
