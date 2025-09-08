import { supabase } from '../../../../lib/supabase'
import { AIService } from '../../../../lib/aiService'
import { NextResponse } from 'next/server'

interface CandidGrant {
  id: string
  title: string
  description?: string
  funder: {
    id: string
    name: string
    type: string
    state?: string
    country?: string
  }
  recipient: {
    id: string
    name: string
    state?: string
    country?: string
    ntee_major_group?: string
  }
  amount: number
  award_date: string
  duration_months?: number
  purpose?: string
  subject?: string[]
  population_served?: string[]
  support_type?: string
  geography?: string[]
}

interface CandidFunder {
  id: string
  name: string
  type: string
  total_giving?: number
  avg_grant_amount?: number
  grants_count?: number
  state?: string
  focus_areas?: string[]
  giving_interests?: string[]
  assets?: number
}

interface SearchConfiguration {
  name: string;
  endpoint: 'grants' | 'funders';
  params: {
    search?: string;
    funder_state?: string;
    recipient_state?: string;
    subject?: string[];
    population_served?: string[];
    support_type?: string;
    amount_min?: number;
    amount_max?: number;
    award_date_from?: string;
    award_date_to?: string;
    funder_type?: string[];
    limit?: number;
    offset?: number;
  };
  metadata?: {
    projectId?: string;
    strategy?: string;
    targetCategory?: string;
    targetPopulation?: string;
  };
}

// You'll need to set this in your environment variables
const CANDID_API_KEY = process.env.CANDID_API_KEY

async function getAIFoundationCategories(project: any, userProfile: any) {
  try {
    console.log(`Getting AI foundation categories for project: ${project.name}`)
    
    const foundationPrompt = `
    Analyze this project for foundation grant opportunities:
    
    Project: ${project.name}
    Type: ${project.project_type}
    Description: ${project.description}
    Organization: ${userProfile.organization_type}
    Industry: ${userProfile.industry}
    Location: ${userProfile.state}, ${userProfile.country}
    
    Return JSON with:
    {
      "subject_areas": ["education", "health", "environment", "arts", "social_services"],
      "populations_served": ["children", "elderly", "minorities", "women", "rural", "urban"],
      "support_types": ["general_support", "program_support", "capacity_building", "research"],
      "funder_types": ["private_foundation", "community_foundation", "corporate_foundation"],
      "geographic_focus": ["local", "state", "regional", "national"],
      "funding_range": "small|medium|large",
      "grant_keywords": ["specific terms for foundation search"],
      "foundation_strategy": "explanation of approach",
      "reasoning": "why these categories fit"
    }
    `
    
    const aiCategories = await AIService.categorizeForFoundations(foundationPrompt, project, userProfile)
    
    console.log(`AI foundation categories for ${project.name}:`, aiCategories)
    return aiCategories
  } catch (error) {
    console.error('AI foundation categorization failed:', error)
    return null
  }
}

