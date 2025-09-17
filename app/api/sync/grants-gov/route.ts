import { createClient } from '@supabase/supabase-js'
import AIService from '../../../../lib/aiService' // Add this import
import { NextResponse } from 'next/server'

// Create service role client for sync operations (bypasses RLS)
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Also import regular client for user profile queries
import { supabase } from '../../../../lib/supabase'

interface GrantsGovOpportunity {
  id: string
  number: string
  title: string
  agencyCode: string
  agencyName: string
  agency?: string
  openDate: string
  closeDate: string
  oppStatus: string
  docType: string
  alnlist?: string[]
  cfdaList?: string[]
}

interface SearchConfiguration {
  name: string;
  params: {
    rows: number;
    oppStatuses: string;
    fundingCategories?: string;
    keyword?: string;
    agencies?: string;
    eligibilities?: string;
    aln?: string;
  };
  metadata?: {
    projectId?: string;
    strategy?: string;
    targetCategory?: string;
    targetAgency?: string;
    targetKeyword?: string;
  };
}

// FIXED: Direct AI service call instead of HTTP fetch
async function getAIProjectCategories(project: any, userProfile: any) {
  try {
    console.log(`Getting AI categories for project: ${project.name}`)
    
    // Direct method call instead of HTTP fetch
    const aiCategories = await AIService.determineProjectCategories(project, userProfile)
    
    console.log(`AI categories for ${project.name}:`, aiCategories)
    return aiCategories
  } catch (error) {
    console.error('AI categorization failed:', error)
    // This will gracefully fall back to rule-based logic
    return null
  }
}

// Enhanced smart category mapping with fallback logic
function getRelevantCategories(userProfile: any, userProjects: any[] = []) {
  const categories = new Set<string>()
  const agencies = new Set<string>()
  const keywords = new Set<string>()

  // Based on organization type
  if (userProfile.organization_type === 'nonprofit') {
    categories.add('HL') // Health & Life Sciences
    categories.add('ED') // Education
    categories.add('HU') // Humanities
    agencies.add('HHS')
    agencies.add('ED')
    keywords.add('community development')
    keywords.add('social services')
  }

  if (userProfile.organization_type === 'for_profit') {
    categories.add('ST') // Science & Technology
    categories.add('EN') // Energy
    agencies.add('DOE')
    agencies.add('NSF')
    keywords.add('innovation')
    keywords.add('research')
  }

  if (userProfile.organization_type === 'government') {
    categories.add('CD') // Community Development
    categories.add('HL') // Health & Life Sciences
    agencies.add('HUD')
    agencies.add('EPA')
    keywords.add('infrastructure')
    keywords.add('public services')
  }

  // Based on industry
  if (userProfile.industry) {
    const industryMappings = {
      'healthcare': { cats: ['HL'], agencies: ['HHS', 'CDC'], keywords: ['health', 'medical'] },
      'education': { cats: ['ED'], agencies: ['ED'], keywords: ['education', 'training'] },
      'technology': { cats: ['ST'], agencies: ['NSF', 'DOD'], keywords: ['technology', 'innovation'] },
      'environment': { cats: ['EN', 'AG'], agencies: ['EPA', 'USDA'], keywords: ['environment', 'sustainability'] },
      'construction': { cats: ['CD'], agencies: ['HUD'], keywords: ['construction', 'infrastructure'] },
      'agriculture': { cats: ['AG'], agencies: ['USDA'], keywords: ['agriculture', 'farming'] }
    }

    const mapping = industryMappings[userProfile.industry.toLowerCase()]
    if (mapping) {
      mapping.cats.forEach(cat => categories.add(cat))
      mapping.agencies.forEach(agency => agencies.add(agency))
      mapping.keywords.forEach(keyword => keywords.add(keyword))
    }
  }

  // Enhanced project type mappings
  userProjects.forEach(project => {
    if (project.project_type) {
      const projectMappings = {
        'community_development': { cats: ['CD', 'HL'], keywords: ['community', 'development', 'revitalization'] },
        'infrastructure': { cats: ['CD', 'EN', 'T'], keywords: ['infrastructure', 'transportation', 'utilities'] },
        'healthcare': { cats: ['HL'], keywords: ['health', 'medical', 'clinic'] },
        'education': { cats: ['ED'], keywords: ['education', 'training', 'workforce'] },
        'environmental': { cats: ['EN', 'AG'], keywords: ['environment', 'energy', 'sustainability'] },
        'research': { cats: ['ST', 'HL'], keywords: ['research', 'innovation', 'development'] },
        'nonprofit_program': { cats: ['CD', 'HL'], keywords: ['nonprofit', 'services', 'program'] },
        'small_business': { cats: ['BC'], keywords: ['small business', 'entrepreneur', 'commercial'] },
        'commercial_development': { cats: ['BC', 'RD'], keywords: ['commercial', 'business', 'economic'] },
        'residential_development': { cats: ['HO', 'CD'], keywords: ['housing', 'residential', 'affordable'] },
        'agriculture': { cats: ['AG'], keywords: ['agriculture', 'farming', 'rural'] },
        'technology': { cats: ['ST'], keywords: ['technology', 'innovation', 'digital'] }
      }

      const mapping = projectMappings[project.project_type]
      if (mapping) {
        mapping.cats?.forEach(cat => categories.add(cat))
        mapping.keywords?.forEach(keyword => keywords.add(keyword))
      }
    }

    // Add funding-based keywords
    if (project.funding_needed) {
      if (project.funding_needed >= 1000000) {
        keywords.add('large scale')
      } else if (project.funding_needed <= 50000) {
        keywords.add('small business')
        agencies.add('SBA')
      }
    }
  })

  // Based on certifications
  if (userProfile.small_business) {
    agencies.add('SBA')
    keywords.add('small business')
  }
  if (userProfile.minority_owned) {
    keywords.add('minority')
    keywords.add('disadvantaged')
    agencies.add('MBDA')
  }
  if (userProfile.woman_owned) {
    keywords.add('women')
  }
  if (userProfile.veteran_owned) {
    keywords.add('veteran')
  }

  // Default fallbacks if no specific matches
  if (categories.size === 0) {
    categories.add('HL') // Health & Life Sciences
    categories.add('CD') // Community Development
  }

  return {
    categories: Array.from(categories),
    agencies: Array.from(agencies),
    keywords: Array.from(keywords)
  }
}

