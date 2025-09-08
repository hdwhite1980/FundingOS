import { supabase } from '../../../../lib/supabase'
import { AIService } from '../../../../lib/aiService'
import { NextResponse } from 'next/server'

interface NSFAward {
  id: string
  title: string
  agency: string
  awardeeCity: string
  awardeeName: string
  awardeeStateCode: string
  date: string
  fundsObligatedAmt: string
  piFirstName?: string
  piLastName?: string
  programName?: string
  abstractText?: string
  piEmail?: string
  expDate?: string
  startDate?: string
  awardInstrument?: string
  programOfficer?: string
}

interface SearchConfiguration {
  name: string;
  params: {
    rpp: number; // records per page
    keyword?: string;
    agency?: string;
    awardeeStateCode?: string;
    minAwardedDate?: string;
    maxAwardedDate?: string;
    minExpiredDate?: string;
    awardeeName?: string;
    piLastName?: string;
  };
  metadata?: {
    projectId?: string;
    strategy?: string;
    targetKeyword?: string;
    targetState?: string;
  };
}

async function getAIResearchCategories(project: any, userProfile: any) {
  try {
    console.log(`Getting AI research categories for project: ${project.name}`)
    
    // Enhanced prompt for research-focused categorization
    const researchPrompt = `
    Analyze this project for NSF research grant opportunities:
    
    Project: ${project.name}
    Type: ${project.project_type}
    Description: ${project.description}
    Industry: ${userProfile.industry}
    Organization: ${userProfile.organization_type}
    
    Return JSON with:
    {
      "research_keywords": ["specific research terms", "scientific domains", "technology areas"],
      "nsf_divisions": ["BIO", "CISE", "ENG", "GEO", "MPS", "SBE", "EDU"],
      "collaboration_keywords": ["university", "research institution", "partnership terms"],
      "award_size_category": "small|medium|large",
      "research_focus": "basic|applied|translational",
      "reasoning": "explanation"
    }
    `
    
    const aiCategories = await AIService.categorizeForResearch(researchPrompt, project, userProfile)
    
    console.log(`AI research categories for ${project.name}:`, aiCategories)
    return aiCategories
  } catch (error) {
    console.error('AI research categorization failed:', error)
    return null
  }
}

function getResearchCategories(userProfile: any, userProjects: any[] = []) {
  const keywords = new Set<string>()
  const states = new Set<string>()
  
  // Research-focused keywords based on organization type
  if (userProfile.organization_type === 'university' || userProfile.organization_type === 'nonprofit') {
    keywords.add('education')
    keywords.add('research')
    keywords.add('development')
    keywords.add('training')
  }
  
  if (userProfile.organization_type === 'for_profit') {
    keywords.add('innovation')
    keywords.add('technology')
    keywords.add('commercialization')
    keywords.add('SBIR')
    keywords.add('STTR')
  }
  
  // Industry-specific research keywords
  if (userProfile.industry) {
    const industryMappings = {
      'healthcare': ['biomedical', 'health', 'medical', 'biotechnology'],
      'technology': ['computer science', 'artificial intelligence', 'cybersecurity', 'software'],
      'environment': ['environmental', 'climate', 'sustainability', 'renewable energy'],
      'engineering': ['engineering', 'materials', 'mechanical', 'civil'],
      'education': ['education', 'STEM', 'learning', 'workforce'],
      'agriculture': ['agriculture', 'food systems', 'agricultural engineering'],
      'energy': ['energy', 'renewable', 'solar', 'wind', 'battery']
    }
    
    const mapping = industryMappings[userProfile.industry.toLowerCase()]
    if (mapping) {
      mapping.forEach(keyword => keywords.add(keyword))
    }
  }
  
  // Add state for geographic relevance
  if (userProfile.state) {
    states.add(userProfile.state)
  }
  
  // Project-specific research keywords
  userProjects.forEach(project => {
    if (project.description) {
      // Extract potential research terms from description
      const researchTerms = ['AI', 'machine learning', 'data science', 'biotechnology', 
                           'nanotechnology', 'robotics', 'cybersecurity', 'blockchain',
                           'quantum', 'materials', 'environmental', 'renewable']
      
      researchTerms.forEach(term => {
        if (project.description.toLowerCase().includes(term.toLowerCase())) {
          keywords.add(term)
        }
      })
    }
    
    // Funding level research focus
    if (project.funding_needed) {
      if (project.funding_needed >= 500000) {
        keywords.add('large scale research')
      } else if (project.funding_needed <= 100000) {
        keywords.add('early stage research')
      }
    }
  })
  
  // Default research keywords if none found
  if (keywords.size === 0) {
    keywords.add('research')
    keywords.add('innovation')
    keywords.add('development')
  }
  
  return {
    keywords: Array.from(keywords),
    states: Array.from(states)
  }
}