function getFoundationCategories(userProfile: any, userProjects: any[] = []) {
  const subjects = new Set<string>()
  const populations = new Set<string>()
  const supportTypes = new Set<string>()
  const funderTypes = new Set<string>()
  
  // Organization type mappings
  if (userProfile.organization_type === 'nonprofit') {
    subjects.add('social_services')
    subjects.add('community_development')
    subjects.add('health')
    supportTypes.add('general_support')
    supportTypes.add('program_support')
    funderTypes.add('private_foundation')
    funderTypes.add('community_foundation')
  }
  
  if (userProfile.organization_type === 'university') {
    subjects.add('education')
    subjects.add('research')
    subjects.add('scholarship')
    supportTypes.add('program_support')
    supportTypes.add('research')
    funderTypes.add('private_foundation')
  }
  
  if (userProfile.organization_type === 'arts') {
    subjects.add('arts_culture')
    subjects.add('humanities')
    supportTypes.add('program_support')
    supportTypes.add('capacity_building')
    funderTypes.add('private_foundation')
  }
  
  // Industry-specific mappings
  if (userProfile.industry) {
    const industryMappings = {
      'healthcare': {
        subjects: ['health', 'medical_research', 'public_health'],
        populations: ['patients', 'underserved']
      },
      'education': {
        subjects: ['education', 'workforce_development', 'scholarship'],
        populations: ['students', 'children', 'youth']
      },
      'environment': {
        subjects: ['environment', 'conservation', 'sustainability'],
        populations: ['communities', 'rural']
      },
      'social_services': {
        subjects: ['social_services', 'human_services', 'community_development'],
        populations: ['low_income', 'minorities', 'families']
      },
      'arts': {
        subjects: ['arts_culture', 'humanities', 'creative'],
        populations: ['artists', 'youth', 'communities']
      }
    }
    
    const mapping = industryMappings[userProfile.industry.toLowerCase()]
    if (mapping) {
      mapping.subjects.forEach(subject => subjects.add(subject))
      mapping.populations?.forEach(pop => populations.add(pop))
    }
  }
  
  // Project-specific categories
  userProjects.forEach(project => {
    if (project.project_type) {
      const projectMappings = {
        'community_development': {
          subjects: ['community_development', 'housing', 'economic_development'],
          populations: ['low_income', 'minorities', 'communities']
        },
        'education': {
          subjects: ['education', 'workforce_development', 'literacy'],
          populations: ['children', 'youth', 'students']
        },
        'healthcare': {
          subjects: ['health', 'medical_research', 'mental_health'],
          populations: ['patients', 'elderly', 'underserved']
        },
        'environmental': {
          subjects: ['environment', 'conservation', 'renewable_energy'],
          populations: ['communities', 'rural']
        },
        'research': {
          subjects: ['research', 'innovation', 'technology'],
          supportTypes: ['research', 'program_support']
        }
      }
      
      const mapping = projectMappings[project.project_type]
      if (mapping) {
        mapping.subjects?.forEach(subject => subjects.add(subject))
        mapping.populations?.forEach(pop => populations.add(pop))
        mapping.supportTypes?.forEach(type => supportTypes.add(type))
      }
    }
    
    // Funding size considerations
    if (project.funding_needed) {
      if (project.funding_needed >= 100000) {
        funderTypes.add('private_foundation')
      } else {
        funderTypes.add('community_foundation')
        funderTypes.add('corporate_foundation')
      }
    }
  })
  
  // Demographics-based populations
  if (userProfile.minority_owned) {
    populations.add('minorities')
  }
  if (userProfile.woman_owned) {
    populations.add('women')
  }
  if (userProfile.veteran_owned) {
    populations.add('veterans')
  }
  
  // Default categories if none found
  if (subjects.size === 0) {
    subjects.add('community_development')
    subjects.add('education')
    subjects.add('health')
  }
  
  if (supportTypes.size === 0) {
    supportTypes.add('general_support')
    supportTypes.add('program_support')
  }
  
  if (funderTypes.size === 0) {
    funderTypes.add('private_foundation')
    funderTypes.add('community_foundation')
  }
  
  return {
    subjects: Array.from(subjects),
    populations: Array.from(populations),
    supportTypes: Array.from(supportTypes),
    funderTypes: Array.from(funderTypes)
  }
}

