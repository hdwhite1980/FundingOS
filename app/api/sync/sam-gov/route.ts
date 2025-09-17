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

interface SAMOpportunity {
  noticeId: string
  title: string
  solicitationNumber: string
  department: string
  subTier: string
  office: string
  postedDate: string
  type: string
  baseType: string
  archiveType: string
  archiveDate?: string
  typeOfSetAsideDescription?: string
  typeOfSetAside?: string
  responseDeadLine?: string
  naicsCode?: string
  classificationCode?: string
  active: string
  award?: {
    date: string
    number: string
    amount: string
    awardee: {
      name: string
      location: {
        streetAddress: string
        city: { code: string; name: string }
        state: { code: string }
        zip: string
        country: { code: string }
      }
      ueiSAM: string
    }
  }
  pointOfContact?: Array<{
    fax?: string
    type: string
    email?: string
    phone?: string
    title?: string
    fullName?: string
  }>
  description?: string
  organizationType?: string[]
  officeAddress?: {
    city: string
    state: string
    country: string
  }
}

interface SearchConfiguration {
  name: string;
  params: {
    limit: number;
    api_key: string;
    postedFrom: string;
    postedTo: string;
    ptype?: string; // presol, solicitation, award, etc.
    // Updated parameter names based on API docs
    organizationName?: string; // replaces deptname
    subtier?: string;
    state?: string;
    city?: string;
    title?: string; // replaces keyword
    naics?: string; // changed from naicsCode
    ncode?: string; // alternative NAICS parameter
    typeOfSetAside?: string;
    solnum?: string; // solicitation number search
    offset?: number;
  };
  metadata?: {
    projectId?: string;
    strategy?: string;
    targetKeyword?: string;
    contractType?: string;
  };
}

const SAM_GOV_API_KEY = process.env.SAM_GOV_API_KEY

// Helper function to determine project types from SAM.gov opportunity
function inferProjectTypes(title: string, description: string, naicsCode?: string): string[] {
  const content = (title + ' ' + description).toLowerCase()
  const types = new Set(['contract', 'services']) // Always include these base types
  
  // Technology & IT
  if (content.match(/technology|software|IT|cyber|digital|data|cloud|artificial intelligence|AI|machine learning/)) {
    types.add('technology')
    types.add('research')
  }
  
  // Infrastructure & Construction
  if (content.match(/construction|infrastructure|building|facility|renovation|repair|maintenance|engineering/)) {
    types.add('infrastructure')
    types.add('commercial_development')
  }
  
  // Healthcare & Medical
  if (content.match(/health|medical|hospital|clinical|pharmaceutical|healthcare|patient/)) {
    types.add('healthcare')
  }
  
  // Research & Development
  if (content.match(/research|development|R&D|study|analysis|innovation|scientific|testing/)) {
    types.add('research')
    types.add('technology')
  }
  
  // Environmental & Sustainability
  if (content.match(/environment|green|sustainability|renewable|energy|conservation|climate/)) {
    types.add('environmental')
  }
  
  // Education & Training
  if (content.match(/education|training|learning|academic|university|school|curriculum/)) {
    types.add('education')
  }
  
  // Community Development
  if (content.match(/community|social|development|outreach|public|citizen|municipal/)) {
    types.add('community_development')
  }
  
  return Array.from(types)
}

