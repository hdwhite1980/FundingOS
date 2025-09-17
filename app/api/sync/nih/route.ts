import { createClient } from '@supabase/supabase-js'
import AIService from '../../../../lib/aiService'
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

interface NIHProject {
  core_project_num: string
  project_title: string
  organization: {
    org_name: string
    org_city: string
    org_state: string
    org_country: string
  }
  principal_investigators: Array<{
    first_name: string
    last_name: string
    email?: string
  }>
  project_start_date: string
  project_end_date: string
  award_amount: number
  fiscal_year: number
  agency_ic_admin: {
    name: string
  }
  project_terms?: string[]
  abstract_text?: string
  award_notice_date?: string
  funding_mechanism?: string
  subproject_id?: string
}

interface SearchConfiguration {
  name: string;
  criteria: {
    limit: number;
    offset: number;
    text_search?: {
      search_field: string;
      search_text: string;
    };
    date_range?: {
      from_date: string;
      to_date: string;
    };
    award_amount_range?: {
      min_amount: number;
      max_amount: number;
    };
    agencies?: string[];
    project_nums?: string[];
    fiscal_years?: number[];
  };
  metadata?: {
    projectId?: string;
    strategy?: string;
    targetKeyword?: string;
    healthFocus?: string;
  };
}

async function getAIHealthCategories(project: any, userProfile: any) {
  try {
    console.log(`Getting AI health categories for project: ${project.name}`)
    
    const healthPrompt = `
    Analyze this project for NIH health research opportunities:
    
    Project: ${project.name}
    Type: ${project.project_type}
    Description: ${project.description}
    Industry: ${userProfile.industry}
    Organization: ${userProfile.organization_type}
    
    Return JSON with:
    {
      "health_keywords": ["medical terms", "disease areas", "health conditions"],
      "research_types": ["basic", "clinical", "translational", "behavioral"],
      "nih_institutes": ["NCI", "NHLBI", "NIMH", "NIDA", "NIAID", "etc"],
      "target_populations": ["pediatric", "adult", "elderly", "women", "minorities"],
      "research_methods": ["clinical trial", "epidemiology", "genomics", "imaging"],
      "funding_mechanisms": ["R01", "R21", "R03", "SBIR", "STTR"],
      "health_focus_area": "cancer|heart|mental_health|infectious_disease|etc",
      "reasoning": "explanation"
    }
    `
    
    const aiCategories = await AIService.categorizeForHealth(healthPrompt, project, userProfile)
    
    console.log(`AI health categories for ${project.name}:`, aiCategories)
    return aiCategories
  } catch (error) {
    console.error('AI health categorization failed:', error)
    return null
  }
}

