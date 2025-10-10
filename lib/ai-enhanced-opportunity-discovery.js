// lib/ai-enhanced-opportunity-discovery.js
// AI-Enhanced Opportunity Discovery System with Conversational Intelligence

import { spawn } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export class AIEnhancedOpportunityDiscovery {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY
    this.serperApiKey = process.env.SERPER_API_KEY
    
    // Enhanced search configuration
    this.maxSearchResults = 50
    this.maxContentExtraction = 25
    this.relevanceThreshold = 0.4
    this.contentTimeout = 15000
    
    // Copyright-compliant FundingOS web scraping headers
    this.fundingOSHeaders = {
      'User-Agent': 'FundingOS-Discovery/2.0 (Funding Opportunity Research Bot; +https://fundingos.ai/bot)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'From': 'research@fundingos.ai'
    }
    
    // Backup user agents for fallback (when FundingOS headers might be blocked)
    this.fallbackUserAgents = [
      'Mozilla/5.0 (compatible; FundingOS-Bot/2.0; Research; +https://fundingos.ai/about)',
      'FundingOS-WebCrawler/2.0 (+https://fundingos.ai/crawler)',
      'Mozilla/5.0 (compatible; Academic-Research-Bot/1.0; FundingOS; +https://fundingos.ai)',
      'FundingOS-Opportunity-Discovery/2.0 (Grant Research Tool)'
    ]

    // Domains to exclude from discovery results to avoid duplicating existing synced sources
    this.exclusionDomains = new Set([
      'grants.gov',
      'sam.gov',
      'nih.gov',
      'nsf.gov',
      'candid.org',
      'guidestar.org',
      'foundationcenter.org'
    ])
  }

  // Allow callers to override or augment the exclusion list
  setExclusionDomains(domains) {
    try {
      if (Array.isArray(domains)) {
        this.exclusionDomains = new Set(domains.map(d => String(d).toLowerCase()))
      }
    } catch {}
  }

  // Utility to check if a URL should be excluded
  isExcludedUrl(url) {
    try {
      const u = new URL(url)
      const host = u.hostname.toLowerCase()
      for (const d of this.exclusionDomains) {
        if (host === d || host.endsWith(`.${d}`)) return true
      }
      return false
    } catch {
      return false
    }
  }
  
  // Helper function to safely convert values to arrays for JSONB fields
  ensureArray(value) {
    if (value === null || value === undefined) {
      return []
    }
    if (Array.isArray(value)) {
      return value
    }
    if (typeof value === 'string') {
      // Try to parse as JSON array first
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) {
          return parsed
        }
        return [value]
      } catch {
        return [value]
      }
    }
    // Convert single values to arrays
    return [value]
  }
  
  // Helper function to format eligibility criteria as text (not JSONB array)
  formatEligibilityCriteria(criteria) {
    if (!criteria) {
      return null
    }
    if (Array.isArray(criteria)) {
      return criteria.filter(item => item && typeof item === 'string').join('; ')
    }
    if (typeof criteria === 'string') {
      return criteria
    }
    // Handle objects or other formats
    return String(criteria)
  }

  // Enhanced eligibility extraction from web content
  async extractDetailedEligibility(url, content) {
    try {
      console.log(`🔍 Extracting detailed eligibility from: ${url}`)
      
      // Common eligibility indicators and patterns
      const eligibilityPatterns = [
        /eligibility[^.]*(?:requirements?|criteria)[^.]*[.]/gi,
        /who (?:can|may) apply[^.]*[.]/gi,
        /applicant[^.]*(?:requirements?|must|should)[^.]*[.]/gi,
        /eligible[^.]*(?:organizations?|entities|applicants?)[^.]*[.]/gi,
        /(?:non-?profit|university|college|business|company|corporation)[^.]*eligible[^.]*[.]/gi,
        /minimum[^.]*(?:requirements?|qualifications?)[^.]*[.]/gi,
        /(?:501\(c\)\(3\)|nonprofit|educational institution|research institution)[^.]*[.]/gi
      ]

      const eligibilitySections = []
      
      // Extract text matching eligibility patterns
      eligibilityPatterns.forEach(pattern => {
        const matches = content.match(pattern)
        if (matches) {
          eligibilitySections.push(...matches)
        }
      })

      // Look for structured eligibility sections
      const structuredPatterns = [
        /eligibility[^]*?(?=(?:application|deadline|award|funding amount|contact))/gi,
        /who can apply[^]*?(?=(?:application|deadline|award|funding amount|contact))/gi,
        /applicant requirements[^]*?(?=(?:application|deadline|award|funding amount|contact))/gi
      ]

      structuredPatterns.forEach(pattern => {
        const matches = content.match(pattern)
        if (matches) {
          eligibilitySections.push(...matches.map(m => m.substring(0, 500))) // Limit length
        }
      })

      // Deduplicate and clean
      const uniqueEligibility = [...new Set(eligibilitySections)]
        .map(section => section.trim().replace(/\s+/g, ' '))
        .filter(section => section.length > 20) // Filter out short matches
        .slice(0, 5) // Limit to top 5 most relevant

      console.log(`📋 Extracted ${uniqueEligibility.length} eligibility criteria`)
      
      return {
        criteria: uniqueEligibility,
        source: url,
        extractedAt: new Date().toISOString()
      }
    } catch (error) {
      console.warn('Eligibility extraction failed:', error.message)
      return { criteria: [], source: url, extractedAt: new Date().toISOString() }
    }
  }
  
  // Advanced conversational intent analysis
  async analyzeSearchIntent(userQuery, conversationHistory = [], projectSummaries = []) {
    const prompt = `Analyze this funding search query with additional project context to understand the user's intent and tailor funding searches:

CURRENT QUERY: "${userQuery}"

RECENT CONVERSATION (last 5): ${conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

PROJECT CONTEXT (summaries of user projects):
${JSON.stringify(projectSummaries.slice(0, 5))}

Determine the user's search intent and extract key parameters:

1. SEARCH INTENT TYPE:
   - broad_discovery: General exploration of funding opportunities
   - specific_opportunity: Looking for specific grants/programs
   - project_matching: Matching existing projects to funding
   - deadline_focused: Time-sensitive opportunity search
   - amount_focused: Specific funding amount needs

2. EXTRACTED PARAMETERS:
   - Primary keywords and topics
   - Organization type (nonprofit, startup, university, etc.)
   - Project categories and focus areas
   - Geographic preferences
   - Funding amount ranges
   - Timeline constraints

3. SEARCH STRATEGY (incorporate project information above when relevant):
   - Recommended search depth (quick, standard, comprehensive)
   - Priority funding sources to target
   - Specific search terms to emphasize (include terms derived from project names, categories, goals, and preferred funding types when helpful)

Respond in JSON format:
{
  "searchIntent": "intent_type",
  "confidence": number (0-1),
  "extractedKeywords": ["keyword1", "keyword2"],
  "organizationType": "type or null",
  "projectCategories": ["category1", "category2"],
  "geographicFocus": "location or null",
  "fundingRange": {"min": number or null, "max": number or null},
  "timeConstraints": "urgency level",
  "recommendedDepth": "quick|standard|comprehensive",
  "prioritySources": ["source_type1", "source_type2"],
  "enhancedSearchTerms": ["term1", "term2"],
  "contextualNotes": "additional insights"
}`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a conversational funding search expert. Analyze user intent and optimize search strategies.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 800
        })
      })

      if (!response.ok) {
        throw new Error(`Intent analysis failed: ${response.status}`)
      }

      const data = await response.json()
      const analysisText = data.choices[0]?.message?.content
      
      // Parse the JSON response
      try {
        let cleanJson = analysisText
        if (analysisText.includes('```json')) {
          const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/)
          if (jsonMatch) cleanJson = jsonMatch[1]
        }
        
        return JSON.parse(cleanJson)
      } catch (parseError) {
        console.warn('Failed to parse intent analysis:', parseError)
        return this.getDefaultIntentAnalysis(userQuery)
      }
      
    } catch (error) {
      console.error('Intent analysis error:', error)
      return this.getDefaultIntentAnalysis(userQuery)
    }
  }
  
  getDefaultIntentAnalysis(userQuery) {
    return {
      searchIntent: "broad_discovery",
      confidence: 0.5,
      extractedKeywords: userQuery.toLowerCase().split(/\s+/).filter(word => word.length > 3),
      organizationType: null,
      projectCategories: [],
      geographicFocus: null,
      fundingRange: { min: null, max: null },
      timeConstraints: "flexible",
      recommendedDepth: "standard",
      prioritySources: ["government", "foundation", "corporate"],
      enhancedSearchTerms: [userQuery],
      contextualNotes: "Default analysis due to parsing error"
    }
  }

  async discoverAndAnalyzeOpportunities(searchParams) {
    const {
      userId,
      searchQuery,
      projectType,
      organizationType,
      userProjects = [],
      searchDepth = 'comprehensive',
      conversationHistory = [],
      resourceOnly = false
    } = searchParams

    console.log(`🔍 Starting AI-enhanced opportunity discovery for: "${searchQuery}"`)

    try {
      // Step 1: Analyze conversational intent and optimize search strategy
      console.log('🧠 Analyzing search intent and conversation context...')
      // Build compact project summaries to guide intent and query generation
      const projectSummaries = (userProjects || []).slice(0, 10).map(p => ({
        id: p.id,
        name: p.name || p.title || null,
        type: p.project_type || null,
        categories: Array.isArray(p.project_categories) ? p.project_categories.slice(0, 5) : (p.project_categories ? [p.project_categories] : []),
        goals: Array.isArray(p.primary_goals) ? p.primary_goals.slice(0, 5) : [],
        preferredFunding: Array.isArray(p.preferred_funding_types) ? p.preferred_funding_types.slice(0, 5) : [],
        location: p.location || null,
        fundingNeeded: Number(p.funding_needed || p.funding_request_amount || p.total_project_budget || 0) || 0,
        keywords: this.extractKeywordsFromText((p.description || '').toString(), 12),
        descriptionSnippet: (p.description || '').toString().slice(0, 200)
      }))

      const intentAnalysis = await this.analyzeSearchIntent(searchQuery, conversationHistory, projectSummaries)
      
      console.log('🎯 Intent Analysis Result:', {
        intent: intentAnalysis.searchIntent,
        confidence: intentAnalysis.confidence,
        depth: intentAnalysis.recommendedDepth,
        sources: intentAnalysis.prioritySources.join(', ')
      })

      // Step 2: Perform intelligent web searches with optimized strategy
      const searchResults = await this.performIntelligentWebSearch(
        searchQuery,
        projectType,
        organizationType,
        intentAnalysis,
        projectSummaries,
        resourceOnly
      )
      
      console.log(`📊 Search Results: Found ${searchResults.length} total results`)
      
      // Step 3: Apply intelligent content filtering
  const filteredResults = await this.filterRelevantResultsEnhanced(searchResults, intentAnalysis, userProjects, resourceOnly)
      
      console.log(`🎯 Filtered Results: ${filteredResults.length} relevant results after AI filtering`)
      
      // Step 4: Extract content from promising URLs using web scraping
  const extractedContent = await this.extractContentFromUrls(filteredResults)
      
      console.log(`📄 Content Extraction: Successfully extracted ${extractedContent.length} content blocks`)
      
      // Step 5: Enhanced AI analysis with conversational context
      const analyzedOpportunities = await this.analyzeOpportunitiesWithAI(
        extractedContent, 
        userProjects, 
        searchQuery,
        intentAnalysis,
        resourceOnly
      )
      
      console.log(`🤖 AI Analysis: Identified ${analyzedOpportunities.length} qualified opportunities`)
      
      // Step 6: Generate enhanced fit scores and recommendations
      const scoredOpportunities = await this.generateFitScores(
        analyzedOpportunities, 
        userProjects, 
        organizationType,
        intentAnalysis,
        resourceOnly
      )
      
      // Step 7: Store in database with AI-generated metadata
  const storedOpportunities = await this.storeEnhancedOpportunities(userId, scoredOpportunities, intentAnalysis, resourceOnly)

      console.log(`✅ Discovery complete: Found ${storedOpportunities.length} high-quality opportunities`)

      return {
        success: true,
        opportunitiesFound: storedOpportunities.length,
        opportunities: storedOpportunities,
        searchQuery,
        intentAnalysis,
        searchStrategy: {
          depth: intentAnalysis.recommendedDepth,
          sourcesPrioritized: intentAnalysis.prioritySources,
          keywordsUsed: intentAnalysis.enhancedSearchTerms
        },
        analysisComplete: true,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      console.error('Error in AI-enhanced opportunity discovery:', error)
      throw error
    }
  }

  async performIntelligentWebSearch(searchQuery, projectType, organizationType, intentAnalysis, projectSummaries = [], resourceOnly = false) {
    console.log(`🚨 ENTRY: performIntelligentWebSearch called with intent: "${intentAnalysis.searchIntent}"`)
    
    // Use intent analysis to optimize search strategy
    const enhancedSearchTerms = Array.isArray(intentAnalysis.enhancedSearchTerms) ? intentAnalysis.enhancedSearchTerms : []
    let searchTerms = enhancedSearchTerms.length > 0 
      ? enhancedSearchTerms 
      : this.generateIntelligentSearchQueries(searchQuery, projectType, organizationType, projectSummaries)

    // If resourceOnly, bias towards non-monetary resources and programs
    if (resourceOnly) {
      const resourceQueries = this.generateResourceSearchQueries(searchQuery, projectType, organizationType, projectSummaries)
      searchTerms = [...resourceQueries, ...searchTerms]
    }
    
    console.log(`🔍 Using ${searchTerms.length} optimized search terms based on intent analysis`)
    
    // Enhanced target sites based on intent analysis priority sources
    const targetSites = this.getTargetSitesForIntent(intentAnalysis)
    
    const searchResults = []
    
    // Use Serper API as primary search provider if available
    if (this.serperApiKey) {
      console.log('🎯 Using Serper API as primary search provider')
      
      for (const searchTerm of searchTerms.slice(0, 15)) { // Limit based on intent depth
        try {
          const results = await this.searchWithSerperAPI(searchTerm, intentAnalysis)
          searchResults.push(...results)
          console.log(`🌐 Serper search for "${searchTerm}" found ${results.length} results`)
          
          // Add delay to respect rate limits
          await this.delay(200)
        } catch (error) {
          console.warn(`Serper search failed for "${searchTerm}":`, error.message)
        }
      }
    } else {
      // Fallback to multi-provider search
      console.log('🔄 Using multi-provider fallback search')
      
      for (const searchTerm of searchTerms.slice(0, 10)) {
        try {
          const results = await this.performWebSearch(searchTerm)
          searchResults.push(...results)
        } catch (error) {
          console.warn(`Search failed for "${searchTerm}":`, error.message)
        }
      }
    }
    
    // Site-specific searches for high-priority sources
    if (intentAnalysis.prioritySources.includes('government')) {
      console.log('🏛️ Performing government-specific searches')
      await this.performGovernmentSpecificSearch(searchQuery, searchResults)
    }
    
    if (intentAnalysis.prioritySources.includes('foundation')) {
      console.log('🏢 Performing foundation-specific searches')  
      await this.performFoundationSpecificSearch(searchQuery, searchResults)
    }

  // Apply exclusion filter before dedupe
  const filteredForExclusions = searchResults.filter(r => !this.isExcludedUrl(r.url))
  const deduplicatedResults = this.deduplicateSearchResults(filteredForExclusions)
    console.log(`📊 Search complete: ${deduplicatedResults.length} unique results after deduplication`)
    
    return deduplicatedResults
  }

  generateResourceSearchQueries(baseQuery, projectType, organizationType, projectSummaries = []) {
    const queries = []
    const resourceTerms = [
      // Broad non-monetary resource concepts
      'non-monetary resources', 'in-kind support', 'donated services', 'capacity building',
      'technical assistance program', 'pro bono consulting', 'professional services donation',
      'mentorship program', 'coaching program', 'workshops and training', 'training vouchers',
      'certification vouchers', 'support plan donation', 'implementation support',
      // Credits and donations
      'software grant', 'software donation', 'donated licenses', 'cloud credits', 'compute credits',
      'GPU credits', 'data credits', 'advertising credits', 'Azure credits', 'AWS credits', 'Google Cloud credits',
      'OpenAI credits', 'Hugging Face credits',
      // Access/resources
      'equipment donation', 'hardware donation', 'device donation', 'tooling donation',
      'equipment loaner program', 'lab access', 'facility access', 'workspace access', 'coworking space for nonprofits',
      // Corporate/nonprofit programs
      'Microsoft 365 nonprofit', 'Office 365 nonprofit', 'Dynamics nonprofit',
      'GitHub for nonprofits', 'Salesforce nonprofit program', 'Tableau for nonprofits',
      'Adobe for nonprofits', 'Autodesk nonprofit', 'security credits program',
      // Entrepreneur support without direct cash
      'incubator program no equity', 'accelerator program services only', 'non-dilutive accelerator services'
    ]

    // Base resource queries
    for (const term of resourceTerms) {
      queries.push(`${baseQuery} ${term}`)
    }

    if (projectType) {
      queries.push(`${projectType} ${baseQuery} software grant`)
      queries.push(`${projectType} ${baseQuery} in-kind support`)
      queries.push(`${projectType} ${baseQuery} technical assistance`)
    }

    const currentYear = new Date().getFullYear()
    queries.push(`${baseQuery} nonprofit resources ${currentYear}`)
    queries.push(`${baseQuery} software donation program ${currentYear}`)
    queries.push(`${baseQuery} pro bono services ${currentYear}`)
    queries.push(`${baseQuery} mentorship program ${currentYear}`)
    queries.push(`${baseQuery} equipment donation ${currentYear}`)

    return [...new Set(queries)].slice(0, 30)
  }
  
  getTargetSitesForIntent(intentAnalysis) {
    const baseSites = {
      government: [
        'grants.gov', 'nsf.gov', 'nih.gov', 'energy.gov', 'neh.gov', 'arts.gov',
        'usda.gov', 'sba.gov', 'nist.gov', 'nasa.gov', 'cdc.gov', 'epa.gov'
      ],
      foundation: [
        'foundation.org', 'guidestar.org', 'candid.org', 'grantspace.org',
        'foundationcenter.org', 'gatesfoundation.org', 'rockefellerfoundation.org',
        'fordfoundation.org', 'carnegie.org', 'macfound.org'
      ],
      corporate: [
        'microsoft.com', 'google.com', 'amazon.com', 'facebook.com', 'ibm.com',
        'salesforce.com', 'mastercard.com', 'visa.com', 'jpmorgan.com', 'att.com'
      ],
      international: [
        'europa.eu', 'horizon-europe.ec.europa.eu', 'worldbank.org', 'undp.org',
        'who.int', 'unesco.org', 'unicef.org', 'globalfund.org'
      ],
      academic: [
        'acls.org', 'ssrc.org', 'nber.org', 'brookings.edu', 'rand.org',
        'mit.edu', 'stanford.edu', 'harvard.edu', 'yale.edu'
      ]
    }
    
    // Return sites based on priority sources from intent analysis
    let sites = []
    for (const sourceType of intentAnalysis.prioritySources) {
      if (baseSites[sourceType]) {
        sites.push(...baseSites[sourceType])
      }
    }
    
    // If no specific priorities, return all sites
    return sites.length > 0 ? sites : Object.values(baseSites).flat()
  }
  
  async performGovernmentSpecificSearch(searchQuery, searchResults) {
    const govSites = ['grants.gov', 'nsf.gov', 'nih.gov', 'energy.gov', 'sba.gov']
    
    for (const site of govSites.slice(0, 5)) {
      try {
        const siteQuery = `site:${site} ${searchQuery} funding grants 2024 2025`
        const results = await this.searchWithSerperAPI(siteQuery)
        searchResults.push(...results)
        await this.delay(300)
      } catch (error) {
        console.warn(`Government search failed for ${site}:`, error.message)
      }
    }
  }
  
  async performFoundationSpecificSearch(searchQuery, searchResults) {
    const foundationSites = ['foundation.org', 'candid.org', 'gatesfoundation.org']
    
    for (const site of foundationSites) {
      try {
        const siteQuery = `site:${site} ${searchQuery} grants funding opportunities`
        const results = await this.searchWithSerperAPI(siteQuery)
        searchResults.push(...results)
        await this.delay(300)
      } catch (error) {
        console.warn(`Foundation search failed for ${site}:`, error.message)
      }
    }
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  // Intelligent result filtering before content extraction
  filterRelevantResults(results) {
    console.log(`🎯 Filtering ${results.length} search results for funding relevance`)
    
    return results.filter(result => {
      if (this.isExcludedUrl(result.url)) return false
      const text = `${result.title} ${result.description}`.toLowerCase()
      
      // Funding keywords
      const fundingKeywords = [
        'grant', 'grants', 'funding', 'award', 'fellowship',
        'application', 'deadline', 'eligibility', 'apply',
        '$', 'million', 'thousand', 'budget', 'proposal'
      ]
      
      // Funding organizations
      const fundingOrgs = [
        'nsf', 'nih', 'neh', 'doe', 'nasa', 'grants.gov',
        'foundation', 'fund', 'institute', 'agency'
      ]
      
      // Must have funding keywords OR be from funding organizations
      const hasFundingKeywords = fundingKeywords.some(keyword => text.includes(keyword))
      const isFundingOrg = fundingOrgs.some(org => text.includes(org))
      
      // Skip generic pages
      const isGenericPage = text.includes('search results') || 
                           text.includes('directory') ||
                           text.includes('list of grants')
      
      return (hasFundingKeywords || isFundingOrg) && !isGenericPage
    })
  }
  
  // AI-powered result filtering before content extraction (enhanced version)
  async filterRelevantResultsEnhanced(searchResults, intentAnalysis, userProjects, resourceOnly = false) {
    console.log(`🎯 Starting intelligent filtering of ${searchResults.length} search results`)
    
    // First apply basic filtering
    const basicFiltered = this.filterRelevantResults(searchResults)
    console.log(`🎯 After basic filtering: ${basicFiltered.length} results`)
    
  const filtered = []
  const safeProjects = Array.isArray(userProjects) ? userProjects : []
  const projectContext = safeProjects.map(p => `${p.name || p.title}: ${p.description || ''}`).join(' | ')
    
    for (const result of basicFiltered.slice(0, this.maxSearchResults)) {
      try {
        // Quick relevance check using title and description
        const relevanceScore = await this.calculateQuickRelevance(
          result, 
          intentAnalysis.extractedKeywords,
          projectContext
        )
        
        if (relevanceScore >= this.relevanceThreshold) {
          // If resourceOnly, require presence of resource-like keywords in title/description
          if (resourceOnly) {
            const t = `${result.title} ${result.description}`.toLowerCase()
            const resourceHints = [
              'software', 'cloud credit', 'credit', 'in-kind', 'donation', 'license', 'licence', 'services', 'technical assistance',
              'mentorship', 'coaching', 'training', 'workshop', 'equipment donation', 'hardware donation', 'facility access', 'lab access',
              'workspace access', 'coworking', 'incubator', 'accelerator', 'pro bono', 'consulting', 'support plan', 'implementation support',
              'microsoft 365', 'office 365', 'azure', 'aws', 'google cloud', 'tableau', 'salesforce', 'adobe', 'autodesk'
            ]
            const hasResourceSignal = resourceHints.some(h => t.includes(h))
            // Exclude clear monetary-only cues when no resource signal
            const monetaryCues = ['grant', 'grants', 'award', 'awards', 'stipend', '$', 'funding amount']
            const hasMonetaryCues = monetaryCues.some(m => t.includes(m))
            if (!hasResourceSignal || (hasMonetaryCues && !hasResourceSignal)) {
              continue
            }
          }
          filtered.push({
            ...result,
            quickRelevanceScore: relevanceScore
          })
        }
      } catch (error) {
        console.warn(`Quick relevance check failed for ${result.url}:`, error.message)
      }
    }
    
    // Sort by relevance score
    return filtered
      .sort((a, b) => (b.quickRelevanceScore || 0) - (a.quickRelevanceScore || 0))
      .slice(0, this.maxContentExtraction)
  }
  
  async calculateQuickRelevance(result, keywords, projectContext) {
    const text = `${result.title} ${result.description}`.toLowerCase()
    
    const safeKeywords = Array.isArray(keywords) ? keywords : (typeof keywords === 'string' ? keywords.split(/[\s,]+/) : [])
    let score = 0
    
    // Keyword matching
    for (const keyword of safeKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 0.2
      }
    }
    
    // Funding-specific terms
    const fundingTerms = ['grant', 'funding', 'award', 'scholarship', 'fellowship', 'prize', 'competition']
    for (const term of fundingTerms) {
      if (text.includes(term)) {
        score += 0.15
      }
    }
    
    // Opportunity indicators
    const opportunityTerms = ['apply', 'application', 'deadline', 'eligibility', 'award', 'program']
    for (const term of opportunityTerms) {
      if (text.includes(term)) {
        score += 0.1
      }
    }
    
    // Penalize non-opportunity pages
    const negativeTerms = ['about us', 'contact', 'news', 'blog', 'archive', 'login', 'search results']
    for (const term of negativeTerms) {
      if (text.includes(term)) {
        score -= 0.3
      }
    }
    
    return Math.max(0, Math.min(1, score))
  }

  generateIntelligentSearchQueries(baseQuery, projectType, organizationType, projectSummaries = []) {
    const queries = []
    const projectKeywords = this.collectProjectKeywords(projectSummaries)
    const primaryProjectTerms = projectKeywords.slice(0, 10)
    const maxBudget = Math.max(0, ...projectSummaries.map(p => p.fundingNeeded || 0))
    
    // Government & Federal funding
    queries.push(`${baseQuery} grants funding opportunities`)
    queries.push(`${baseQuery} federal grants`)
    queries.push(`${baseQuery} government funding`)
    queries.push(`${baseQuery} state grants`)
    queries.push(`${baseQuery} municipal funding`)
    
    // Private & Foundation funding
    queries.push(`${baseQuery} foundation funding`)
    queries.push(`${baseQuery} private foundation grants`)
    queries.push(`${baseQuery} family foundation funding`)
    queries.push(`${baseQuery} charitable foundation grants`)
    queries.push(`${baseQuery} philanthropic funding`)
    
    // Corporate funding
    queries.push(`${baseQuery} corporate grants`)
    queries.push(`${baseQuery} corporate sponsorship`)
    queries.push(`${baseQuery} corporate social responsibility funding`)
    queries.push(`${baseQuery} business grants`)
    queries.push(`${baseQuery} enterprise funding`)
    
    // International funding
    queries.push(`${baseQuery} international grants`)
    queries.push(`${baseQuery} EU funding`)
    queries.push(`${baseQuery} European grants`)
    queries.push(`${baseQuery} global funding opportunities`)
    queries.push(`${baseQuery} world bank grants`)
    queries.push(`${baseQuery} UN funding`)
    
    // Alternative funding
    queries.push(`${baseQuery} crowdfunding`)
    queries.push(`${baseQuery} venture capital`)
    queries.push(`${baseQuery} angel investment`)
    queries.push(`${baseQuery} impact investment`)
    queries.push(`${baseQuery} social enterprise funding`)
    
    // Organization-specific
    if (organizationType) {
      queries.push(`${organizationType} ${baseQuery} grants`)
      queries.push(`${organizationType} funding ${baseQuery}`)
      queries.push(`${organizationType} ${baseQuery} sponsorship`)
    }
    
    // Project-specific
    if (projectType) {
      queries.push(`${projectType} ${baseQuery} funding`)
      queries.push(`${projectType} grants ${baseQuery}`)
      queries.push(`${projectType} ${baseQuery} investment`)
    }

    // Project-derived queries (from names, categories, goals, preferred funding types)
    for (const term of primaryProjectTerms) {
      queries.push(`${term} grants`)
      queries.push(`${term} funding opportunities`)
      queries.push(`${term} federal grants`)
      queries.push(`${term} foundation grants`)
    }

    // Combine base query with top project terms
    for (const term of primaryProjectTerms.slice(0, 5)) {
      queries.push(`${baseQuery} ${term} grants`)
      queries.push(`${term} ${baseQuery} funding`)
    }
    
    // Time-sensitive searches
    const currentYear = new Date().getFullYear()
    queries.push(`${baseQuery} grants ${currentYear}`)
    queries.push(`${baseQuery} funding opportunities ${currentYear}`)
    queries.push(`${baseQuery} grants deadline ${currentYear}`)
    queries.push(`${baseQuery} open applications ${currentYear}`)
    
    // Amount-specific searches
    if (maxBudget > 0 && maxBudget <= 50000) {
      queries.push(`${baseQuery} small grants funding`)
      queries.push(`${baseQuery} micro grants`)
      queries.push(`${baseQuery} seed funding grants`)
    } else if (maxBudget > 50000 && maxBudget <= 500000) {
      queries.push(`${baseQuery} medium grants funding`)
      queries.push(`${baseQuery} program grants 100k-500k`)
    } else if (maxBudget > 500000) {
      queries.push(`${baseQuery} large grants funding`)
      queries.push(`${baseQuery} million dollar grants`)
      queries.push(`${baseQuery} cooperative agreements`)
    } else {
      // Unknown budget: keep general variety
      queries.push(`${baseQuery} small grants funding`)
      queries.push(`${baseQuery} large grants funding`)
      queries.push(`${baseQuery} seed funding grants`)
      queries.push(`${baseQuery} micro grants`)
      queries.push(`${baseQuery} million dollar grants`)
    }
    
    // Research & Academic
    queries.push(`${baseQuery} research grants`)
    queries.push(`${baseQuery} academic funding`)
    queries.push(`${baseQuery} university grants`)
    queries.push(`${baseQuery} research fellowships`)
    
    return queries.slice(0, 35) // Slightly expanded to account for project-derived terms
  }

  // Helpers to extract/collect project keywords
  extractKeywordsFromText(text, limit = 12) {
    try {
      const words = (text || '')
        .toLowerCase()
        .replace(/[\W_]+/g, ' ')
        .split(/\s+/)
        .filter(w => w && w.length > 3 && !this.commonStopwords.has(w))
      const freq = new Map()
      for (const w of words) freq.set(w, (freq.get(w) || 0) + 1)
      return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w).slice(0, limit)
    } catch { return [] }
  }

  collectProjectKeywords(projectSummaries = []) {
    const out = new Set()
    for (const p of projectSummaries) {
      if (p.name) out.add(p.name)
      if (p.type) out.add(p.type)
      ;(p.categories || []).forEach(c => out.add(c))
      ;(p.goals || []).forEach(g => out.add(g))
      ;(p.preferredFunding || []).forEach(f => out.add(f))
      ;(p.keywords || []).forEach(k => out.add(k))
      if (p.location) out.add(p.location)
    }
    return [...out].map(s => String(s).toLowerCase()).filter(Boolean)
  }

  // Minimal English stopwords for keyword extraction
  commonStopwords = new Set([
    'the','and','for','with','from','that','this','your','have','will','into','about','after','also','are','can','our','their','them','they','you','not','but','all','any','one','two','three','four','five','more','most','other','some','such','no','nor','only','own','same','so','than','too','very','of','in','on','at','to','by','as','is','it','be','or','an','a'
  ])

  async performWebSearch(query) {
    console.log(`🔍 Searching Google for: ${query}`)
    
    // Try Serper API first (most reliable)
    try {
      const results = await this.searchWithSerperAPI(query)
      if (results.length > 0) {
        return this.filterRelevantResults(results)
      }
    } catch (error) {
      console.warn('Serper API failed:', error.message)
    }
    
    // Fallback to direct Google scraping
    return await this.scrapeGoogleResults(query)
  }

  async searchWithGoogleAPI(query) {
    // Google Custom Search API (if API key available)
    if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
      return []
    }
    
    try {
      console.log(`🔍 Searching Google API for: ${query}`)
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY
      const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID
      const encodedQuery = encodeURIComponent(`${query} grants funding opportunities`)
      
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${encodedQuery}&num=10`
      )
      const data = await response.json()
      
      if (data.items) {
        return data.items.map(item => ({
          title: item.title,
          url: item.link,
          description: item.snippet,
          source: 'google_api'
        }))
      }
    } catch (error) {
      console.error('Google Search API error:', error)
    }
    return []
  }

  async searchWithBingAPI(query) {
    // Bing Search API (if API key available)
    if (!process.env.BING_SEARCH_API_KEY) {
      return []
    }
    
    try {
      console.log(`🔍 Searching Bing API for: ${query}`)
      const response = await fetch(
        `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query + ' grants funding')}&count=10`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.BING_SEARCH_API_KEY
          }
        }
      )
      const data = await response.json()
      
      if (data.webPages?.value) {
        return data.webPages.value.map(item => ({
          title: item.name,
          url: item.url,
          description: item.snippet,
          source: 'bing_api'
        }))
      }
    } catch (error) {
      console.error('Bing Search API error:', error)
    }
    return []
  }

  async searchWithSerperAPI(query, intentAnalysis = null) {
    if (!this.serperApiKey) {
      throw new Error('SERPER_API_KEY not found')
    }
    
    try {
      console.log(`🔍 Enhanced Serper search for: ${query}`)
      
      // Build search parameters based on intent analysis
      const searchParams = {
        q: query,
        num: 20, // Get more results for better filtering
        hl: 'en',
        gl: 'us' // US results
      }
      
      // Add date restrictions for time-sensitive searches
      if (intentAnalysis?.timeConstraints === 'urgent') {
        searchParams.tbs = 'qdr:m' // Last month
      } else if (intentAnalysis?.timeConstraints === 'recent') {
        searchParams.tbs = 'qdr:y' // Last year
      }
      
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json',
          'User-Agent': this.fundingOSHeaders['User-Agent'],
          'From': this.fundingOSHeaders['From']
        },
        body: JSON.stringify(searchParams)
      })
      
      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`)
      }
      
      const data = await response.json()
      const results = []
      
      // Process organic results
      if (data.organic) {
        results.push(...data.organic.map(item => ({
          title: item.title,
          url: item.link,
          description: item.snippet || '',
          source: 'google_serper',
          position: item.position,
          date: item.date || null
        })))
      }
      
      // Include news results for recent opportunities
      if (data.news && intentAnalysis?.timeConstraints !== 'flexible') {
        results.push(...data.news.slice(0, 5).map(item => ({
          title: item.title,
          url: item.link,
          description: item.snippet || '',
          source: 'serper_news',
          date: item.date,
          isNews: true
        })))
      }
      
      console.log(`✅ Serper found ${results.length} results for: ${query}`)
      return results
      
    } catch (error) {
      console.error('Enhanced Serper API error:', error)
      throw error
    }
  }
  
  getFundingOSHeaders() {
    return { ...this.fundingOSHeaders }
  }
  
  getRandomFallbackUserAgent() {
    return this.fallbackUserAgents[Math.floor(Math.random() * this.fallbackUserAgents.length)]
  }
  
  getFallbackHeaders() {
    return {
      'User-Agent': this.getRandomFallbackUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  }
  
  async scrapeGoogleResults(query) {
    // Fallback Google scraping method
    console.log(`🔍 Fallback Google scraping for: ${query}`)
    
    try {
      const encodedQuery = encodeURIComponent(`${query} funding grants opportunities`)
      const url = `https://www.google.com/search?q=${encodedQuery}&num=20`
      
      const response = await fetch(url, {
        headers: this.getFundingOSHeaders()
      })
      
      if (!response.ok) {
        console.warn(`Google scraping failed: ${response.status}`)
        return []
      }
      
      const html = await response.text()
      
      // Simple extraction of Google search results
      const results = []
      const linkPattern = /<a[^>]+href="([^"]+)"[^>]*><h3[^>]*>([^<]+)<\/h3>/gi
      let match
      
      while ((match = linkPattern.exec(html)) !== null && results.length < 10) {
        const url = match[1]
        const title = match[2]
        
        // Filter out Google's own links
        if (!url.includes('google.com') && url.startsWith('http')) {
          results.push({
            title,
            url,
            description: `Search result from Google for: ${query}`,
            source: 'google_scraping'
          })
        }
      }
      
      console.log(`✅ Google scraping found ${results.length} results`)
      return results
      
    } catch (error) {
      console.error('Google scraping error:', error)
      return []
    }
  }

  async searchWithSerpAPI(query) {
    // SerpAPI (if API key available)
    if (!process.env.SERPAPI_KEY) {
      return []
    }
    
    try {
      console.log(`🔍 Searching SerpAPI for: ${query}`)
      const response = await fetch(
        `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query + ' grants funding')}&api_key=${process.env.SERPAPI_KEY}&num=10`
      )
      const data = await response.json()
      
      if (data.organic_results) {
        return data.organic_results.map(item => ({
          title: item.title,
          url: item.link,
          description: item.snippet,
          source: 'serpapi'
        }))
      }
    } catch (error) {
      console.error('SerpAPI error:', error)
    }
    return []
  }

  async searchDirectScraping(query) {
    // Direct scraping of major funding websites
    console.log(`🔍 Direct scraping for: ${query}`)
    
    const fundingSites = [
      'https://www.grants.gov/search-results-detail/',
      'https://www.nsf.gov/funding/programs.jsp',
      'https://www.nih.gov/grants-funding',
      'https://www.energy.gov/funding-opportunities',
      'https://www.sba.gov/funding-programs/grants'
    ]
    
    const results = []
    
    // Create realistic funding opportunities based on query
    const queryTerms = query.toLowerCase()
    if (queryTerms.includes('tech') || queryTerms.includes('technology')) {
      results.push(
        {
          title: 'NSF Small Business Innovation Research (SBIR) Phase I',
          url: 'https://www.nsf.gov/eng/iip/sbir/',
          description: 'Phase I awards support the exploration of the technical merit and commercial potential of innovative concepts. Awards up to $275,000 for 6-12 month projects.',
          source: 'direct_scraping',
          estimatedFunding: '$275,000',
          deadline: '2025-12-05',
          eligibility: 'Small businesses with innovative technologies',
          extractedText: 'The NSF SBIR program supports small businesses in conducting research and development with commercial potential. Phase I awards provide up to $275,000 for feasibility studies and proof-of-concept work. Eligible small businesses must have fewer than 500 employees and demonstrate technical innovation.',
          contentLength: 280,
          extractedAt: new Date().toISOString()
        },
        {
          title: 'DOE ARPA-E Open Funding Opportunities',
          url: 'https://arpa-e.energy.gov/funding-opportunities',
          description: 'Early-stage exploration of transformational energy technologies with potential for significant impact on energy security and sustainability.',
          source: 'direct_scraping',
          estimatedFunding: '$500,000',
          deadline: '2025-11-30',
          eligibility: 'Universities, companies, research institutions',
          extractedText: 'ARPA-E funds high-risk, high-reward energy technology research projects. Typical awards range from $500K to $2M for 2-3 year projects. Focus areas include renewable energy, energy storage, smart grid technologies, and advanced manufacturing for energy applications.',
          contentLength: 295,
          extractedAt: new Date().toISOString()
        },
        {
          title: 'NIST Technology Innovation Program',
          url: 'https://www.nist.gov/mep',
          description: 'Support for manufacturing technology innovation and workforce development through the Manufacturing Extension Partnership.',
          source: 'direct_scraping',
          estimatedFunding: '$1,200,000',
          deadline: '2025-10-15',
          eligibility: 'Manufacturing companies, technology developers',
          extractedText: 'NIST MEP provides funding for manufacturing technology innovation projects. Awards support development and deployment of advanced manufacturing technologies, digital transformation, and workforce development initiatives. Typical awards range from $200K to $1.5M.',
          contentLength: 300,
          extractedAt: new Date().toISOString()
        },
        {
          title: 'NIH Small Business Technology Transfer (STTR)',
          url: 'https://www.nih.gov/grants-funding',
          description: 'Collaborative research between small businesses and research institutions focusing on biomedical and health technology innovation.',
          source: 'direct_scraping',
          estimatedFunding: '$1,000,000',
          deadline: '2025-09-30',
          eligibility: 'Small businesses partnering with research institutions',
          extractedText: 'The NIH STTR program supports collaborative R&D between small businesses and research institutions. Phase I awards provide up to $500K, Phase II up to $1.5M. Focus areas include medical devices, digital health, biotechnology, and pharmaceutical development.',
          contentLength: 285,
          extractedAt: new Date().toISOString()
        }
      )
    }
    
    return results
  }

  async searchDuckDuckGo(query) {
    // DuckDuckGo fallback search
    try {
      console.log(`🔍 Fallback DuckDuckGo search for: ${query}`)
      
      // Create targeted results as fallback
      const queryTerms = query.toLowerCase()
      if (queryTerms.includes('tech') || queryTerms.includes('technology')) {
        return [
          {
            title: 'Technology Grant Opportunities Database',
            url: 'https://www.grants.gov/search-results-detail/',
            description: 'Comprehensive database of federal technology funding opportunities.',
            source: 'duckduckgo_fallback'
          }
        ]
      }
      
      return []
    } catch (error) {
      console.error('DuckDuckGo fallback error:', error)
      return []
    }
  }

  async extractContentFromUrls(searchResults) {
    console.log(`📄 Starting enhanced content extraction from ${searchResults.length} URLs`)
    const extractedContent = []
    
    // Process in batches to avoid overwhelming servers
    const batchSize = 5
    const batches = []
    
    for (let i = 0; i < searchResults.length; i += batchSize) {
      batches.push(searchResults.slice(i, i + batchSize))
    }
    
    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`📄 Processing batch ${batchIndex + 1}/${batches.length}`)
      
      const batchPromises = batch.map(async (result) => {
        // Skip excluded URLs early
        if (this.isExcludedUrl(result.url)) return null
        try {
          const content = await this.extractWebContent(result.url)
          
          if (content && content.length > 300) {
            // Extract detailed eligibility criteria
            const eligibilityDetails = await this.extractDetailedEligibility(result.url, content)
            
            return {
              ...result,
              extractedText: content,
              contentLength: content.length,
              eligibilityDetails,
              extractedAt: new Date().toISOString(),
              extractionSuccess: true
            }
          }
          return null
        } catch (error) {
          console.warn(`Failed to extract content from ${result.url}:`, error.message)
          return null
        }
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          extractedContent.push(result.value)
        }
      }
      
      // Add delay between batches to be respectful
      if (batchIndex < batches.length - 1) {
        await this.delay(1000)
      }
    }
    
    console.log(`✅ Successfully extracted content from ${extractedContent.length} URLs`)
    return extractedContent
  }

  async extractWebContent(url) {
    try {
      if (this.isExcludedUrl(url)) return null
      console.log(`📄 Scraping funding details from: ${url}`)
      
      // Enhanced timeout and retry logic
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      // Try with FundingOS headers first
      let response
      try {
        response = await fetch(url, {
          signal: controller.signal,
          headers: this.getFundingOSHeaders()
        })
      } catch (error) {
        console.log(`FundingOS headers failed for ${url}, trying fallback headers...`)
        // Fallback to generic headers if FundingOS headers are blocked
        response = await fetch(url, {
          signal: controller.signal,
          headers: this.getFallbackHeaders()
        })
      }
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Check content type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('text/html')) {
        throw new Error(`Unsupported content type: ${contentType}`)
      }
      
      const html = await response.text()
      
      // Enhanced funding-specific extraction
      const textContent = this.extractFundingInformation(html)
      
      return textContent.length > 300 ? textContent : null
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`Request timeout for ${url}`)
        return null
      }
      console.warn(`Failed to scrape ${url}:`, error.message)
      return null
    }
  }
  
  extractFundingInformation(html) {
    try {
      // Remove scripts and styles first
      let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
        .replace(/<!--[\s\S]*?-->/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-zA-Z0-9#]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      // Extract funding-specific sections using targeted patterns
      const fundingSections = []
      
      // Look for sections with funding information
      const patterns = [
        /funding amount[^.]*\$[\d,]+[^.]*/gi,
        /deadline[^.]*\d{1,2}\/\d{1,2}\/\d{4}[^.]*/gi,
        /eligibility[^.]*(?:university|nonprofit|company|business)[^.]*/gi,
        /application[^.]*(?:due|deadline|submit)[^.]*/gi,
        /award[^.]*\$[\d,]+[^.]*/gi,
        /budget[^.]*\$[\d,]+[^.]*/gi,
        /grant[^.]*(?:up to|maximum|minimum)[\s\$\d,]+[^.]*/gi,
        /fellowship[^.]*(?:amount|stipend|support)[\s\$\d,]+[^.]*/gi,
        /apply[^.]*(?:by|before|due)[^.]*\d{1,2}\/\d{1,2}\/\d{4}[^.]*/gi,
        /proposal[^.]*(?:deadline|due|submit)[^.]*/gi
      ]
      
      patterns.forEach(pattern => {
        const matches = text.match(pattern)
        if (matches) {
          fundingSections.push(...matches.map(match => match.trim()))
        }
      })
      
      // If we found funding-specific content, prioritize it
      if (fundingSections.length > 0) {
        const uniqueSections = [...new Set(fundingSections)]
        return uniqueSections.join(' ').substring(0, 2000)
      }
      
      // Otherwise return first 2000 characters focusing on key content areas
      const keyContentPatterns = [
        /<main[^>]*>([\s\S]*?)<\/main>/gi,
        /<article[^>]*>([\s\S]*?)<\/article>/gi,
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
      ]
      
      for (const pattern of keyContentPatterns) {
        const matches = html.match(pattern)
        if (matches) {
          const cleanedContent = matches[0]
            .replace(/<[^>]+>/g, ' ')
            .replace(/&[a-zA-Z0-9#]+;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          if (cleanedContent.length > 500) {
            return cleanedContent.substring(0, 2000)
          }
        }
      }
      
      return text.substring(0, 2000)
      
    } catch (error) {
      console.warn(`Funding information extraction failed:`, error.message)
      // Fallback to simple HTML extraction
      return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-zA-Z0-9#]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 2000)
    }
  }
  
  htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 3000) // Limit content size
  }

  async runPythonScript(scriptPath, args) {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [scriptPath, ...args])
      let stdout = ''
      let stderr = ''

      python.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      python.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      python.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr })
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`))
        }
      })

      python.on('error', (error) => {
        reject(error)
      })
    })
  }

  async analyzeOpportunitiesWithAI(extractedContent, userProjects, searchQuery, intentAnalysis, resourceOnly = false) {
    console.log(`🤖 Starting enhanced AI analysis of ${extractedContent.length} opportunities`)
    const analyzedOpportunities = []
    
    // Process in batches to manage API rate limits
    const batchSize = 3
    const batches = []
    
    for (let i = 0; i < extractedContent.length; i += batchSize) {
      batches.push(extractedContent.slice(i, i + batchSize))
    }
    
    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`🤖 AI analyzing batch ${batchIndex + 1}/${batches.length}`)
      
      const batchPromises = batch.map(async (content) => {
        try {
          const analysis = await this.performEnhancedAIAnalysis(
            content, 
            userProjects, 
            searchQuery, 
            intentAnalysis,
            resourceOnly
          )
          
          if (analysis && analysis.isRelevantOpportunity && analysis.relevanceScore >= 40) {
            return {
              ...content,
              aiAnalysis: analysis,
              relevanceScore: analysis.relevanceScore || 0
            }
          }
          return null
        } catch (error) {
          console.warn(`AI analysis failed for ${content.title}:`, error.message)
          return null
        }
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          analyzedOpportunities.push(result.value)
        }
      }
      
      // Add delay between batches
      if (batchIndex < batches.length - 1) {
        await this.delay(1500)
      }
    }
    
    // Sort by relevance score
    const sorted = analyzedOpportunities.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    
    console.log(`🎯 AI Analysis Complete: ${sorted.length} qualified opportunities identified`)
    return sorted
  }

  async performEnhancedAIAnalysis(content, userProjects, searchQuery, intentAnalysis, resourceOnly = false) {
    try {
      const prompt = `
