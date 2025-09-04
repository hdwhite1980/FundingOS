import { supabase } from '../../../../lib/supabase'
import { NextResponse } from 'next/server'

interface GrantsGovOpportunity {
  id: string
  number: string
  title: string
  agencyCode: string
  agencyName: string
  agency?: string // Add optional agency field
  openDate: string
  closeDate: string
  oppStatus: string
  docType: string
  alnlist?: string[]
  cfdaList?: string[] // Alternative CFDA field name
}

export async function GET() {
  try {
    console.log('Starting Grants.gov search2 API sync with multiple search configurations...')
    
    // Try multiple search approaches with known categories
    const searchConfigurations = [
      {
        name: "Health & Life Sciences",
        params: {
          rows: 50,
          oppStatuses: "posted",
          fundingCategories: "HL", // Health & Life Sciences
          keyword: "",
          agencies: "",
          eligibilities: "",
          aln: "",
        }
      },
      {
        name: "Arts",
        params: {
          rows: 50,
          oppStatuses: "posted",
          fundingCategories: "AR", // Arts
          keyword: "",
          agencies: "",
          eligibilities: "",
          aln: "",
        }
      },
      {
        name: "Education",
        params: {
          rows: 50,
          oppStatuses: "posted",
          fundingCategories: "ED", // Education
          keyword: "",
          agencies: "",
          eligibilities: "",
          aln: "",
        }
      },
      {
        name: "HHS Agency",
        params: {
          rows: 50,
          oppStatuses: "posted",
          agencies: "HHS", // Health & Human Services
          fundingCategories: "",
          keyword: "",
          eligibilities: "",
          aln: "",
        }
      },
      {
        name: "Broad Search",
        params: {
          rows: 100,
          oppStatuses: "posted",
          keyword: "",
          agencies: "",
          eligibilities: "",
          aln: "",
          fundingCategories: ""
        }
      }
    ]

    let allOpportunities: GrantsGovOpportunity[] = []
    let searchResults: Array<{
      name: string
      count?: number
      errorcode?: any
      message?: any
      error?: string
    }> = []

    console.log('Trying multiple search configurations...')

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
          
          // Debug: Log first opportunity structure
          if (opportunities.length > 0) {
            console.log('Sample opportunity structure:', Object.keys(opportunities[0]))
            console.log('Sample opportunity data:', JSON.stringify(opportunities[0], null, 2))
            
            // Debug agency fields specifically
            console.log('Agency field analysis:', opportunities.slice(0, 3).map(opp => ({
              id: opp.id,
              agencyName: opp.agencyName,
              agencyCode: opp.agencyCode,
              agency: opp.agency,
              title: opp.title
            })))
          }
          
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
            
            // Break after finding some opportunities
            if (allOpportunities.length >= 10) break
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
        message: 'No opportunities found across all search configurations',
        search_results: searchResults,
        debug_info: {
          configurations_tried: searchConfigurations.length,
          search_details: searchResults
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
        source_url: `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${opp.number}`,
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
      message: `Successfully imported ${inserted?.length || 0} federal grant opportunities from Grants.gov`,
      summary: {
        total_fetched: allOpportunities.length,
        total_processed: processedOpportunities.length,
        total_valid: validOpportunities.length,
        total_imported: inserted?.length || 0,
        source: 'grants_gov',
        last_sync: new Date().toISOString(),
        agencies: Array.from(new Set(validOpportunities.map(opp => opp.sponsor))).slice(0, 5),
        search_results: searchResults
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
    console.error('Grants.gov sync error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to sync with Grants.gov API',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}