function getHealthCategories(userProfile: any, userProjects: any[] = []) {
  const keywords = new Set<string>()
  const institutes = new Set<string>()
  
  // Health-focused keywords based on organization type
  if (userProfile.organization_type === 'healthcare' || userProfile.organization_type === 'nonprofit') {
    keywords.add('health')
    keywords.add('medical')
    keywords.add('clinical')
    keywords.add('patient care')
    keywords.add('public health')
  }
  
  if (userProfile.organization_type === 'university') {
    keywords.add('research')
    keywords.add('biomedical')
    keywords.add('clinical trial')
    keywords.add('basic science')
  }
  
  if (userProfile.organization_type === 'for_profit') {
    keywords.add('drug development')
    keywords.add('medical device')
    keywords.add('biotechnology')
    keywords.add('pharmaceutical')
    keywords.add('SBIR')
    keywords.add('STTR')
  }
  
  // Industry-specific health keywords
  if (userProfile.industry) {
    const industryMappings = {
      'healthcare': {
        keywords: ['healthcare delivery', 'patient outcomes', 'quality improvement'],
        institutes: ['AHRQ', 'NLM']
      },
      'biotechnology': {
        keywords: ['genomics', 'proteomics', 'personalized medicine', 'biomarkers'],
        institutes: ['NHGRI', 'NCI', 'NIMH']
      },
      'pharmaceuticals': {
        keywords: ['drug discovery', 'therapeutics', 'clinical trials'],
        institutes: ['NCI', 'NHLBI', 'NIMH', 'NIDA']
      },
      'medical_devices': {
        keywords: ['medical technology', 'diagnostics', 'imaging'],
        institutes: ['NIBIB', 'NHLBI']
      },
      'mental_health': {
        keywords: ['mental health', 'behavioral health', 'psychology'],
        institutes: ['NIMH', 'NIDA', 'NIAAA']
      },
      'aging': {
        keywords: ['aging', 'geriatrics', 'alzheimer', 'dementia'],
        institutes: ['NIA']
      }
    }
    
    const mapping = industryMappings[userProfile.industry.toLowerCase()]
    if (mapping) {
      mapping.keywords.forEach(keyword => keywords.add(keyword))
      mapping.institutes.forEach(institute => institutes.add(institute))
    }
  }
  
  // Project-specific health keywords
  userProjects.forEach(project => {
    if (project.description) {
      const healthTerms = [
        'cancer', 'diabetes', 'heart disease', 'mental health', 'alzheimer',
        'covid', 'vaccine', 'treatment', 'therapy', 'clinical',
        'biomedical', 'genomics', 'precision medicine', 'AI in healthcare'
      ]
      
      healthTerms.forEach(term => {
        if (project.description.toLowerCase().includes(term.toLowerCase())) {
          keywords.add(term)
        }
      })
    }
    
    // Add health-related project types
    if (project.project_type) {
      const healthProjectMappings = {
        'healthcare': ['health services', 'patient care'],
        'medical_research': ['biomedical research', 'clinical research'],
        'mental_health': ['mental health', 'behavioral intervention'],
        'public_health': ['public health', 'epidemiology', 'prevention']
      }
      
      const mapping = healthProjectMappings[project.project_type]
      if (mapping) {
        mapping.forEach(keyword => keywords.add(keyword))
      }
    }
  })
  
  // Default health keywords if none found
  if (keywords.size === 0) {
    keywords.add('health')
    keywords.add('biomedical')
    keywords.add('research')
  }
  
  // Default institutes if none specified
  if (institutes.size === 0) {
    institutes.add('NCI') // Cancer
    institutes.add('NHLBI') // Heart, Lung, Blood
    institutes.add('NIMH') // Mental Health
  }
  
  return {
    keywords: Array.from(keywords),
    institutes: Array.from(institutes)
  }
}