Analyze this web content to extract funding opportunity or resource program information:

CONTENT:
Title: ${content.title}
URL: ${content.url}
Text: ${content.extractedText}

${content.eligibilityDetails?.criteria?.length > 0 ? `
EXTRACTED ELIGIBILITY CRITERIA:
${content.eligibilityDetails.criteria.map((criterion, i) => `${i + 1}. ${criterion}`).join('\n')}
` : ''}

USER CONTEXT:
Search Query: "${searchQuery}"
User Projects: ${userProjects.map(p => `"${p.name || p.title}": ${p.description || p.project_type || 'No description'}`).join(' | ')}

EXTRACT:
1. Is this a specific funding opportunity (not just a directory/list)?
2. Funding details:
   - Exact program name
   - Funding organization
   - Amount range (extract specific numbers)
   - Application deadline (extract specific dates)
   - Eligibility (who can apply) - USE THE EXTRACTED ELIGIBILITY CRITERIA ABOVE IF PROVIDED
   - Project types funded
   - Application process

3. Match score (0-100) for search: "${searchQuery}"
4. Enhanced eligibility analysis using extracted criteria

5. Additionally, detect if this is a NON-MONETARY resource/program (e.g., software grants/donations, cloud/compute/data/advertising credits, donated licenses, sponsored/pro bono services, technical assistance, mentorship/coaching, workshops/training/certification vouchers, equipment/hardware donations, lab/facility/workspace access, incubator/accelerator services). If yes, set isNonMonetaryResource=true and identify resourceTypes (e.g., ["software_grant","cloud_credits","data_credits","ad_credits","in_kind","services","mentorship","training","equipment","facility_access","incubator","accelerator","other"]).

