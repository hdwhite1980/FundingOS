import { supabase } from '../../../../lib/supabase'
import { NextResponse } from 'next/server'

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

// Smart category mapping based on user profile
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

  // Based on user projects
  userProjects.forEach(project => {
    if (project.project_type) {
      const projectMappings = {
        'community_development': { cats: ['CD', 'HL'], keywords: ['community', 'development'] },
        'infrastructure': { cats: ['CD', 'EN'], keywords: ['infrastructure', 'transportation'] },
        'healthcare': { cats: ['HL'], keywords: ['health', 'medical'] },
        'education': { cats: ['ED'], keywords: ['education', 'training'] },
        'environmental': { cats: ['EN', 'AG'], keywords: ['environment', 'energy'] },
        'research': { cats: ['ST', 'HL'], keywords: ['research', 'innovation'] }
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
    console.log('Starting smart Grants.gov sync based on user profiles...')

    // Get user profiles to understand what opportunities are relevant
    const { data: userProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')

    if (profileError) {
      console.error('Error fetching user profiles:', profileError)
    }

    // Get user projects to understand project types
    const { data: userProjects, error: projectError } = await supabase
      .from('projects')
      .select('*')

    if (projectError) {
      console.error('Error fetching user projects:', projectError)
    }

    // Analyze all users to determine smart search strategy
    const allRelevantData = new Set<string>()
    const smartCategories = new Set<string>()
    const smartAgencies = new Set<string>()
    const smartKeywords = new Set<string>()

    // Process each user's profile and projects
    if (userProfiles) {
      for (const profile of userProfiles) {
        const userProjectsForProfile = userProjects?.filter(p => p.user_id === profile.id) || []
        const relevant = getRelevantCategories(profile, userProjectsForProfile)
        
        relevant.categories.forEach(cat => smartCategories.add(cat))
        relevant.agencies.forEach(agency => smartAgencies.add(agency))
        relevant.keywords.forEach(keyword => smartKeywords.add(keyword))
      }
    }

    console.log('Smart search strategy:', {
      categories: Array.from(smartCategories),
      agencies: Array.from(smartAgencies).slice(0, 5),
      keywords: Array.from(smartKeywords).slice(0, 10)
    })

    // Create smart search configurations based on user data
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
    }
    const searchConfigurations: SearchConfiguration[] = []

    // Category-based searches
    Array.from(smartCategories).forEach(category => {
      searchConfigurations.push({
        name: `Category: ${category}`,
        params: {
          rows: 100,
          oppStatuses: "posted",
          fundingCategories: category,
          keyword: "",
          agencies: "",
          eligibilities: "",
          aln: "",
        }
      })
    })

    // Agency-based searches
    Array.from(smartAgencies).slice(0, 5).forEach(agency => {
      searchConfigurations.push({
        name: `Agency: ${agency}`,
        params: {
          rows: 100,
          oppStatuses: "posted",
          agencies: agency,
          fundingCategories: "",
          keyword: "",
          eligibilities: "",
          aln: "",
        }
      })
    })

    // Keyword-based searches for top keywords
    Array.from(smartKeywords).slice(0, 3).forEach(keyword => {
      searchConfigurations.push({
        name: `Keyword: ${keyword}`,
        params: {
          rows: 50,
          oppStatuses: "posted",
          keyword: keyword,
          agencies: "",
          eligibilities: "",
          aln: "",
          fundingCategories: ""
        }
      })
    })

    // Fallback broad search if no specific criteria
    if (searchConfigurations.length === 0) {
      searchConfigurations.push({
        name: "Broad Search",
        params: {
          rows: 200,
          oppStatuses: "posted",
          keyword: "",
          agencies: "",
          eligibilities: "",
          aln: "",
          fundingCategories: ""
        }
      })
    }

    let allOpportunities: GrantsGovOpportunity[] = []
    let searchResults: Array<{
      name: string
      count?: number
      errorcode?: any
      message?: any
      error?: string
    }> = []

    console.log(`Executing ${searchConfigurations.length} smart search configurations...`)

    for (const config of searchConfigurations) {
      try {
        console.log(`Trying ${config.name} search...`)
        
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
          
          console.log(`${config.name} search: ${opportunities.length} opportunities found`)
          
          searchResults.push({
            name: config.name,
            count: opportunities.length,
            errorcode: data.errorcode,
            message: data.msg
          })

          if (opportunities.length > 0) {
            // Add unique opportunities (avoid duplicates)
            const newOpportunities = opportunities.filter(opp => 
              !allOpportunities.some(existing => existing.id === opp.id)
            )
            allOpportunities.push(...newOpportunities)
            
            console.log(`Added ${newOpportunities.length} new unique opportunities`)
          }
        }
      } catch (error) {
        console.error(`${config.name} search failed:`, error)
        searchResults.push({
          name: config.name,
          error: error.message
        })
      }
    }

    console.log(`Total unique opportunities found: ${allOpportunities.length}`)

    if (allOpportunities.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No opportunities found with smart search criteria',
        search_results: searchResults,
        strategy: {
          categories: Array.from(smartCategories),
          agencies: Array.from(smartAgencies),
          keywords: Array.from(smartKeywords)
        }
      })
    }

    // Transform data to match your exact schema with null handling
    console.log('Processing opportunities for database insertion...')
    const processedOpportunities = allOpportunities.map((opp: GrantsGovOpportunity) => {
      // Handle null/undefined sponsor with multiple fallbacks
      const sponsor = opp.agencyName || 
                    opp.agencyCode || 
                    opp.agency || 
                    'Federal Agency'
      
      // Ensure we have valid required fields
      const title = opp.title || 'Untitled Grant Opportunity'
      
      return {
        external_id: opp.id,
        source: 'grants_gov',
        title: title,
        sponsor: sponsor,
        agency: sponsor, // Use same value for consistency
        description: `Grant opportunity: ${title}`, // Better description
        amount_min: null, // Not available in search2 results
        amount_max: null, // Not available in search2 results
        credit_percentage: null,
        deadline_date: opp.closeDate || null,
        deadline_type: opp.closeDate ? 'fixed' : 'rolling',
        match_requirement_percentage: 0,
        eligibility_criteria: ['general'], // Would need fetchOpportunity API for details
        geography: ['nationwide'],
        project_types: ['general'], // Would need fetchOpportunity API for details
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
        last_updated: new Date().toISOString()
      }
    })

    // Filter out any opportunities that still have invalid data
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

    // Test database connection first
    console.log('Testing database connection...')
    const { count, error: countError } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Database connection test failed:', countError)
      throw new Error(`Database connection failed: ${countError.message}`)
    }
    
    console.log(`Database connection successful. Current opportunities count: ${count}`)

    // Upsert into your opportunities table using service role client
    const { data: inserted, error } = await supabase
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
      message: `Successfully imported ${inserted?.length || 0} targeted federal grant opportunities`,
      summary: {
        total_fetched: allOpportunities.length,
        total_processed: processedOpportunities.length,
        total_valid: validOpportunities.length,
        total_imported: inserted?.length || 0,
        source: 'grants_gov',
        last_sync: new Date().toISOString(),
        agencies: Array.from(new Set(validOpportunities.map(opp => opp.sponsor))).slice(0, 5),
        search_results: searchResults,
        smart_strategy: {
          categories_targeted: Array.from(smartCategories),
          agencies_targeted: Array.from(smartAgencies),
          keywords_used: Array.from(smartKeywords)
        }
      },
      sample_grants: inserted?.slice(0, 5).map(grant => ({
        title: grant.title,
        sponsor: grant.sponsor,
        deadline: grant.deadline_date
      })) || [],
      search_configurations_tried: searchConfigurations.map(config => config.name),
      data_quality: {
        opportunities_found: allOpportunities.length,
        opportunities_processed: processedOpportunities.length,
        opportunities_valid: validOpportunities.length,
        opportunities_filtered_out: processedOpportunities.length - validOpportunities.length
      }
    })

  } catch (error: any) {
    console.error('Smart Grants.gov sync error:', error)
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