// Helper function to update daily usage tracking
async function updateDailyUsage(supabase: any, dateStr: string) {
  try {
    const { data, error } = await supabase
      .from('sam_gov_usage')
      .upsert({
        date: dateStr,
        request_count: 1
      }, {
        onConflict: 'date',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      // If upsert failed, try increment
      const { error: incrementError } = await supabase.rpc('increment_sam_usage', {
        usage_date: dateStr
      })
      
      if (incrementError) {
        console.error('Error updating SAM.gov usage:', incrementError)
      }
    }
  } catch (error) {
    console.error('Error in updateDailyUsage:', error)
  }
}

// Map common department names to their full official names
const DEPARTMENT_MAPPINGS = {
  'DOD': 'DEPARTMENT OF DEFENSE',
  'HHS': 'DEPARTMENT OF HEALTH AND HUMAN SERVICES', 
  'GSA': 'GENERAL SERVICES ADMINISTRATION',
  'DHS': 'DEPARTMENT OF HOMELAND SECURITY',
  'DOE': 'DEPARTMENT OF ENERGY',
  'DOT': 'DEPARTMENT OF TRANSPORTATION',
  'VA': 'DEPARTMENT OF VETERANS AFFAIRS',
  'DOJ': 'DEPARTMENT OF JUSTICE',
  'USDA': 'DEPARTMENT OF AGRICULTURE',
  'DOL': 'DEPARTMENT OF LABOR',
  'ED': 'DEPARTMENT OF EDUCATION',
  'HUD': 'DEPARTMENT OF HOUSING AND URBAN DEVELOPMENT',
  'DOI': 'DEPARTMENT OF THE INTERIOR',
  'STATE': 'DEPARTMENT OF STATE',
  'TREASURY': 'DEPARTMENT OF THE TREASURY',
  'DOC': 'DEPARTMENT OF COMMERCE'
}

// Valid Set-Aside codes based on API documentation
const VALID_SET_ASIDES = {
  'SBA': 'SBA', // Total Small Business Set-Aside
  'WOSB': 'WOSB', // Women-Owned Small Business
  'VOSB': 'VSA', // Veteran-Owned Small Business Set-Aside (VA specific)
  'SDVOSB': 'SDVOSBC', // Service-Disabled Veteran-Owned Small Business Set-Aside
  '8A': '8A', // 8(a) Set-Aside
  'HubZone': 'HZC', // HUBZone Set-Aside
  'EDWOSB': 'EDWOSB' // Economically Disadvantaged WOSB
}

async function getAIContractCategories(project: any, userProfile: any) {
  try {
    console.log(`Getting AI contract categories for project: ${project.name}`)
    
    const contractPrompt = `
    Analyze this project for government contract opportunities:
    
    Project: ${project.name}
    Type: ${project.project_type}
    Description: ${project.description}
    Organization: ${userProfile.organization_type}
    Industry: ${userProfile.industry}
    Small Business: ${userProfile.small_business}
    Woman Owned: ${userProfile.woman_owned}
    Veteran Owned: ${userProfile.veteran_owned}
    Minority Owned: ${userProfile.minority_owned}
    
    Return JSON with:
    {
      "contract_types": ["presol", "solicitation", "award"],
      "departments": ["DOD", "HHS", "GSA", "DHS", "DOE", "etc"],
      "naics_codes": ["541511", "541330", "etc"],
      "set_asides": ["SBA", "WOSB", "VOSB", "SDVOSB", "8A", "HubZone"],
      "contract_keywords": ["IT services", "consulting", "construction"],
      "geographic_focus": ["local", "state", "national"],
      "contract_value_range": "micro|small|medium|large",
      "competition_type": "full_open|set_aside|sole_source",
      "reasoning": "explanation"
    }
    `
    
    const aiCategories = await AIService.categorizeForContracts(contractPrompt, project, userProfile)
    
    console.log(`AI contract categories for ${project.name}:`, aiCategories)
    return aiCategories
  } catch (error) {
    console.error('AI contract categorization failed:', error)
    return null
  }
}

function getContractCategories(userProfile: any, userProjects: any[] = []) {
  const departments = new Set<string>()
  const naicsCodes = new Set<string>()
  const setAsides = new Set<string>()
  const keywords = new Set<string>()
  
  // Organization type mappings for contracts
  if (userProfile.organization_type === 'for_profit') {
    keywords.add('professional services')
    keywords.add('consulting')
    keywords.add('technical services')
  }
  
  if (userProfile.organization_type === 'nonprofit') {
    keywords.add('social services')
    keywords.add('training')
    keywords.add('program management')
    departments.add('HHS')
  }
  
  // Small business set-asides
  if (userProfile.small_business) {
    setAsides.add('SBA')
  }
  if (userProfile.woman_owned) {
    setAsides.add('WOSB')
  }
  if (userProfile.veteran_owned) {
    setAsides.add('VOSB')
    setAsides.add('SDVOSB')
  }
  if (userProfile.minority_owned) {
    setAsides.add('8A')
  }
  
  // Industry-specific mappings
  if (userProfile.industry) {
    const industryMappings: Record<
      'technology' | 'healthcare' | 'construction' | 'consulting' | 'education' | 'engineering',
      { departments: string[]; naics: string[]; keywords: string[] }
    > = {
      technology: {
        departments: ['DOD', 'DHS', 'GSA'],
        naics: ['541511', '541512', '541513'], // Computer systems design
        keywords: ['IT services', 'software development', 'cybersecurity']
      },
      healthcare: {
        departments: ['HHS', 'VA'],
        naics: ['621111', '621399'], // Healthcare services
        keywords: ['medical services', 'healthcare consulting', 'clinical research']
      },
      construction: {
        departments: ['GSA', 'DOD', 'DOT'],
        naics: ['236220', '237310'], // Construction
        keywords: ['construction', 'renovation', 'infrastructure']
      },
      consulting: {
        departments: ['DOD', 'DHS', 'DOE'],
        naics: ['541611', '541618'], // Management consulting
        keywords: ['management consulting', 'strategic planning', 'analysis']
      },
      education: {
        departments: ['ED', 'DOD'],
        naics: ['611710', '541612'], // Educational support
        keywords: ['training', 'education services', 'curriculum development']
      },
      engineering: {
        departments: ['DOD', 'DOT', 'DOE'],
        naics: ['541330', '541380'], // Engineering services
        keywords: ['engineering', 'technical services', 'design']
      }
    }
    
    const industryKey = (userProfile.industry as string).toLowerCase() as keyof typeof industryMappings;
    const mapping = industryMappings[industryKey];
    if (mapping) {
      mapping.departments.forEach(dept => departments.add(dept))
      mapping.naics.forEach(naics => naicsCodes.add(naics))
      mapping.keywords.forEach(keyword => keywords.add(keyword))
    }
  }
  
  // Project-specific contract categories
  userProjects.forEach(project => {
    if (project.project_type) {
      const projectMappings = {
        'infrastructure': {
          departments: ['DOT', 'GSA'],
          keywords: ['infrastructure', 'construction', 'maintenance']
        },
        'technology': {
          departments: ['DHS', 'DOD'],
          keywords: ['technology', 'IT services', 'software']
        },
        'research': {
          departments: ['DOD', 'DOE', 'HHS'],
          keywords: ['research', 'development', 'analysis']
        },
        'consulting': {
          departments: ['DOD', 'DHS'],
          keywords: ['consulting', 'advisory', 'strategic planning']
        }
      }
      
      const mapping = projectMappings[project.project_type as keyof typeof projectMappings]
      if (mapping) {
        mapping.departments?.forEach(dept => departments.add(dept))
        mapping.keywords?.forEach(keyword => keywords.add(keyword))
      }
    }
  })
  
  // Default categories if none found
  if (departments.size === 0) {
    departments.add('DOD')
    departments.add('GSA')
    departments.add('HHS')
  }
  
  if (keywords.size === 0) {
    keywords.add('professional services')
    keywords.add('consulting')
  }
  
  return {
    departments: Array.from(departments),
    naicsCodes: Array.from(naicsCodes),
    setAsides: Array.from(setAsides),
    keywords: Array.from(keywords)
  }
}

export async function GET(request: Request) {
  try {
    // Parse request body for automated sync parameters
    const url = new URL(request.url)
    const automated = url.searchParams.get('automated') === 'true'
    const maxSearchesParam = url.searchParams.get('maxSearches')
    const requestedMaxSearches = maxSearchesParam ? parseInt(maxSearchesParam) : null

    console.log(`Starting AI-enhanced SAM.gov sync... ${automated ? '(Automated)' : '(Manual)'}`)
    
    if (!SAM_GOV_API_KEY) {
      throw new Error('SAM_GOV_API_KEY environment variable is required')
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

    // Use AI to determine contract strategies
    const aiContractStrategies: Array<{ project: any; userProfile: any; aiCategories: any }> = []
    
    if (userProjects && userProfiles) {
      for (const project of userProjects) {
        const userProfile = userProfiles.find((p: any) => p.id === project.user_id)
        if (userProfile) {
          const aiCategories = await getAIContractCategories(project, userProfile)
          
          if (aiCategories) {
            aiContractStrategies.push({
              project,
              userProfile,
              aiCategories
            })
          }
        }
      }
    }

    console.log(`AI contract strategies generated: ${aiContractStrategies.length}`)

    // Fallback contract strategy
    const smartDepartments = new Set<string>()
    const smartNaics = new Set<string>()
    const smartSetAsides = new Set<string>()
    const smartKeywords = new Set<string>()

    if (userProfiles) {
      for (const profile of userProfiles) {
        const userProjectsForProfile = userProjects?.filter((p: any) => p.user_id === profile.id) || []
        const relevant = getContractCategories(profile, userProjectsForProfile)
        
        relevant.departments.forEach(dept => smartDepartments.add(dept))
        relevant.naicsCodes.forEach(naics => smartNaics.add(naics))
        relevant.setAsides.forEach(setAside => smartSetAsides.add(setAside))
        relevant.keywords.forEach(keyword => smartKeywords.add(keyword))
      }
    }

    console.log('Fallback contract strategy:', {
      departments: Array.from(smartDepartments),
      naics: Array.from(smartNaics),
      setAsides: Array.from(smartSetAsides),
      keywords: Array.from(smartKeywords).slice(0, 5)
    })

    // Create search configurations with proper API parameters
    let searchConfigurations: SearchConfiguration[] = []
    
    // Recent opportunities (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    // Format as MM/dd/yyyy for SAM.gov API
    const fromDate = `${(thirtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}/${thirtyDaysAgo.getDate().toString().padStart(2, '0')}/${thirtyDaysAgo.getFullYear()}`
    
    const today = new Date()
    const toDate = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`

    // AI-driven searches
    aiContractStrategies.forEach(({ project, userProfile, aiCategories }) => {
      // Department-specific searches using organizationName
      aiCategories.departments?.slice(0, 3).forEach((department: string) => {
        const fullDeptName = DEPARTMENT_MAPPINGS[department as keyof typeof DEPARTMENT_MAPPINGS] || department
        searchConfigurations.push({
          name: `AI-Department: ${department} for ${project.name}`,
          params: {
            limit: 50,
            api_key: SAM_GOV_API_KEY,
            postedFrom: fromDate,
            postedTo: toDate,
            organizationName: fullDeptName,
            ptype: 'o', // solicitations only
            offset: 0
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-department',
            targetKeyword: department,
            contractType: 'solicitation'
          }
        })
      })

      // Set-aside specific searches
      aiCategories.set_asides?.slice(0, 2).forEach((setAside: string) => {
        const validSetAside = VALID_SET_ASIDES[setAside as keyof typeof VALID_SET_ASIDES] || setAside
        searchConfigurations.push({
          name: `AI-SetAside: ${setAside} for ${project.name}`,
          params: {
            limit: 30,
            api_key: SAM_GOV_API_KEY,
            postedFrom: fromDate,
            postedTo: toDate,
            typeOfSetAside: validSetAside,
            ptype: 'o',
            offset: 0
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-set-aside',
            targetKeyword: setAside,
            contractType: 'set-aside'
          }
        })
      })

      // NAICS code searches
      aiCategories.naics_codes?.slice(0, 2).forEach((naics: string) => {
        searchConfigurations.push({
          name: `AI-NAICS: ${naics} for ${project.name}`,
          params: {
            limit: 25,
            api_key: SAM_GOV_API_KEY,
            postedFrom: fromDate,
            postedTo: toDate,
            ncode: naics, // Using ncode parameter
            ptype: 'o',
            offset: 0
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-naics',
            targetKeyword: naics,
            contractType: 'naics-specific'
          }
        })
      })

      // Keyword searches using title parameter
      aiCategories.contract_keywords?.slice(0, 2).forEach((keyword: string) => {
        searchConfigurations.push({
          name: `AI-Keyword: ${keyword} for ${project.name}`,
          params: {
            limit: 20,
            api_key: SAM_GOV_API_KEY,
            postedFrom: fromDate,
            postedTo: toDate,
            title: keyword, // Using title parameter for keyword search
            ptype: 'o',
            offset: 0
          },
          metadata: {
            projectId: project.id,
            strategy: 'ai-keyword',
            targetKeyword: keyword,
            contractType: 'keyword-based'
          }
        })
      })
    })

    // Rule-based fallback searches
    if (aiContractStrategies.length === 0 || searchConfigurations.length < 5) {
      console.log('Adding rule-based contract searches...')
      
      // Department-based searches
      Array.from(smartDepartments).slice(0, 3).forEach(department => {
        const fullDeptName = DEPARTMENT_MAPPINGS[department as keyof typeof DEPARTMENT_MAPPINGS] || department
        searchConfigurations.push({
          name: `Fallback-Department: ${department}`,
          params: {
            limit: 100,
            api_key: SAM_GOV_API_KEY,
            postedFrom: fromDate,
            postedTo: toDate,
            organizationName: fullDeptName,
            ptype: 'o',
            offset: 0
          },
          metadata: {
            strategy: 'fallback-department',
            targetKeyword: department,
            contractType: 'solicitation'
          }
        })
      })

      // Set-aside searches
      Array.from(smartSetAsides).slice(0, 2).forEach(setAside => {
        const validSetAside = VALID_SET_ASIDES[setAside as keyof typeof VALID_SET_ASIDES] || setAside
        searchConfigurations.push({
          name: `Fallback-SetAside: ${setAside}`,
          params: {
            limit: 60,
            api_key: SAM_GOV_API_KEY,
            postedFrom: fromDate,
            postedTo: toDate,
            typeOfSetAside: validSetAside,
            ptype: 'o',
            offset: 0
          },
          metadata: {
            strategy: 'fallback-set-aside',
            targetKeyword: setAside,
            contractType: 'set-aside'
          }
        })
      })

      // Keyword searches
      Array.from(smartKeywords).slice(0, 3).forEach(keyword => {
        searchConfigurations.push({
          name: `Fallback-Keyword: ${keyword}`,
          params: {
            limit: 40,
            api_key: SAM_GOV_API_KEY,
            postedFrom: fromDate,
            postedTo: toDate,
            title: keyword,
            ptype: 'o',
            offset: 0
          },
          metadata: {
            strategy: 'fallback-keyword',
            targetKeyword: keyword,
            contractType: 'keyword-based'
          }
        })
      })
    }

    // Emergency fallback - broad search
    if (searchConfigurations.length === 0) {
      searchConfigurations.push({
        name: "Emergency Contract Search",
        params: {
          limit: 200,
          api_key: SAM_GOV_API_KEY,
          postedFrom: fromDate,
          postedTo: toDate,
          ptype: 'o',
          offset: 0
        },
        metadata: {
          strategy: 'emergency-fallback',
          contractType: 'all'
        }
      })
    }

    // Implement non-federal rate limiting (10 requests per day)
    const dailyLimit = 10
    const todayDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Check current daily usage
    const { data: dailyUsage, error: usageError } = await supabase
      .from('sam_gov_usage')
      .select('request_count')
      .eq('date', todayDate)
      .maybeSingle()
      
    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error checking SAM.gov usage:', usageError)
    }
    
    const currentUsage = dailyUsage?.request_count || 0
    const remainingRequests = dailyLimit - currentUsage
    
    console.log(`SAM.gov daily usage: ${currentUsage}/${dailyLimit} requests`)
    
    if (remainingRequests <= 0) {
      console.warn('SAM.gov daily rate limit exceeded')
      return NextResponse.json({
        success: false,
        message: 'SAM.gov daily rate limit exceeded (10 requests per day for non-federal users)',
        dailyUsage: currentUsage,
        dailyLimit: dailyLimit,
        nextResetTime: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
      }, { status: 429 })
    }

    // Limit total searches to available requests and automation constraints
    let maxSearches = Math.min(searchConfigurations.length, remainingRequests)
    
    // Apply automated sync constraints
    if (requestedMaxSearches !== null) {
      maxSearches = Math.min(maxSearches, requestedMaxSearches)
      console.log(`Applying automated search limit: ${requestedMaxSearches}`)
    }
    
    if (searchConfigurations.length > maxSearches) {
      console.log(`Limiting searches from ${searchConfigurations.length} to ${maxSearches} due to rate limiting and automation constraints`)
      searchConfigurations = searchConfigurations.slice(0, maxSearches)
    }

    console.log(`Executing ${searchConfigurations.length} SAM.gov search configurations with rate limiting...`)

    let allOpportunities: (SAMOpportunity & { _aiMetadata?: any })[] = []
    let searchResults: Array<{
      name: string
      count?: number
      error?: string
      strategy?: string
      projectId?: string
      url?: string
    }> = []

    // Rate limiting function
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    // Track rate limit status
    let rateLimitHit = false
    let baseDelay = 1000 // Start with 1 second delay

    // Execute searches with proper URL construction and rate limiting
    for (let i = 0; i < searchConfigurations.length; i++) {
      const config = searchConfigurations[i]
      try {
        console.log(`Executing ${i + 1}/${searchConfigurations.length}: ${config.name}`)
        
        // Implement exponential backoff if we've hit rate limits
        if (rateLimitHit) {
          console.log(`Rate limit detected, waiting ${baseDelay}ms...`)
          await delay(baseDelay)
          baseDelay = Math.min(baseDelay * 1.5, 10000) // Cap at 10 seconds
        } else {
          // Standard delay to be respectful
          await delay(500)
        }
        
        // Build query parameters properly
        const queryParams = new URLSearchParams()
        Object.entries(config.params).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && value !== null) {
            queryParams.append(key, value.toString())
          }
        })
        
        // Use the correct v2 endpoint URL
        const apiUrl = `https://api.sam.gov/prod/opportunities/v2/search?${queryParams.toString()}`
        console.log(`API URL: ${apiUrl}`)
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SAM-Opportunity-Sync/1.0'
          }
        })

        if (response.ok) {
          const data = await response.json()
          const opportunities: SAMOpportunity[] = data.opportunitiesData || []
          
          console.log(`${config.name}: ${opportunities.length} opportunities found`)
          
          searchResults.push({
            name: config.name,
            count: opportunities.length,
            strategy: config.metadata?.strategy,
            projectId: config.metadata?.projectId,
            url: apiUrl.replace(SAM_GOV_API_KEY, '[REDACTED]')
          })

          if (opportunities.length > 0) {
            const enhancedOpportunities = opportunities.map(opp => ({
              ...opp,
              _aiMetadata: config.metadata
            }))

            // Filter duplicates
            const newOpportunities = enhancedOpportunities.filter(opp => 
              !allOpportunities.some(existing => existing.noticeId === opp.noticeId)
            )
            
            allOpportunities.push(...newOpportunities)
            console.log(`Added ${newOpportunities.length} new unique opportunities`)
          }
          
          // Reset rate limit tracking on success
          rateLimitHit = false
          baseDelay = 1000
          
          // Track successful API usage for daily rate limiting
          await updateDailyUsage(supabase, todayDate)
          
        } else if (response.status === 429) {
          // Rate limit hit
          console.warn(`Rate limit hit for ${config.name}, implementing backoff`)
          rateLimitHit = true
          baseDelay = Math.min(baseDelay * 2, 30000) // Cap at 30 seconds
          
          searchResults.push({
            name: config.name,
            error: `Rate limit exceeded - will retry with backoff`,
            strategy: config.metadata?.strategy,
            url: apiUrl.replace(SAM_GOV_API_KEY, '[REDACTED]')
          })
          
          // Skip remaining requests if we're consistently hitting rate limits
          if (baseDelay >= 30000) {
            console.warn(`Severe rate limiting detected, stopping additional requests`)
            break
          }
          
        } else {
          const errorText = await response.text()
          console.error(`SAM.gov API error for ${config.name}:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            url: apiUrl.replace(SAM_GOV_API_KEY, '[REDACTED]')
          })
          
          searchResults.push({
            name: config.name,
            error: `API Error: ${response.status} - ${errorText.substring(0, 200)}`,
            strategy: config.metadata?.strategy,
            url: apiUrl.replace(SAM_GOV_API_KEY, '[REDACTED]')
          })
        }
      } catch (error) {
        console.error(`SAM.gov search failed for ${config.name}:`, error)
        searchResults.push({
          name: config.name,
          error: (error as Error).message,
          strategy: config.metadata?.strategy
        })
      }
    }

    console.log(`Total unique SAM.gov opportunities found: ${allOpportunities.length}`)

    if (allOpportunities.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No contract opportunities found with current search criteria',
        search_results: searchResults
      })
    }

    // Transform to opportunities format
    const processedOpportunities = allOpportunities.map((opp) => {
      const contact = opp.pointOfContact?.[0]
      const awardAmount = opp.award?.amount ? parseFloat(opp.award.amount) : null
      const responseDeadline = opp.responseDeadLine ? new Date(opp.responseDeadLine).toISOString() : null
      
      return {
        external_id: opp.noticeId,
        source: 'sam_gov',
        title: opp.title || 'Government Contract Opportunity',
        sponsor: opp.department,
        agency: opp.subTier || opp.office || opp.department,
        description: opp.description || `Contract opportunity: ${opp.title}`,
        amount_min: awardAmount,
        amount_max: awardAmount,
        credit_percentage: null,
        deadline_date: responseDeadline,
        deadline_type: responseDeadline ? 'fixed' : 'rolling',
        match_requirement_percentage: 0,
        eligibility_criteria: opp.organizationType || ['for_profit'],
        geography: opp.officeAddress?.state ? [opp.officeAddress.state.toLowerCase()] : ['nationwide'],
        project_types: inferProjectTypes(opp.title || '', opp.description || '', opp.naicsCode),
        organization_types: ['for_profit', 'nonprofit'],
        industry_focus: opp.naicsCode ? [opp.naicsCode] : ['general'],
        minority_business: opp.typeOfSetAside?.includes('8A') || false,
        woman_owned_business: opp.typeOfSetAside?.includes('WOSB') || false,
        veteran_owned_business: opp.typeOfSetAside?.includes('VSA') || opp.typeOfSetAside?.includes('SDVOSBC') || false,
        small_business_only: opp.typeOfSetAside?.includes('SBA') || false,
        cfda_number: null,
        source_url: `https://sam.gov/opp/${opp.noticeId}/view`,
        application_process: 'See SAM.gov for detailed submission requirements',
        required_documents: ['technical_proposal', 'price_proposal', 'past_performance'],
        contact_email: contact?.email || null,
        contact_phone: contact?.phone || null,
        competition_level: opp.typeOfSetAside ? 'set_aside' : 'competitive',
        funding_instrument: 'contract',
        raw_data: opp,
        ai_metadata: opp._aiMetadata || null,
        last_updated: new Date().toISOString()
      }
    })

    // Filter valid opportunities
    const validOpportunities = processedOpportunities.filter(opp => {
      return opp.external_id && opp.title && opp.sponsor
    })

    console.log(`Processing ${validOpportunities.length} valid contract opportunities`)

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

    console.log(`Successfully inserted ${inserted?.length || 0} contract opportunities`)

    // Get updated usage info for response
    const { data: finalUsage } = await supabase
      .from('sam_gov_usage')
      .select('request_count')
      .eq('date', todayDate)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      imported: inserted?.length || 0,
      message: `Successfully imported ${inserted?.length || 0} government contract opportunities`,
      dailyUsage: finalUsage?.request_count || 0,
      dailyLimit: 10,
      summary: {
        total_fetched: allOpportunities.length,
        total_processed: processedOpportunities.length,
        total_valid: validOpportunities.length,
        total_imported: inserted?.length || 0,
        ai_strategies_used: aiContractStrategies.length,
        total_search_configurations: searchConfigurations.length,
        source: 'sam_gov',
        last_sync: new Date().toISOString(),
        automated: automated
      },
      ai_insights: aiContractStrategies.map(strategy => ({
        project_name: strategy.project.name,
        contract_types: strategy.aiCategories.contract_types,
        departments: strategy.aiCategories.departments,
        naics_codes: strategy.aiCategories.naics_codes,
        set_asides: strategy.aiCategories.set_asides,
        contract_keywords: strategy.aiCategories.contract_keywords,
        reasoning: strategy.aiCategories.reasoning
      })),
      search_results: searchResults,
      sample_contracts: inserted?.slice(0, 5).map((contract: any) => ({
        title: contract.title,
        amount: contract.amount_min,
        sponsor: contract.sponsor
      })) || []
    })

  } catch (error: any) {
    console.error('SAM.gov sync error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to sync with SAM.gov API',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}