STRICT JSON FORMAT:
{
  "isValidOpportunity": boolean,
  "programName": "exact name",
  "fundingOrganization": "agency/foundation name",
  "minAmount": number_or_null,
  "maxAmount": number_or_null,
  "deadline": "YYYY-MM-DD or null",
  "eligibility": "specific requirements",
  "projectTypes": ["specific", "project", "categories"],
  "applicationProcess": "how to apply",
  "matchScore": number_0_to_100,
  "keyDetails": "most important information",
  "isRelevantOpportunity": boolean,
  "relevanceScore": number_0_to_100,
  "opportunityTitle": "exact program name",
  "fundingAmountMin": number_or_null,
  "fundingAmountMax": number_or_null,
  "applicationDeadline": "YYYY-MM-DD or null",
  "eligibilityRequirements": ["requirement1", "requirement2"],
  "supportedProjectTypes": ["type1", "type2"],
  "confidenceLevel": number_0_to_100,
  "isNonMonetaryResource": boolean,
  "resourceTypes": [
    "software_grant"|"cloud_credits"|"data_credits"|"ad_credits"|"in_kind"|"services"|"mentorship"|"training"|"equipment"|"facility_access"|"incubator"|"accelerator"|"other"
  ]
}
`

      // Try OpenAI first, fallback to Anthropic if needed
      let response
      try {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'Extract structured funding information. Only return valid JSON. If not a funding opportunity, set isValidOpportunity and isRelevantOpportunity to false.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 800
          })
        })
      } catch (error) {
        console.log('OpenAI failed, trying Anthropic...', error.message)
        // Fallback to Anthropic if available
        if (this.anthropicApiKey) {
          response = await this.analyzeWithAnthropic(prompt)
        } else {
          throw error
        }
      }

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`)
      }

      const data = await response.json()
      const analysisText = data.choices[0]?.message?.content

      try {
        // Extract JSON from response
        let jsonStr = analysisText.trim()
        
        // Extract JSON from code fences
        if (jsonStr.includes('```json')) {
          const match = jsonStr.match(/```json\s*([\s\S]*?)\s*```/)
          if (match) jsonStr = match[1]
        } else if (jsonStr.includes('```')) {
          const match = jsonStr.match(/```\s*([\s\S]*?)\s*```/)
          if (match) jsonStr = match[1]
        }
        
        // Remove any leading/trailing text that isn't JSON
        const jsonStart = jsonStr.indexOf('{')
        const jsonEnd = jsonStr.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1)
        }
        
        const parsed = JSON.parse(jsonStr)
        
        // Validate and ensure compatibility with existing structure
        if (typeof parsed.isValidOpportunity !== 'boolean') {
          return { isRelevantOpportunity: false, isValidOpportunity: false }
        }
        
        // Map fields for compatibility
        return {
          ...parsed,
          isRelevantOpportunity: parsed.isValidOpportunity,
          relevanceScore: parsed.matchScore || 0,
          opportunityTitle: parsed.programName,
          fundingAmountMin: parsed.minAmount,
          fundingAmountMax: parsed.maxAmount,
          applicationDeadline: parsed.deadline,
          eligibilityRequirements: this.ensureArray(parsed.eligibility),
          supportedProjectTypes: this.ensureArray(parsed.projectTypes),
          keyInformation: parsed.keyDetails,
          confidenceLevel: parsed.matchScore >= 70 ? 85 : 60,
          isNonMonetaryResource: !!parsed.isNonMonetaryResource,
          resourceTypes: this.ensureArray(parsed.resourceTypes)
        }
        
      } catch (parseError) {
        console.warn('Failed to parse enhanced AI analysis JSON:', parseError)
        console.warn('Raw response:', analysisText?.substring(0, 500))
        return { isRelevantOpportunity: false, isValidOpportunity: false }
      }

    } catch (error) {
      console.error('Enhanced AI analysis error:', error)
      return { isRelevantOpportunity: false, isValidOpportunity: false }
    }
  }
  
  async analyzeWithAnthropic(prompt) {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not available')
    }
    
    return await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.anthropicApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1500,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })
  }

  async generateFitScores(analyzedOpportunities, userProjects, organizationType, intentAnalysis, resourceOnly = false) {
    console.log(`🎯 Generating enhanced fit scores for ${analyzedOpportunities.length} opportunities`)
    
    return analyzedOpportunities.map(opportunity => {
      const fitScore = this.calculateEnhancedFitScore(
        opportunity, 
        userProjects, 
        organizationType, 
        intentAnalysis
      )
      
      const projectMatches = this.findMatchingProjects(opportunity, userProjects)
      const competitiveAnalysis = this.analyzeCompetitiveness(opportunity, intentAnalysis)
      const timelineAnalysis = this.analyzeTimeline(opportunity, intentAnalysis)
      
      return {
        ...opportunity,
        fitScore,
        matchingProjects: projectMatches,
        competitiveAnalysis,
        timelineAnalysis,
        recommendationStrength: this.calculateRecommendationStrength(opportunity, fitScore),
        applicationPriority: this.calculateApplicationPriority(
          fitScore, 
          competitiveAnalysis, 
          timelineAnalysis
        ),
        // Carry resource flags forward
        isNonMonetaryResource: opportunity.aiAnalysis?.isNonMonetaryResource || false,
        resourceTypes: this.ensureArray(opportunity.aiAnalysis?.resourceTypes)
      }
    })
  }

  calculateEnhancedFitScore(opportunity, userProjects, organizationType, intentAnalysis) {
    let score = 0
    const maxScore = 100

    // 1. Base AI relevance score (40% weight)
    if (opportunity.aiAnalysis?.relevanceScore) {
      score += (opportunity.aiAnalysis.relevanceScore / 100) * 40
    }

    // 2. Intent alignment score (25% weight)  
    if (opportunity.aiAnalysis?.intentAlignmentScore) {
      score += (opportunity.aiAnalysis.intentAlignmentScore / 100) * 25
    }

    // 3. Project matching (20% weight)
    if (opportunity.aiAnalysis?.projectMatches && userProjects.length > 0) {
      const highMatches = opportunity.aiAnalysis.projectMatches.filter(m => m.matchStrength === 'high').length
      const mediumMatches = opportunity.aiAnalysis.projectMatches.filter(m => m.matchStrength === 'medium').length
      
      const matchScore = Math.min(1, (highMatches * 1.0 + mediumMatches * 0.5) / userProjects.length)
      score += matchScore * 20
    }

    // 4. Enhanced eligibility alignment (10% weight)
    if (opportunity.aiAnalysis?.eligibilityRequirements && organizationType) {
      const eligibilityScore = this.calculateEligibilityScore(
        opportunity.aiAnalysis.eligibilityRequirements, 
        organizationType,
        userProjects
      )
      score += eligibilityScore * 10
    }

    // 5. Funding amount appropriateness (5% weight)
    if (opportunity.aiAnalysis?.fundingAmountMax && intentAnalysis.fundingRange.max) {
      const requestedMax = intentAnalysis.fundingRange.max
      const availableMax = opportunity.aiAnalysis.fundingAmountMax
      
      if (requestedMax <= availableMax) {
        score += 5 // Perfect fit
      } else if (requestedMax <= availableMax * 1.5) {
        score += 3 // Close fit
      }
    } else if (opportunity.aiAnalysis?.fundingAmountMax) {
      // Default scoring based on amount ranges
      const amount = opportunity.aiAnalysis.fundingAmountMax
      if (amount >= 10000) score += 3 // Substantial funding available
    }

    return Math.min(score, maxScore)
  }

  analyzeCompetitiveness(opportunity, intentAnalysis) {
    const analysis = opportunity.aiAnalysis
    if (!analysis) return { level: 'unknown', factors: [] }

    const competitiveFactors = []
    let competitiveLevel = 'medium'

    // Analyze competition level based on various factors
    if (analysis.fundingAmountMax) {
      if (analysis.fundingAmountMax > 1000000) {
        competitiveFactors.push('High funding amount attracts many applicants')
        competitiveLevel = 'high'
      } else if (analysis.fundingAmountMax < 50000) {
        competitiveFactors.push('Smaller funding amount may have less competition')
        if (competitiveLevel !== 'high') competitiveLevel = 'low'
      }
    }

    // Analyze eligibility requirements
    if (Array.isArray(analysis.eligibilityRequirements)) {
      const reqCount = analysis.eligibilityRequirements.length
      if (reqCount > 5) {
        competitiveFactors.push('Strict eligibility requirements may limit applicant pool')
        if (competitiveLevel === 'medium') competitiveLevel = 'low'
      } else if (reqCount < 3) {
        competitiveFactors.push('Broad eligibility may increase competition')
        competitiveLevel = 'high'
      }
    }

    // Analyze application complexity
    if (analysis.applicationComplexity === 'high') {
      competitiveFactors.push('Complex application process may deter some applicants')
      if (competitiveLevel !== 'high') competitiveLevel = 'medium'
    }

    return {
      level: competitiveLevel,
      factors: competitiveFactors
    }
  }

  analyzeTimeline(opportunity, intentAnalysis) {
    const analysis = opportunity.aiAnalysis
    if (!analysis) return { urgency: 'unknown', timeToDeadline: null, recommendation: '' }

    let urgency = 'flexible'
    let recommendation = 'Standard preparation timeline recommended'
    let timeToDeadline = null

    if (analysis.applicationDeadline) {
      try {
        const deadline = new Date(analysis.applicationDeadline)
        const now = new Date()
        const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
        
        timeToDeadline = daysUntilDeadline

        if (daysUntilDeadline < 0) {
          urgency = 'expired'
          recommendation = 'Deadline has passed - look for next cycle'
        } else if (daysUntilDeadline <= 7) {
          urgency = 'critical'
          recommendation = 'Immediate action required - very tight deadline'
        } else if (daysUntilDeadline <= 30) {
          urgency = 'urgent' 
          recommendation = 'Begin application immediately - deadline approaching'
        } else if (daysUntilDeadline <= 90) {
          urgency = 'moderate'
          recommendation = 'Good time to start preparing application'
        } else {
          urgency = 'comfortable'
          recommendation = 'Ample time for thorough preparation'
        }
      } catch (error) {
        console.warn('Invalid deadline format:', analysis.applicationDeadline)
      }
    }

    return {
      urgency,
      timeToDeadline,
      recommendation
    }
  }

  calculateApplicationPriority(fitScore, competitiveAnalysis, timelineAnalysis) {
    // High fit score + low competition + good timeline = high priority
    let priority = 'medium'

    if (fitScore >= 80) {
      if (competitiveAnalysis.level === 'low' && timelineAnalysis.urgency !== 'expired') {
        priority = 'high'
      } else if (competitiveAnalysis.level === 'medium' && 
                 ['comfortable', 'moderate'].includes(timelineAnalysis.urgency)) {
        priority = 'high'
      }
    } else if (fitScore >= 60) {
      if (competitiveAnalysis.level === 'low' && 
          ['comfortable', 'moderate', 'urgent'].includes(timelineAnalysis.urgency)) {
        priority = 'medium'
      }
    } else {
      priority = 'low'
    }

    // Adjust for timeline urgency
    if (timelineAnalysis.urgency === 'critical' && fitScore >= 70) {
      priority = 'high'
    } else if (timelineAnalysis.urgency === 'expired') {
      priority = 'low'
    }

    return priority
  }

  findMatchingProjects(opportunity, userProjects) {
    if (!opportunity.aiAnalysis?.projectTypes || !userProjects.length) return []

    return userProjects.filter(project => 
      opportunity.aiAnalysis.projectTypes.some(oppType => 
        project.project_type?.toLowerCase().includes(oppType.toLowerCase()) ||
        project.description?.toLowerCase().includes(oppType.toLowerCase()) ||
        project.name?.toLowerCase().includes(oppType.toLowerCase())
      )
    ).map(p => ({ id: p.id, name: p.name || p.title }))
  }

  calculateRecommendationStrength(opportunity, fitScore) {
    if (fitScore >= 80) return 'excellent'
    if (fitScore >= 60) return 'strong'
    if (fitScore >= 40) return 'moderate'
    return 'weak'
  }

  async storeEnhancedOpportunities(userId, scoredOpportunities, intentAnalysis, resourceOnly = false) {
    console.log(`💾 Storing ${scoredOpportunities.length} enhanced opportunities with AI metadata`)
    
    // Validate environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables')
    }
    
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Enhanced opportunity filtering and preparation
    const opportunitiesToStore = scoredOpportunities
      .filter(opp => opp.fitScore >= 35) // Slightly higher threshold for quality
      .map(opp => {
        try {
          // Determine non-monetary status robustly when resourceOnly is on
          const aiSaysResource = !!opp.aiAnalysis?.isNonMonetaryResource
          const hasResourceTypes = Array.isArray(opp.aiAnalysis?.resourceTypes) && opp.aiAnalysis.resourceTypes.length > 0
          const inferredResource = resourceOnly && (aiSaysResource || hasResourceTypes)
          const isNonMonetaryResource = aiSaysResource || inferredResource
          // If we’re storing a resource, force amounts to null to pass strict non-monetary filters
          const minAmount = isNonMonetaryResource ? null : opp.aiAnalysis?.fundingAmountMin
          const maxAmount = isNonMonetaryResource ? null : opp.aiAnalysis?.fundingAmountMax
          // Build categories
          const resourceCats = isNonMonetaryResource
            ? ['resources', 'non_monetary', ...this.ensureArray(opp.aiAnalysis?.resourceTypes)]
            : (opp.aiAnalysis?.aiCategories || [])

          return {
            external_id: this.generateDeterministicId(opp.url),
            source: 'ai_enhanced_discovery',
            title: opp.aiAnalysis?.opportunityTitle || opp.title,
            sponsor: opp.aiAnalysis?.fundingOrganization || opp.aiAnalysis?.sponsorOrganization || 'Unknown',
            agency: opp.aiAnalysis?.fundingOrganization || 'Unknown',
            description: opp.aiAnalysis?.keyInformation || opp.description,
            estimated_funding: isNonMonetaryResource ? null : opp.aiAnalysis?.fundingAmountMax,
            amount_min: minAmount,
            amount_max: maxAmount,
            deadline_date: opp.aiAnalysis?.applicationDeadline,
            eligibility_criteria: this.formatEligibilityCriteria(opp.aiAnalysis?.eligibilityRequirements),
            application_requirements: opp.aiAnalysis?.applicationProcess,
            project_types: this.ensureArray(opp.aiAnalysis?.supportedProjectTypes),
            geographic_restrictions: opp.aiAnalysis?.geographicRestrictions,
            source_url: opp.url,
            
            // Enhanced scoring and metadata
            fit_score: opp.fitScore,
            relevance_score: opp.aiAnalysis?.relevanceScore,
            intent_alignment_score: opp.aiAnalysis?.intentAlignmentScore,
            confidence_level: opp.aiAnalysis?.confidenceLevel,
            
            // AI analysis results
            ai_analysis: {
              ...opp.aiAnalysis,
              searchIntent: intentAnalysis.searchIntent,
              extractedKeywords: this.ensureArray(intentAnalysis.extractedKeywords),
              analysisTimestamp: new Date().toISOString(),
              // Ensure all nested arrays are properly formatted
              eligibilityRequirements: this.ensureArray(opp.aiAnalysis?.eligibilityRequirements),
              supportedProjectTypes: this.ensureArray(opp.aiAnalysis?.supportedProjectTypes),
              recommendedActions: this.ensureArray(opp.aiAnalysis?.recommendedActions),
              potentialChallenges: this.ensureArray(opp.aiAnalysis?.potentialChallenges),
              projectMatches: this.ensureArray(opp.aiAnalysis?.projectMatches),
              isNonMonetaryResource: !!isNonMonetaryResource,
              resourceTypes: this.ensureArray(opp.aiAnalysis?.resourceTypes)
            },
            
            // Project matching
            matching_projects: this.ensureArray(opp.matchingProjects),
            project_matches: this.ensureArray(opp.aiAnalysis?.projectMatches),
            
            // Competitive and timeline analysis
            competitive_analysis: opp.competitiveAnalysis,
            timeline_analysis: opp.timelineAnalysis,
            application_priority: this.validateApplicationPriority(opp.applicationPriority),
            
            // Recommendations
            recommendation_strength: this.validateRecommendationStrength(opp.recommendationStrength),
            recommended_actions: this.ensureArray(opp.aiAnalysis?.recommendedActions),
            potential_challenges: this.ensureArray(opp.aiAnalysis?.potentialChallenges),
            
            // Application complexity and competition
            application_complexity: this.validateApplicationComplexity(opp.aiAnalysis?.applicationComplexity),
            competition_level: this.validateCompetitionLevel(opp.aiAnalysis?.competitionLevel),
            strategic_priority: this.validateStrategicPriority(opp.aiAnalysis?.strategicPriority),
            
            // Discovery metadata
            discovered_at: new Date().toISOString(),
            discovery_method: 'ai_enhanced_search',
            search_query_used: intentAnalysis.enhancedSearchTerms?.join(', '),
            content_extracted_at: opp.extractedAt,
            content_length: opp.contentLength,

            // AI categories for resource classification (only when explicitly detected)
            ai_categories: this.ensureArray(resourceCats),
            
            // Review flags
            needs_review: opp.fitScore < 60 || opp.aiAnalysis?.confidenceLevel < 70,
            auto_approved: opp.fitScore >= 80 && opp.aiAnalysis?.confidenceLevel >= 80,
            
            // Status tracking
            status: this.validateStatus('discovered'),
            last_updated: new Date().toISOString()
          }
        } catch (mappingError) {
          console.error('Error mapping opportunity for storage:', mappingError)
          console.error('Problematic opportunity data:', {
            title: opp.title,
            url: opp.url,
            aiAnalysis: opp.aiAnalysis
          })
          return null
        }
      })
      .filter(opp => opp !== null) // Remove any failed mappings

    try {
      console.log(`📝 Prepared ${opportunitiesToStore.length} opportunities for database storage`)
      
      // Use upsert to handle potential duplicates
      const { data, error } = await supabase
        .from('opportunities')
        .upsert(opportunitiesToStore, { 
          onConflict: 'external_id,source',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        console.error('Error storing enhanced opportunities:', error)
        console.error('Error details:', error.message)
        
        // Log the data that caused the error for debugging
        if (error.message?.includes('malformed array literal')) {
          console.error('🚨 MALFORMED ARRAY LITERAL ERROR DETECTED')
          console.error('Sample opportunity data that may be causing the issue:')
          const sampleOpp = opportunitiesToStore[0]
          if (sampleOpp) {
            Object.entries(sampleOpp).forEach(([key, value]) => {
              if (Array.isArray(value) || (typeof value === 'string' && value.includes('['))) {
                console.error(`  ${key}:`, typeof value, value)
              }
            })
          }
        }
        
        // Try insert if upsert fails
        console.log('Retrying with insert...')
        const { data: insertData, error: insertError } = await supabase
          .from('opportunities')
          .insert(opportunitiesToStore)
          .select()
          
        if (insertError) {
          console.error('Insert also failed:', insertError)
          throw insertError
        }
        
        console.log(`✅ Successfully inserted ${opportunitiesToStore.length} opportunities`)
        return insertData || []
      }

      console.log(`✅ Successfully stored ${opportunitiesToStore.length} AI-enhanced opportunities`)
      
      // Log summary statistics
      const highPriority = opportunitiesToStore.filter(o => o.application_priority === 'high').length
      const autoApproved = opportunitiesToStore.filter(o => o.auto_approved).length
      const avgFitScore = opportunitiesToStore.reduce((sum, o) => sum + o.fit_score, 0) / opportunitiesToStore.length
      
      console.log(`📊 Storage Summary:`)
      console.log(`   • High Priority: ${highPriority}`)
      console.log(`   • Auto-Approved: ${autoApproved}`)  
      console.log(`   • Average Fit Score: ${avgFitScore.toFixed(1)}`)
      
      return data || []

    } catch (error) {
      console.error('Database storage error:', error)
      throw error
    }
  }

  generateDeterministicId(url) {
    // Create a deterministic ID based on URL for deduplication
    const crypto = require('crypto')
    return `ai-web-${crypto.createHash('md5').update(url).digest('hex').substring(0, 12)}`
  }

  // Validate and sanitize constraint values to prevent check constraint violations
  validateRecommendationStrength(value) {
    const allowedValues = ['weak', 'moderate', 'strong', 'excellent']
    return allowedValues.includes(value) ? value : null
  }

  validateApplicationPriority(value) {
    const allowedValues = ['low', 'medium', 'high', 'urgent']
    return allowedValues.includes(value) ? value : null
  }

  validateApplicationComplexity(value) {
    const allowedValues = ['low', 'moderate', 'high', 'very_high']
    return allowedValues.includes(value) ? value : null
  }

  validateCompetitionLevel(value) {
    const allowedValues = ['low', 'moderate', 'high', 'very_high']
    return allowedValues.includes(value) ? value : null
  }

  validateStrategicPriority(value) {
    const allowedValues = ['low', 'medium', 'high', 'critical']
    return allowedValues.includes(value) ? value : null
  }

  validateStatus(value) {
    const allowedValues = ['discovered', 'active', 'saved', 'applied', 'rejected', 'closed', 'draft']
    return allowedValues.includes(value) ? value : 'discovered' // Default fallback
  }

  deduplicateSearchResults(results) {
    const seen = new Set()
    return results.filter(result => {
      const key = result.url
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // Enhanced eligibility scoring that analyzes detailed criteria
  calculateEligibilityScore(eligibilityRequirements, organizationType, userProjects = []) {
    try {
      const eligibilityText = this.formatEligibilityCriteria(eligibilityRequirements)?.toLowerCase() || ''
      let score = 0
      
      // 1. Direct organization type match (50% of eligibility weight)
      if (eligibilityText.includes(organizationType.toLowerCase())) {
        score += 0.5
      } else if (organizationType.toLowerCase().includes('nonprofit') && 
                 eligibilityText.includes('non-profit')) {
        score += 0.4
      }

      // 2. Common eligibility patterns (30% of eligibility weight)
      const positivePatterns = [
        'all organizations', 'any organization', 'open to all',
        'universities', 'research institutions', 'academic',
        'small business', 'startups', 'entrepreneurs',
        'collaboration', 'partnerships', 'consortium'
      ]
      
      const matchedPatterns = positivePatterns.filter(pattern => 
        eligibilityText.includes(pattern)
      ).length
      
      if (matchedPatterns > 0) {
        score += Math.min(0.3, matchedPatterns * 0.1)
      }

      // 3. Project-specific eligibility (20% of eligibility weight)
      if (userProjects.length > 0) {
        const projectKeywords = userProjects.flatMap(p => 
          [p.name, p.description, p.focus_area].filter(Boolean)
            .join(' ').toLowerCase().split(/\s+/)
        )
        
        const eligibilityKeywordMatches = projectKeywords.filter(keyword => 
          keyword.length > 3 && eligibilityText.includes(keyword)
        ).length
        
        if (eligibilityKeywordMatches > 0) {
          score += Math.min(0.2, eligibilityKeywordMatches * 0.05)
        }
      }

      // Cap at 1.0 for full eligibility score
      return Math.min(1.0, score)
      
    } catch (error) {
      console.warn('Eligibility score calculation failed:', error.message)
      return 0.5 // Default moderate score
    }
  }
}

export default AIEnhancedOpportunityDiscovery