export async function GET(request: Request) {
  try {
    console.log('Starting AI-enhanced Candid Foundation sync...')
    
    if (!CANDID_API_KEY) {
      throw new Error('CANDID_API_KEY environment variable is required')
    }
    
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

    // Use AI to determine foundation strategies
    const aiFoundationStrategies: Array<{ project: any; userProfile: any; aiCategories: any }> = []
    
    if (userProjects && userProfiles) {
      for (const project of userProjects) {
        const userProfile = userProfiles.find(p => p.id === project.user_id)
        if (userProfile) {
          const aiCategories = await getAIFoundationCategories(project, userProfile)
          
          if (aiCategories) {
            aiFoundationStrategies.push({
              project,
              userProfile,
              aiCategories
            })
          }
        }
      }
    }

    console.log(`AI foundation strategies generated: ${aiFoundationStrategies.length}`)

    // Fallback foundation strategy
    const smartSubjects = new Set<string>()
    const smartPopulations = new Set<string>()
    const smartSupportTypes = new Set<string>()
    const smartFunderTypes = new Set<string>()

    if (userProfiles) {
      for (const profile of userProfiles) {
        const userProjectsForProfile = userProjects?.filter(p => p.user_id === profile.id) || []
        const relevant = getFoundationCategories(profile, userProjectsForProfile)
        
        relevant.subjects.forEach(subject => smartSubjects.add(subject))
        relevant.populations.forEach(pop => smartPopulations.add(pop))
        relevant.supportTypes.forEach(type => smartSupportTypes.add(type))
        relevant.funderTypes.forEach(type => smartFunderTypes.add(type))
      }
    }

    console.log('Fallback foundation strategy:', {
      subjects: Array.from(smartSubjects).slice(0, 10),
      populations: Array.from(smartPopulations).slice(0, 5),
      supportTypes: Array.from(smartSupportTypes),
      funderTypes: Array.from(smartFunderTypes)
    })

    // Create search configurations
    const searchConfigurations: SearchConfiguration[] = []
    
    // Recent grants (last 2 years)
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const fromDate = twoYearsAgo.toISOString().split('T')[0]

    // AI-driven searches
    aiFoundationStrategies.forEach(({ project, userProfile, aiCategories }) => {
      // Subject area searches
      aiCategories.subject_areas?.slice(0, 3).forEach((subject: string) => {
        searchConfigurations.push({
          name: `AI-Subject: ${subject} for ${project.name}`,
          endpoint: 'grants',
          params: {
            subject: [subject],
            award_date_from: fromDate,
            limit: 50,
            offset: 0
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-subject',
            targetCategory: subject
          }
        })
      })

      // Population-specific searches
      aiCategories.populations_served?.slice(0, 2).forEach((population: string) => {
        searchConfigurations.push({
          name: `AI-Population: ${population} for ${project.name}`,
          endpoint: 'grants',
          params: {
            population_served: [population],
            award_date_from: fromDate,
            limit: 30,
            offset: 0
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-population',
            targetPopulation: population
          }
        })
      })

      // Support type searches
      aiCategories.support_types?.slice(0, 2).forEach((supportType: string) => {
        searchConfigurations.push({
          name: `AI-Support: ${supportType} for ${project.name}`,
          endpoint: 'grants',
          params: {
            support_type: supportType,
            award_date_from: fromDate,
            limit: 25,
            offset: 0
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-support',
            targetCategory: supportType
          }
        })
      })

      // Geographic searches for local/state foundations
      if (userProfile.state && aiCategories.geographic_focus?.includes('local')) {
        searchConfigurations.push({
          name: `AI-Geographic: ${userProfile.state} for ${project.name}`,
          endpoint: 'grants',
          params: {
            funder_state: userProfile.state,
            award_date_from: fromDate,
            limit: 40,
            offset: 0
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-geographic',
            targetCategory: userProfile.state
          }
        })
      }
    })

    // Rule-based fallback searches
    if (aiFoundationStrategies.length === 0 || searchConfigurations.length < 5) {
      console.log('Adding rule-based foundation searches...')
      
      // Subject-based searches
      Array.from(smartSubjects).slice(0, 5).forEach(subject => {
        searchConfigurations.push({
          name: `Fallback-Subject: ${subject}`,
          endpoint: 'grants',
          params: {
            subject: [subject],
            award_date_from: fromDate,
            limit: 100,
            offset: 0
          },
          metadata: {
            strategy: 'fallback-subject',
            targetCategory: subject
          }
        })
      })

      // Population-based searches
      Array.from(smartPopulations).slice(0, 3).forEach(population => {
        searchConfigurations.push({
          name: `Fallback-Population: ${population}`,
          endpoint: 'grants',
          params: {
            population_served: [population],
            award_date_from: fromDate,
            limit: 60,
            offset: 0
          },
          metadata: {
            strategy: 'fallback-population',
            targetPopulation: population
          }
        })
      })

      // Funder type searches
      Array.from(smartFunderTypes).slice(0, 2).forEach(funderType => {
        searchConfigurations.push({
          name: `Fallback-FunderType: ${funderType}`,
          endpoint: 'grants',
          params: {
            funder_type: [funderType],
            award_date_from: fromDate,
            limit: 80,
            offset: 0
          },
          metadata: {
            strategy: 'fallback-funder-type',
            targetCategory: funderType
          }
        })
      })
    }

    // Emergency fallback
    if (searchConfigurations.length === 0) {
      searchConfigurations.push({
        name: "Emergency Foundation Search",
        endpoint: 'grants',
        params: {
          award_date_from: fromDate,
          limit: 200,
          offset: 0
        },
        metadata: {
          strategy: 'emergency-fallback'
        }
      })
    }

    console.log(`Executing ${searchConfigurations.length} Candid search configurations...`)

    let allGrants: (CandidGrant & { _aiMetadata?: any })[] = []
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
        
        // Build query parameters
        const queryParams = new URLSearchParams()
        Object.entries(config.params).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            if (Array.isArray(value)) {
              value.forEach(v => queryParams.append(key, v))
            } else {
              queryParams.append(key, value.toString())
            }
          }
        })
        
        const response = await fetch(
          `https://api.candid.org/v1/${config.endpoint}?${queryParams.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${CANDID_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          const grants: CandidGrant[] = data.data || []
          
          console.log(`${config.name}: ${grants.length} grants found`)
          
          searchResults.push({
            name: config.name,
            count: grants.length,
            strategy: config.metadata?.strategy,
            projectId: config.metadata?.projectId
          })

          if (grants.length > 0) {
            const enhancedGrants = grants.map(grant => ({
              ...grant,
              _aiMetadata: config.metadata
            }))

            // Filter duplicates
            const newGrants = enhancedGrants.filter(grant => 
              !allGrants.some(existing => existing.id === grant.id)
            )
            
            allGrants.push(...newGrants)
            console.log(`Added ${newGrants.length} new unique grants`)
          }
        } else {
          console.error(`Candid API error for ${config.name}:`, response.status, response.statusText)
          searchResults.push({
            name: config.name,
            error: `API Error: ${response.status}`,
            strategy: config.metadata?.strategy
          })
        }
      } catch (error) {
        console.error(`Candid search failed for ${config.name}:`, error)
        searchResults.push({
          name: config.name,
          error: (error as Error).message,
          strategy: config.metadata?.strategy
        })
      }
    }

    console.log(`Total unique Candid grants found: ${allGrants.length}`)

    if (allGrants.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No foundation grants found with current search criteria',
        search_results: searchResults
      })
    }

    // Transform to opportunities format
    const processedOpportunities = allGrants.map((grant) => {
      const funderState = grant.funder.state?.toLowerCase()
      const geography = funderState ? [funderState] : ['nationwide']
      
      return {
        external_id: grant.id,
        source: 'candid',
        title: grant.title || 'Foundation Grant Opportunity',
        sponsor: grant.funder.name,
        agency: grant.funder.name,
        description: grant.description || grant.purpose || `Grant from ${grant.funder.name}`,
        amount_min: grant.amount,
        amount_max: grant.amount,
        credit_percentage: null,
        deadline_date: null, // Historical grants, no deadline
        deadline_type: 'rolling',
        match_requirement_percentage: 0,
        eligibility_criteria: ['nonprofit'],
        geography: geography,
        project_types: grant.subject || ['general'],
        organization_types: ['nonprofit'],
        industry_focus: grant.subject || ['general'],
        minority_business: false,
        woman_owned_business: false,
        veteran_owned_business: false,
        small_business_only: false,
        cfda_number: null,
        source_url: `https://candid.org/grants/${grant.id}`,
        application_process: 'Contact funder directly for application guidelines',
        required_documents: ['grant_proposal', 'budget', 'organizational_documents'],
        contact_email: null,
        contact_phone: null,
        competition_level: 'competitive',
        funding_instrument: 'grant',
        raw_data: grant,
        ai_metadata: grant._aiMetadata || null,
        last_updated: new Date().toISOString()
      }
    })

    // Filter valid opportunities
    const validOpportunities = processedOpportunities.filter(opp => {
      return opp.external_id && opp.title && opp.sponsor && opp.amount_min
    })

    console.log(`Processing ${validOpportunities.length} valid foundation opportunities`)

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

    console.log(`Successfully inserted ${inserted?.length || 0} foundation grants`)

    return NextResponse.json({
      success: true,
      imported: inserted?.length || 0,
      message: `Successfully imported ${inserted?.length || 0} foundation grant opportunities`,
      summary: {
        total_fetched: allGrants.length,
        total_processed: processedOpportunities.length,
        total_valid: validOpportunities.length,
        total_imported: inserted?.length || 0,
        ai_strategies_used: aiFoundationStrategies.length,
        total_search_configurations: searchConfigurations.length,
        source: 'candid',
        last_sync: new Date().toISOString()
      },
      ai_insights: aiFoundationStrategies.map(strategy => ({
        project_name: strategy.project.name,
        subject_areas: strategy.aiCategories.subject_areas,
        populations_served: strategy.aiCategories.populations_served,
        support_types: strategy.aiCategories.support_types,
        geographic_focus: strategy.aiCategories.geographic_focus,
        foundation_strategy: strategy.aiCategories.foundation_strategy,
        reasoning: strategy.aiCategories.reasoning
      })),
      search_results: searchResults,
      sample_grants: inserted?.slice(0, 5).map(grant => ({
        title: grant.title,
        amount: grant.amount_min,
        sponsor: grant.sponsor
      })) || []
    })

  } catch (error: any) {
    console.error('Candid sync error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to sync with Candid Foundation API',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}