export async function GET(request: Request) {
  try {
    console.log('Starting AI-enhanced NSF Awards sync...')
    
    // Get user profiles and projects
    const { data: userProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')

    const { data: userProjects, error: projectError } = await supabase
      .from('projects')
      .select('*')

    if (profileError) {
      console.error('Error fetching user profiles:', profileError)
    }
    if (projectError) {
      console.error('Error fetching user projects:', projectError)
    }

    // Use AI to determine research strategies
    const aiResearchStrategies: Array<{ project: any; userProfile: any; aiCategories: any }> = []
    
    if (userProjects && userProfiles) {
      for (const project of userProjects) {
        const userProfile = userProfiles.find(p => p.id === project.user_id)
        if (userProfile) {
          const aiCategories = await getAIResearchCategories(project, userProfile)
          
          if (aiCategories) {
            aiResearchStrategies.push({
              project,
              userProfile,
              aiCategories
            })
          }
        }
      }
    }

    console.log(`AI research strategies generated: ${aiResearchStrategies.length}`)

    // Fallback research strategy
    const smartKeywords = new Set<string>()
    const smartStates = new Set<string>()

    if (userProfiles) {
      for (const profile of userProfiles) {
        const userProjectsForProfile = userProjects?.filter(p => p.user_id === profile.id) || []
        const relevant = getResearchCategories(profile, userProjectsForProfile)
        
        relevant.keywords.forEach(keyword => smartKeywords.add(keyword))
        relevant.states.forEach(state => smartStates.add(state))
      }
    }

    console.log('Fallback research strategy:', {
      keywords: Array.from(smartKeywords).slice(0, 10),
      states: Array.from(smartStates)
    })

    // Create search configurations
    const searchConfigurations: SearchConfiguration[] = []
    
    // Recent awards only (last 2 years for active research areas)
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const minDate = twoYearsAgo.toISOString().split('T')[0].replace(/-/g, '/')

    // AI-driven searches
    aiResearchStrategies.forEach(({ project, aiCategories }) => {
      // Research keyword searches
      aiCategories.research_keywords?.slice(0, 3).forEach((keyword: string) => {
        searchConfigurations.push({
          name: `AI-Research: ${keyword} for ${project.name}`,
          params: {
            rpp: 50,
            keyword: keyword,
            minAwardedDate: minDate,
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-research',
            targetKeyword: keyword
          }
        })
      })

      // Collaboration-focused searches
      aiCategories.collaboration_keywords?.slice(0, 2).forEach((keyword: string) => {
        searchConfigurations.push({
          name: `AI-Collaboration: ${keyword} for ${project.name}`,
          params: {
            rpp: 30,
            keyword: keyword,
            minAwardedDate: minDate,
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-collaboration',
            targetKeyword: keyword
          }
        })
      })
    })

    // Rule-based fallback searches
    if (aiResearchStrategies.length === 0 || searchConfigurations.length < 5) {
      console.log('Adding rule-based research searches...')
      
      // Keyword-based searches
      Array.from(smartKeywords).slice(0, 5).forEach(keyword => {
        searchConfigurations.push({
          name: `Fallback-Research: ${keyword}`,
          params: {
            rpp: 100,
            keyword: keyword,
            minAwardedDate: minDate,
          },
          metadata: {
            strategy: 'fallback-research',
            targetKeyword: keyword
          }
        })
      })

      // State-based searches for local research opportunities
      Array.from(smartStates).slice(0, 3).forEach(state => {
        searchConfigurations.push({
          name: `Fallback-State: ${state}`,
          params: {
            rpp: 50,
            awardeeStateCode: state,
            minAwardedDate: minDate,
          },
          metadata: {
            strategy: 'fallback-state',
            targetState: state
          }
        })
      })
    }

    // Emergency fallback
    if (searchConfigurations.length === 0) {
      searchConfigurations.push({
        name: "Emergency Research Search",
        params: {
          rpp: 200,
          keyword: "research",
          minAwardedDate: minDate,
        },
        metadata: {
          strategy: 'emergency-fallback'
        }
      })
    }

    console.log(`Executing ${searchConfigurations.length} NSF search configurations...`)

    let allAwards: (NSFAward & { _aiMetadata?: any })[] = []
    let searchResults: Array<{
      name: string
      count?: number
      error?: string
      strategy?: string
      projectId?: string
    }> = []

    // Execute searches
    for (const config of searchConfigurations) {
      try {
        console.log(`Executing: ${config.name}`)
        
        // Build query string
        const queryParams = new URLSearchParams()
        Object.entries(config.params).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            queryParams.append(key, value.toString())
          }
        })
        
        const response = await fetch(
          `https://api.nsf.gov/services/v1/awards.json?${queryParams.toString()}`
        )

        if (response.ok) {
          const data = await response.json()
          const awards: NSFAward[] = data.response?.award || []
          
          console.log(`${config.name}: ${awards.length} awards found`)
          
          searchResults.push({
            name: config.name,
            count: awards.length,
            strategy: config.metadata?.strategy,
            projectId: config.metadata?.projectId
          })

          if (awards.length > 0) {
            const enhancedAwards = awards.map(award => ({
              ...award,
              _aiMetadata: config.metadata
            }))

            // Filter duplicates
            const newAwards = enhancedAwards.filter(award => 
              !allAwards.some(existing => existing.id === award.id)
            )
            
            allAwards.push(...newAwards)
            console.log(`Added ${newAwards.length} new unique awards`)
          }
        }
      } catch (error) {
        console.error(`NSF search failed for ${config.name}:`, error)
        searchResults.push({
          name: config.name,
          error: (error as Error).message,
          strategy: config.metadata?.strategy
        })
      }
    }

    console.log(`Total unique NSF awards found: ${allAwards.length}`)

    if (allAwards.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No NSF awards found with current search criteria',
        search_results: searchResults
      })
    }

    // Transform to opportunities format
    const processedOpportunities = allAwards.map((award) => {
      const fundingAmount = award.fundsObligatedAmt ? parseFloat(award.fundsObligatedAmt) : null
      
      return {
        external_id: award.id,
        source: 'nsf',
        title: award.title || 'NSF Research Award',
        sponsor: 'National Science Foundation',
        agency: 'NSF',
        description: `NSF Award: ${award.title}${award.abstractText ? `\n\n${award.abstractText}` : ''}`,
        amount_min: fundingAmount,
        amount_max: fundingAmount,
        credit_percentage: null,
        deadline_date: null, // NSF awards are historical, no deadline
        deadline_type: 'rolling',
        match_requirement_percentage: 0,
        eligibility_criteria: ['university', 'research_institution'],
        geography: award.awardeeStateCode ? [award.awardeeStateCode.toLowerCase()] : ['nationwide'],
        project_types: ['research', 'development'],
        organization_types: ['university', 'nonprofit', 'for_profit'],
        industry_focus: ['research', 'education'],
        minority_business: false,
        woman_owned_business: false,
        veteran_owned_business: false,
        small_business_only: false,
        cfda_number: null,
        source_url: `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${award.id}`,
        application_process: 'See NSF funding opportunities for similar programs',
        required_documents: ['research_proposal', 'budget', 'cv'],
        contact_email: award.piEmail || null,
        contact_phone: null,
        competition_level: 'competitive',
        funding_instrument: 'grant',
        raw_data: award,
        ai_metadata: award._aiMetadata || null,
        last_updated: new Date().toISOString()
      }
    })

    // Filter valid opportunities
    const validOpportunities = processedOpportunities.filter(opp => {
      return opp.external_id && opp.title && opp.sponsor
    })

    console.log(`Processing ${validOpportunities.length} valid NSF opportunities`)

    // Store in database
    const { data: inserted, error } = await supabase
      .from('opportunities')
      .upsert(validOpportunities, { 
        onConflict: 'external_id,source',
        ignoreDuplicates: false 
      })
      .select('id, title, sponsor, amount_min')

    if (error) {
      console.error('Database upsert error:', error)
      throw error
    }

    console.log(`Successfully inserted ${inserted?.length || 0} NSF awards`)

    return NextResponse.json({
      success: true,
      imported: inserted?.length || 0,
      message: `Successfully imported ${inserted?.length || 0} NSF research awards`,
      summary: {
        total_fetched: allAwards.length,
        total_processed: processedOpportunities.length,
        total_valid: validOpportunities.length,
        total_imported: inserted?.length || 0,
        ai_strategies_used: aiResearchStrategies.length,
        total_search_configurations: searchConfigurations.length,
        source: 'nsf',
        last_sync: new Date().toISOString()
      },
      ai_insights: aiResearchStrategies.map(strategy => ({
        project_name: strategy.project.name,
        research_keywords: strategy.aiCategories.research_keywords,
        nsf_divisions: strategy.aiCategories.nsf_divisions,
        research_focus: strategy.aiCategories.research_focus,
        reasoning: strategy.aiCategories.reasoning
      })),
      search_results: searchResults,
      sample_awards: inserted?.slice(0, 5).map(award => ({
        title: award.title,
        amount: award.amount_min,
        sponsor: award.sponsor
      })) || []
    })

  } catch (error: any) {
    console.error('NSF sync error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to sync with NSF API',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}