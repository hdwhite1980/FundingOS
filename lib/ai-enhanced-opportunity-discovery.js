// lib/ai-enhanced-opportunity-discovery.js
// AI-Enhanced Opportunity Discovery System

import { spawn } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export class AIEnhancedOpportunityDiscovery {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY
  }

  async discoverAndAnalyzeOpportunities(searchParams) {
    const {
      userId,
      searchQuery,
      projectType,
      organizationType,
      userProjects = [],
      searchDepth = 'comprehensive'
    } = searchParams

    console.log(`🔍 Starting AI-enhanced opportunity discovery for: "${searchQuery}"`)

    try {
      // Step 1: Perform intelligent web searches
      const searchResults = await this.performIntelligentWebSearch(searchQuery, projectType, organizationType)
      
      // Step 2: Extract content from promising URLs using web scraping
      const extractedContent = await this.extractContentFromUrls(searchResults)
      
      // Step 3: AI analysis and filtering
      const analyzedOpportunities = await this.analyzeOpportunitiesWithAI(extractedContent, userProjects, searchQuery)
      
      // Step 4: Generate fit scores and recommendations
      const scoredOpportunities = await this.generateFitScores(analyzedOpportunities, userProjects, organizationType)
      
      // Step 5: Store in database with AI-generated metadata
      const storedOpportunities = await this.storeEnhancedOpportunities(userId, scoredOpportunities)

      console.log(`✅ Discovery complete: Found ${storedOpportunities.length} high-quality opportunities`)

      return {
        success: true,
        opportunitiesFound: storedOpportunities.length,
        opportunities: storedOpportunities,
        searchQuery,
        analysisComplete: true,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      console.error('Error in AI-enhanced opportunity discovery:', error)
      throw error
    }
  }

  async performIntelligentWebSearch(searchQuery, projectType, organizationType) {
    // Enhanced search queries with AI-generated variations
    const baseQueries = this.generateIntelligentSearchQueries(searchQuery, projectType, organizationType)
    
    // Target high-value funding websites
    const targetSites = [
      'grants.gov',
      'foundation.org',
      'guidestar.org',
      'candid.org',
      'grantspace.org',
      'nsf.gov',
      'nih.gov',
      'energy.gov',
      'neh.gov',
      'arts.gov',
      'usda.gov',
      'sba.gov'
    ]

    const searchResults = []

    for (const query of baseQueries) {
      for (const site of targetSites) {
        const siteSpecificQuery = `site:${site} ${query}`
        
        try {
          // Use DuckDuckGo for initial discovery (no API key required)
          const results = await this.searchDuckDuckGo(siteSpecificQuery)
          searchResults.push(...results)
        } catch (error) {
          console.warn(`Search failed for ${site}:`, error.message)
        }
      }
    }

    return this.deduplicateSearchResults(searchResults)
  }

  generateIntelligentSearchQueries(baseQuery, projectType, organizationType) {
    const queries = []
    
    // Base variations
    queries.push(`${baseQuery} grants funding opportunities`)
    queries.push(`${baseQuery} foundation funding`)
    queries.push(`${baseQuery} federal grants`)
    
    // Organization-specific
    if (organizationType) {
      queries.push(`${organizationType} ${baseQuery} grants`)
      queries.push(`${organizationType} funding ${baseQuery}`)
    }
    
    // Project-specific
    if (projectType) {
      queries.push(`${projectType} ${baseQuery} funding`)
      queries.push(`${projectType} grants ${baseQuery}`)
    }
    
    // Time-sensitive searches
    const currentYear = new Date().getFullYear()
    queries.push(`${baseQuery} grants ${currentYear}`)
    queries.push(`${baseQuery} funding opportunities ${currentYear}`)
    queries.push(`${baseQuery} grants deadline ${currentYear}`)
    
    // Amount-specific searches
    queries.push(`${baseQuery} small grants funding`)
    queries.push(`${baseQuery} large grants funding`)
    queries.push(`${baseQuery} seed funding grants`)
    
    return queries.slice(0, 15) // Limit to most relevant queries
  }

  async searchDuckDuckGo(query) {
    // Simple web search using DuckDuckGo (no API key required)
    try {
      const encodedQuery = encodeURIComponent(query)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`
      
      // For now, return mock results - in production you'd implement actual web scraping
      return [
        {
          title: `Search Results for: ${query}`,
          url: searchUrl,
          description: `Funding opportunities related to ${query}`,
          source: 'duckduckgo'
        }
      ]
    } catch (error) {
      console.error('DuckDuckGo search error:', error)
      return []
    }
  }

  async extractContentFromUrls(searchResults) {
    const extractedContent = []
    
    for (const result of searchResults.slice(0, 20)) { // Limit to top 20 results
      try {
        console.log(`📄 Extracting content from: ${result.url}`)
        
        // Use the web scraper to extract clean text content
        const textContent = await this.extractWebContent(result.url)
        
        if (textContent && textContent.length > 200) { // Only process substantial content
          extractedContent.push({
            ...result,
            extractedText: textContent,
            contentLength: textContent.length,
            extractedAt: new Date().toISOString()
          })
        }
      } catch (error) {
        console.warn(`Failed to extract content from ${result.url}:`, error.message)
      }
    }
    
    return extractedContent
  }

  async extractWebContent(url) {
    try {
      console.log(`📄 Fetching content from: ${url}`)
      
      // Use Node.js fetch with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WALI-OS-Bot/1.0; +https://funding-discovery-bot.com)'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.warn(`HTTP ${response.status} for ${url}`)
        return null
      }
      
      const html = await response.text()
      
      // Simple HTML to text extraction
      const textContent = this.htmlToText(html)
      
      return textContent.length > 200 ? textContent : null
      
    } catch (error) {
      console.warn(`Failed to extract content from ${url}:`, error.message)
      return null
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

  async analyzeOpportunitiesWithAI(extractedContent, userProjects, searchQuery) {
    const analyzedOpportunities = []
    
    for (const content of extractedContent) {
      try {
        console.log(`🤖 AI analyzing opportunity: ${content.title}`)
        
        const analysis = await this.performAIAnalysis(content, userProjects, searchQuery)
        
        if (analysis && analysis.isRelevantOpportunity) {
          analyzedOpportunities.push({
            ...content,
            aiAnalysis: analysis,
            relevanceScore: analysis.relevanceScore || 0
          })
        }
      } catch (error) {
        console.warn(`AI analysis failed for ${content.title}:`, error.message)
      }
    }
    
    return analyzedOpportunities.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
  }

  async performAIAnalysis(content, userProjects, searchQuery) {
    try {
      const prompt = `
Analyze the following web content to determine if it contains a legitimate funding opportunity:

CONTENT TO ANALYZE:
Title: ${content.title}
URL: ${content.url}
Text: ${content.extractedText?.substring(0, 2000)}...

USER CONTEXT:
Search Query: ${searchQuery}
User Projects: ${userProjects.map(p => p.name || p.title).join(', ')}

ANALYSIS TASKS:
1. Is this a legitimate funding opportunity? (not just a list or directory)
2. Extract key details:
   - Opportunity title
   - Funding agency/organization
   - Funding amount range
   - Deadline information
   - Eligibility requirements
   - Project types supported
   - Application requirements

3. Rate relevance to user's search (0-100)
4. Identify match factors with user projects

Respond in JSON format:
{
  "isRelevantOpportunity": boolean,
  "opportunityTitle": string,
  "fundingAgency": string,
  "fundingAmountMin": number or null,
  "fundingAmountMax": number or null,
  "deadline": string or null,
  "eligibilityRequirements": string,
  "projectTypes": [array of strings],
  "applicationRequirements": string,
  "relevanceScore": number (0-100),
  "matchFactors": [array of strings],
  "keyInformation": string,
  "recommendedNextSteps": string
}
`

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
              content: 'You are an expert funding analyst. Analyze web content for legitimate funding opportunities and extract structured information.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const analysisText = data.choices[0]?.message?.content

      try {
        // Clean up the response text to extract JSON
        let cleanJson = analysisText
        if (analysisText.includes('```json')) {
          // Extract JSON from code fences
          const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            cleanJson = jsonMatch[1]
          }
        }
        
        return JSON.parse(cleanJson)
      } catch (parseError) {
        console.warn('Failed to parse AI analysis JSON:', parseError)
        return null
      }

    } catch (error) {
      console.error('AI analysis error:', error)
      return null
    }
  }

  async generateFitScores(analyzedOpportunities, userProjects, organizationType) {
    return analyzedOpportunities.map(opportunity => {
      const fitScore = this.calculateProjectFitScore(opportunity, userProjects, organizationType)
      
      return {
        ...opportunity,
        fitScore,
        matchingProjects: this.findMatchingProjects(opportunity, userProjects),
        recommendationStrength: this.calculateRecommendationStrength(opportunity, fitScore)
      }
    })
  }

  calculateProjectFitScore(opportunity, userProjects, organizationType) {
    let score = 0
    const maxScore = 100

    // Base relevance from AI analysis
    score += (opportunity.relevanceScore || 0) * 0.4

    // Project type matching
    if (opportunity.aiAnalysis?.projectTypes && userProjects.length > 0) {
      const projectTypeMatches = userProjects.some(project => 
        opportunity.aiAnalysis.projectTypes.some(oppType => 
          project.project_type?.toLowerCase().includes(oppType.toLowerCase()) ||
          project.description?.toLowerCase().includes(oppType.toLowerCase())
        )
      )
      if (projectTypeMatches) score += 25
    }

    // Organization type matching
    if (opportunity.aiAnalysis?.eligibilityRequirements && organizationType) {
      const eligibilityText = opportunity.aiAnalysis.eligibilityRequirements.toLowerCase()
      if (eligibilityText.includes(organizationType.toLowerCase())) {
        score += 20
      }
    }

    // Funding amount appropriateness
    if (opportunity.aiAnalysis?.fundingAmountMax && userProjects.length > 0) {
      const avgProjectBudget = userProjects.reduce((sum, p) => sum + (p.funding_needed || 0), 0) / userProjects.length
      const amountFit = Math.min(avgProjectBudget / opportunity.aiAnalysis.fundingAmountMax, 1)
      score += amountFit * 15
    }

    return Math.min(score, maxScore)
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
    if (fitScore >= 80) return 'high'
    if (fitScore >= 60) return 'medium'
    if (fitScore >= 40) return 'low'
    return 'minimal'
  }

  async storeEnhancedOpportunities(userId, scoredOpportunities) {
    // Validate environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables')
    }
    
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const opportunitiesToStore = scoredOpportunities
      .filter(opp => opp.fitScore >= 30) // Only store reasonably relevant opportunities
      .map(opp => ({
        external_id: this.generateDeterministicId(opp.url),
        source: 'ai_web_discovery',
        title: opp.aiAnalysis?.opportunityTitle || opp.title,
        agency: opp.aiAnalysis?.fundingAgency || 'Unknown',
        description: opp.aiAnalysis?.keyInformation || opp.description,
        estimated_funding: opp.aiAnalysis?.fundingAmountMax,
        amount_min: opp.aiAnalysis?.fundingAmountMin,
        amount_max: opp.aiAnalysis?.fundingAmountMax,
        deadline_date: opp.aiAnalysis?.deadline,
        eligibility_criteria: opp.aiAnalysis?.eligibilityRequirements,
        application_requirements: opp.aiAnalysis?.applicationRequirements,
        project_types: opp.aiAnalysis?.projectTypes || [],
        source_url: opp.url,
        fit_score: opp.fitScore,
        ai_analysis: opp.aiAnalysis,
        matching_projects: opp.matchingProjects,
        recommendation_strength: opp.recommendationStrength,
        discovered_by: userId,
        discovered_at: new Date().toISOString(),
        needs_review: opp.fitScore < 70 // High-scoring opportunities are pre-approved
      }))

    try {
      // Use insert for now to avoid constraint issues
      const { data, error } = await supabase
        .from('opportunities')
        .insert(opportunitiesToStore)
        .select()

      if (error) {
        console.error('Error storing enhanced opportunities:', error)
        throw error
      }

      console.log(`✅ Stored ${opportunitiesToStore.length} AI-analyzed opportunities`)
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

  deduplicateSearchResults(results) {
    const seen = new Set()
    return results.filter(result => {
      const key = result.url
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}

export default AIEnhancedOpportunityDiscovery