export async function GET(request: Request) {
  try {
    console.log('Starting AI-enhanced Grants.gov sync...')

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

    // Use AI to determine search strategies for each project
    const aiSearchStrategies: Array<{ project: any; userProfile: any; aiCategories: any }> = []
    
    if (userProjects && userProfiles) {
      for (const project of userProjects) {
        const userProfile = userProfiles.find(p => p.id === project.user_id)
        if (userProfile) {
          const aiCategories = await getAIProjectCategories(project, userProfile)
          
          if (aiCategories) {
            aiSearchStrategies.push({
              project,
              userProfile,
              aiCategories
            })
          }
        }
      }
    }

    console.log(`AI strategies generated: ${aiSearchStrategies.length}`)

    // Fallback: Analyze all users to determine smart search strategy
    const smartCategories = new Set<string>()
    const smartAgencies = new Set<string>()
    const smartKeywords = new Set<string>()

    // Process each user's profile and projects for fallback strategy
    if (userProfiles) {
      for (const profile of userProfiles) {
        const userProjectsForProfile = userProjects?.filter(p => p.user_id === profile.id) || []
        const relevant = getRelevantCategories(profile, userProjectsForProfile)
        
        relevant.categories.forEach(cat => smartCategories.add(cat))
        relevant.agencies.forEach(agency => smartAgencies.add(agency))
        relevant.keywords.forEach(keyword => smartKeywords.add(keyword))
      }
    }

    console.log('Fallback smart search strategy:', {
      categories: Array.from(smartCategories),
      agencies: Array.from(smartAgencies).slice(0, 5),
      keywords: Array.from(smartKeywords).slice(0, 10)
    })

    // Create search configurations combining AI and rule-based approaches
    const searchConfigurations: SearchConfiguration[] = []

    // AI-driven searches (priority)
    aiSearchStrategies.forEach(({ project, aiCategories }) => {
      // Primary category searches
      aiCategories.primary_categories?.forEach((category: string) => {
        searchConfigurations.push({
          name: `AI-Primary: ${category} for ${project.name}`,
          params: {
            rows: 50,
            oppStatuses: "posted",
            fundingCategories: category,
            keyword: "",
            agencies: "",
            eligibilities: "",
            aln: "",
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-primary',
            targetCategory: category
          }
        })
      })

      // Agency-specific searches
      aiCategories.priority_agencies?.slice(0, 3).forEach((agency: string) => {
        searchConfigurations.push({
          name: `AI-Agency: ${agency} for ${project.name}`,
          params: {
            rows: 30,
            oppStatuses: "posted",
            agencies: agency,
            fundingCategories: "",
            keyword: "",
            eligibilities: "",
            aln: "",
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-agency',
            targetAgency: agency
          }
        })
      })

      // Keyword-driven searches
      const topKeywords = aiCategories.search_keywords?.slice(0, 2) || []
      topKeywords.forEach((keyword: string) => {
        searchConfigurations.push({
          name: `AI-Keyword: ${keyword} for ${project.name}`,
          params: {
            rows: 25,
            oppStatuses: "posted",
            keyword: keyword,
            agencies: "",
            eligibilities: "",
            aln: "",
            fundingCategories: ""
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-keyword',
            targetKeyword: keyword
          }
        })
      })
    })

    // Rule-based fallback searches (if AI didn't cover everything)
    if (aiSearchStrategies.length === 0 || searchConfigurations.length < 5) {
      console.log('Adding rule-based fallback searches...')
      
      // Category-based searches
      Array.from(smartCategories).forEach(category => {
        searchConfigurations.push({
          name: `Fallback-Category: ${category}`,
          params: {
            rows: 100,
            oppStatuses: "posted",
            fundingCategories: category,
            keyword: "",
            agencies: "",
            eligibilities: "",
            aln: "",
          },
          metadata: {
            strategy: 'fallback-category',
            targetCategory: category
          }
        })
      })

      // Agency-based searches
      Array.from(smartAgencies).slice(0, 5).forEach(agency => {
        searchConfigurations.push({
          name: `Fallback-Agency: ${agency}`,
          params: {
            rows: 100,
            oppStatuses: "posted",
            agencies: agency,
            fundingCategories: "",
            keyword: "",
            eligibilities: "",
            aln: "",
          },
          metadata: {
            strategy: 'fallback-agency',
            targetAgency: agency
          }
        })
      })

      // Keyword-based searches for top keywords
      Array.from(smartKeywords).slice(0, 3).forEach(keyword => {
        searchConfigurations.push({
          name: `Fallback-Keyword: ${keyword}`,
          params: {
            rows: 50,
            oppStatuses: "posted",
            keyword: keyword,
            agencies: "",
            eligibilities: "",
            aln: "",
            fundingCategories: ""
          },
          metadata: {
            strategy: 'fallback-keyword',
            targetKeyword: keyword
          }
        })
      })
    }

    // Final fallback broad search if still no specific criteria
    if (searchConfigurations.length === 0) {
      searchConfigurations.push({
        name: "Emergency Broad Search",
        params: {
          rows: 200,
          oppStatuses: "posted",
          keyword: "",
          agencies: "",
          eligibilities: "",
          aln: "",
          fundingCategories: ""
        },
        metadata: {
          strategy: 'emergency-fallback'
        }
      })
    }

    console.log(`Executing ${searchConfigurations.length} search configurations (${aiSearchStrategies.length} AI-driven)...`)

    let allOpportunities: (GrantsGovOpportunity & { _aiMetadata?: any })[] = []
    let searchResults: Array<{
      name: string
      count?: number
      errorcode?: any
      message?: any
      error?: string
      strategy?: string
      projectId?: string
    }> = []

    // Execute all search configurations
    for (const config of searchConfigurations) {
      try {
        console.log(`Executing: ${config.name}`)
        
        const response = await fetch(
          'https://api.grants.gov/v1/api/search2',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config.params)
          }
        )

        if (response.ok) {
          const data = await response.json()
          const opportunities: GrantsGovOpportunity[] = data.data?.oppHits || []
          
          console.log(`${config.name}: ${opportunities.length} opportunities found`)
          
          searchResults.push({
            name: config.name,
            count: opportunities.length,
            errorcode: data.errorcode,
            message: data.msg,
            strategy: config.metadata?.strategy,
            projectId: config.metadata?.projectId
          })

          if (opportunities.length > 0) {
            // Add metadata to opportunities for project tracking
            const enhancedOpportunities = opportunities.map(opp => ({
              ...opp,
              _aiMetadata: config.metadata
            }))

            // Filter duplicates
            const newOpportunities = enhancedOpportunities.filter(opp => 
              !allOpportunities.some(existing => existing.id === opp.id)
            )
            
            allOpportunities.push(...newOpportunities)
            console.log(`Added ${newOpportunities.length} new unique opportunities`)
          }
        }
      } catch (error) {
        console.error(`Search failed for ${config.name}:`, error)
        searchResults.push({
          name: config.name,
          error: (error as Error).message,
          strategy: config.metadata?.strategy
        })
      }
    }

    console.log(`Total unique opportunities found: ${allOpportunities.length}`)

    if (allOpportunities.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No opportunities found with AI-enhanced search criteria',
        search_results: searchResults,
        ai_strategies_used: aiSearchStrategies.length,
        fallback_strategy: {
          categories: Array.from(smartCategories),
          agencies: Array.from(smartAgencies),
          keywords: Array.from(smartKeywords)
        }
      })
    }

    // Transform data to match your exact schema with AI metadata
    console.log('Processing opportunities for database insertion...')
    const processedOpportunities = allOpportunities.map((opp) => {
      const sponsor = opp.agencyName || opp.agencyCode || opp.agency || 'Federal Agency'
      const title = opp.title || 'Untitled Grant Opportunity'
      
      return {
        external_id: opp.id,
        source: 'grants_gov',
        title: title,
        sponsor: sponsor,
        agency: sponsor,
        description: `Grant opportunity: ${title}`,
        amount_min: null,
        amount_max: null,
        credit_percentage: null,
        deadline_date: opp.closeDate || null,
        deadline_type: opp.closeDate ? 'fixed' : 'rolling',
        match_requirement_percentage: 0,
        eligibility_criteria: ['general'],
        geography: ['nationwide'],
        project_types: ['general'],
        organization_types: ['nonprofit', 'for_profit', 'government'],
        industry_focus: ['general'],
        minority_business: false,
        woman_owned_business: false,
        veteran_owned_business: false,
        small_business_only: false,
        cfda_number: opp.alnlist?.[0] || opp.cfdaList?.[0] || null,
        source_url: `https://www.grants.gov/search-results-detail/${opp.id}`,
        application_process: null,
        required_documents: ['application_form'],
        contact_email: null,
        contact_phone: null,
        competition_level: 'competitive',
        funding_instrument: 'grant',
        raw_data: opp,
        ai_metadata: opp._aiMetadata || null, // Store AI search context
        last_updated: new Date().toISOString()
      }
    })

    // Filter out invalid opportunities
    const validOpportunities = processedOpportunities.filter(opp => {
      const isValid = opp.external_id && 
                     opp.title && 
                     opp.sponsor && 
                     opp.sponsor !== 'undefined' &&
                     opp.sponsor.trim() !== ''
      
      if (!isValid) {
        console.log('Filtering out invalid opportunity:', {
          id: opp.external_id,
          title: opp.title,
          sponsor: opp.sponsor
        })
      }
      
      return isValid
    })

    console.log(`Processing ${processedOpportunities.length} opportunities, ${validOpportunities.length} valid for database insert`)

    // Test database connection with service role client
    console.log('Testing database connection...')
    const { count, error: countError } = await supabaseServiceRole
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Database connection test failed:', countError)
      throw new Error(`Database connection failed: ${countError.message}`)
    }
    
    console.log(`Database connection successful. Current opportunities count: ${count}`)

    // Store in database
    // Use service role client for inserting opportunities (bypasses RLS)
    const { data: inserted, error } = await supabaseServiceRole
      .from('opportunities')
      .upsert(validOpportunities, { 
        onConflict: 'external_id,source',
        ignoreDuplicates: false 
      })
      .select('id, title, sponsor, deadline_date')

    if (error) {
      console.error('Database upsert error:', error)
      throw error
    }

    console.log(`Successfully inserted ${inserted?.length || 0} opportunities`)

    return NextResponse.json({
      success: true,
      imported: inserted?.length || 0,
      message: `Successfully imported ${inserted?.length || 0} AI-enhanced federal grant opportunities`,
      summary: {
        total_fetched: allOpportunities.length,
        total_processed: processedOpportunities.length,
        total_valid: validOpportunities.length,
        total_imported: inserted?.length || 0,
        ai_strategies_used: aiSearchStrategies.length,
        total_search_configurations: searchConfigurations.length,
        source: 'grants_gov',
        last_sync: new Date().toISOString(),
        agencies: Array.from(new Set(validOpportunities.map(opp => opp.sponsor))).slice(0, 5)
      },
      ai_insights: aiSearchStrategies.map(strategy => ({
        project_name: strategy.project.name,
        project_type: strategy.project.project_type,
        primary_categories: strategy.aiCategories.primary_categories,
        priority_agencies: strategy.aiCategories.priority_agencies,
        search_keywords: strategy.aiCategories.search_keywords?.slice(0, 3),
        reasoning: strategy.aiCategories.reasoning
      })),
      search_results: searchResults,
      sample_grants: inserted?.slice(0, 5).map(grant => ({
        title: grant.title,
        sponsor: grant.sponsor,
        deadline: grant.deadline_date
      })) || [],
      data_quality: {
        opportunities_found: allOpportunities.length,
        opportunities_processed: processedOpportunities.length,
        opportunities_valid: validOpportunities.length,
        opportunities_filtered_out: processedOpportunities.length - validOpportunities.length,
        ai_enhanced: aiSearchStrategies.length > 0
      }
    })

  } catch (error: any) {
    console.error('AI-enhanced Grants.gov sync error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to sync with Grants.gov API',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}