export async function GET(request: Request) {
  try {
    console.log('Starting AI-enhanced NIH RePORTER sync...')
    
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

    // Use AI to determine health research strategies
    const aiHealthStrategies: Array<{ project: any; userProfile: any; aiCategories: any }> = []
    
    if (userProjects && userProfiles) {
      for (const project of userProjects) {
        const userProfile = userProfiles.find(p => p.id === project.user_id)
        if (userProfile) {
          const aiCategories = await getAIHealthCategories(project, userProfile)
          
          if (aiCategories) {
            aiHealthStrategies.push({
              project,
              userProfile,
              aiCategories
            })
          }
        }
      }
    }

    console.log(`AI health strategies generated: ${aiHealthStrategies.length}`)

    // Fallback health strategy
    const smartKeywords = new Set<string>()
    const smartInstitutes = new Set<string>()

    if (userProfiles) {
      for (const profile of userProfiles) {
        const userProjectsForProfile = userProjects?.filter(p => p.user_id === profile.id) || []
        const relevant = getHealthCategories(profile, userProjectsForProfile)
        
        relevant.keywords.forEach(keyword => smartKeywords.add(keyword))
        relevant.institutes.forEach(institute => smartInstitutes.add(institute))
      }
    }

    console.log('Fallback health strategy:', {
      keywords: Array.from(smartKeywords).slice(0, 10),
      institutes: Array.from(smartInstitutes)
    })

    // Create search configurations
    const searchConfigurations: SearchConfiguration[] = []
    
    // Recent awards only (last 3 years for health research trends)
    const currentYear = new Date().getFullYear()
    const threeYearsAgo = currentYear - 3

    // AI-driven searches
    aiHealthStrategies.forEach(({ project, aiCategories }) => {
      // Health keyword searches
      aiCategories.health_keywords?.slice(0, 3).forEach((keyword: string) => {
        searchConfigurations.push({
          name: `AI-Health: ${keyword} for ${project.name}`,
          criteria: {
            limit: 50,
            offset: 0,
            text_search: {
              search_field: "projecttitle,terms,abstracttext",
              search_text: keyword
            },
            fiscal_years: [currentYear, currentYear - 1, currentYear - 2]
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-health',
            targetKeyword: keyword,
            healthFocus: aiCategories.health_focus_area
          }
        })
      })

      // NIH institute-specific searches
      aiCategories.nih_institutes?.slice(0, 2).forEach((institute: string) => {
        searchConfigurations.push({
          name: `AI-Institute: ${institute} for ${project.name}`,
          criteria: {
            limit: 30,
            offset: 0,
            agencies: [institute],
            fiscal_years: [currentYear, currentYear - 1]
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-institute',
            targetKeyword: institute
          }
        })
      })

      // Research method searches
      aiCategories.research_methods?.slice(0, 2).forEach((method: string) => {
        searchConfigurations.push({
          name: `AI-Method: ${method} for ${project.name}`,
          criteria: {
            limit: 25,
            offset: 0,
            text_search: {
              search_field: "abstracttext,terms",
              search_text: method
            },
            fiscal_years: [currentYear, currentYear - 1]
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-method',
            targetKeyword: method
          }
        })
      })
    })

    // Rule-based fallback searches
    if (aiHealthStrategies.length === 0 || searchConfigurations.length < 5) {
      console.log('Adding rule-based health searches...')
      
      // Keyword-based searches
      Array.from(smartKeywords).slice(0, 5).forEach(keyword => {
        searchConfigurations.push({
          name: `Fallback-Health: ${keyword}`,
          criteria: {
            limit: 100,
            offset: 0,
            text_search: {
              search_field: "projecttitle,terms,abstracttext",
              search_text: keyword
            },
            fiscal_years: [currentYear, currentYear - 1, currentYear - 2]
          },
          metadata: {
            strategy: 'fallback-health',
            targetKeyword: keyword
          }
        })
      })

      // Institute-based searches
      Array.from(smartInstitutes).slice(0, 3).forEach(institute => {
        searchConfigurations.push({
          name: `Fallback-Institute: ${institute}`,
          criteria: {
            limit: 80,
            offset: 0,
            agencies: [institute],
            fiscal_years: [currentYear, currentYear - 1]
          },
          metadata: {
            strategy: 'fallback-institute',
            targetKeyword: institute
          }
        })
      })
    }

    // Emergency fallback
    if (searchConfigurations.length === 0) {
      searchConfigurations.push({
        name: "Emergency Health Search",
        criteria: {
          limit: 200,
          offset: 0,
          text_search: {
            search_field: "projecttitle,terms",
            search_text: "health research"
          },
          fiscal_years: [currentYear, currentYear - 1]
        },
        metadata: {
          strategy: 'emergency-fallback'
        }
      })
    }

    console.log(`Executing ${searchConfigurations.length} NIH search configurations...`)

    let allProjects: (NIHProject & { _aiMetadata?: any })[] = []
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
        
        const response = await fetch(
          'https://api.reporter.nih.gov/v2/projects/search',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config.criteria)
          }
        )

        if (response.ok) {
          const data = await response.json()
          const projects: NIHProject[] = data.results || []
          
          console.log(`${config.name}: ${projects.length} projects found`)
          
          searchResults.push({
            name: config.name,
            count: projects.length,
            strategy: config.metadata?.strategy,
            projectId: config.metadata?.projectId
          })

          if (projects.length > 0) {
            const enhancedProjects = projects.map(project => ({
              ...project,
              _aiMetadata: config.metadata
            }))

            // Filter duplicates
            const newProjects = enhancedProjects.filter(project => 
              !allProjects.some(existing => existing.core_project_num === project.core_project_num)
            )
            
            allProjects.push(...newProjects)
            console.log(`Added ${newProjects.length} new unique projects`)
          }
        }
      } catch (error) {
        console.error(`NIH search failed for ${config.name}:`, error)
        searchResults.push({
          name: config.name,
          error: (error as Error).message,
          strategy: config.metadata?.strategy
        })
      }
    }

    console.log(`Total unique NIH projects found: ${allProjects.length}`)

    if (allProjects.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No NIH projects found with current search criteria',
        search_results: searchResults
      })
    }

    // Transform to opportunities format
    const processedOpportunities = allProjects.map((project) => {
      const pi = project.principal_investigators?.[0]
      const piName = pi ? `${pi.first_name} ${pi.last_name}` : 'Unknown PI'
      
      return {
        external_id: project.core_project_num,
        source: 'nih',
        title: project.project_title || 'NIH Research Project',
        sponsor: 'National Institutes of Health',
        agency: project.agency_ic_admin?.name || 'NIH',
        description: `NIH Project: ${project.project_title}${project.abstract_text ? `\n\n${project.abstract_text}` : ''}`,
        amount_min: project.award_amount || null,
        amount_max: project.award_amount || null,
        credit_percentage: null,
        deadline_date: null, // NIH projects are historical awards
        deadline_type: 'rolling',
        match_requirement_percentage: 0,
        eligibility_criteria: ['university', 'research_institution', 'healthcare'],
        geography: project.organization?.org_state ? [project.organization.org_state.toLowerCase()] : ['nationwide'],
        project_types: ['research', 'clinical', 'biomedical'],
        organization_types: ['university', 'nonprofit', 'healthcare', 'for_profit'],
        industry_focus: ['healthcare', 'biomedical', 'research'],
        minority_business: false,
        woman_owned_business: false,
        veteran_owned_business: false,
        small_business_only: false,
        cfda_number: null,
        source_url: `https://reporter.nih.gov/project-details/${project.core_project_num}`,
        application_process: 'See NIH funding opportunities for similar programs',
        required_documents: ['research_proposal', 'budget', 'biographical_sketch'],
        contact_email: pi?.email || null,
        contact_phone: null,
        competition_level: 'competitive',
        funding_instrument: project.funding_mechanism || 'grant',
        raw_data: project,
        ai_metadata: project._aiMetadata || null,
        last_updated: new Date().toISOString()
      }
    })

    // Filter valid opportunities
    const validOpportunities = processedOpportunities.filter(opp => {
      return opp.external_id && opp.title && opp.sponsor
    })

    console.log(`Processing ${validOpportunities.length} valid NIH opportunities`)

    // Store in database using service role client (bypasses RLS)
    const { data: inserted, error } = await supabaseServiceRole
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

    console.log(`Successfully inserted ${inserted?.length || 0} NIH projects`)

    return NextResponse.json({
      success: true,
      imported: inserted?.length || 0,
      message: `Successfully imported ${inserted?.length || 0} NIH research projects`,
      summary: {
        total_fetched: allProjects.length,
        total_processed: processedOpportunities.length,
        total_valid: validOpportunities.length,
        total_imported: inserted?.length || 0,
        ai_strategies_used: aiHealthStrategies.length,
        total_search_configurations: searchConfigurations.length,
        source: 'nih',
        last_sync: new Date().toISOString()
      },
      ai_insights: aiHealthStrategies.map(strategy => ({
        project_name: strategy.project.name,
        health_keywords: strategy.aiCategories.health_keywords,
        nih_institutes: strategy.aiCategories.nih_institutes,
        health_focus_area: strategy.aiCategories.health_focus_area,
        research_types: strategy.aiCategories.research_types,
        reasoning: strategy.aiCategories.reasoning
      })),
      search_results: searchResults,
      sample_projects: inserted?.slice(0, 5).map(project => ({
        title: project.title,
        amount: project.amount_min,
        sponsor: project.sponsor
      })) || []
    })

  } catch (error: any) {
    console.error('NIH sync error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to sync with NIH RePORTER API',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}