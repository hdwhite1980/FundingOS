import { supabase } from '../../../../lib/supabase'
import { NextResponse } from 'next/server'

interface GrantsGovOpportunity {
  id: string
  number: string
  title: string
  agencyCode: string
  agencyName: string
  openDate: string
  closeDate: string
  oppStatus: string
  docType: string
  alnlist?: string[]
}

export async function GET() {
  try {
    console.log('Starting Grants.gov search2 API sync (no auth required)...')
    
    // Correct request body format based on documentation
    const requestBody = {
      rows: 100,
      oppStatuses: "forecasted|posted", // String format, not array
      sortBy: "openDate",
      keyword: "", // Empty string, not undefined
      oppNum: "",
      eligibilities: "",
      agencies: "",
      aln: "",
      fundingCategories: ""
    }

    console.log('Calling Grants.gov search2 API...')
    const response = await fetch(
      'https://api.grants.gov/v1/api/search2',
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
          // No Authorization header needed!
        },
        body: JSON.stringify(requestBody)
      }
    )

    console.log(`Grants.gov API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error Response: ${errorText}`)
      throw new Error(`Grants.gov API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('API Response structure:', Object.keys(data))
    console.log('API Response data keys:', data.data ? Object.keys(data.data) : 'No data object')
    console.log('Hit count:', data.data?.hitCount)
    console.log('Error code:', data.errorcode)
    console.log('Message:', data.msg)
    
    // Extract opportunities from the response structure
    const opportunities: GrantsGovOpportunity[] = data.data?.oppHits || []
    
    console.log(`Found ${opportunities.length} opportunities from Grants.gov`)

    if (opportunities.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No opportunities available from Grants.gov at this time',
        api_response: {
          errorcode: data.errorcode,
          message: data.msg,
          hit_count: data.data?.hitCount || 0
        }
      })
    }

    // Transform data to match your exact schema
    console.log('Processing opportunities for database insertion...')
    const processedOpportunities = opportunities.map((opp: GrantsGovOpportunity) => ({
      external_id: opp.id,
      source: 'grants_gov',
      title: opp.title,
      sponsor: opp.agencyName,
      agency: opp.agencyName,
      description: `Grant opportunity from ${opp.agencyName}`, // Limited description in search results
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
      cfda_number: opp.alnlist?.[0] || null,
      source_url: `https://www.grants.gov/view-opportunity.html?oppId=${opp.id}`,
      application_process: null,
      required_documents: ['application_form'],
      contact_email: null,
      contact_phone: null,
      competition_level: 'competitive',
      funding_instrument: 'grant',
      raw_data: opp,
      last_updated: new Date().toISOString()
    }))

    console.log(`Processing ${processedOpportunities.length} opportunities for database insert`)

    // Upsert into your opportunities table
    const { data: inserted, error } = await supabase
      .from('opportunities')
      .upsert(processedOpportunities, { 
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
        total_fetched: opportunities.length,
        total_imported: inserted?.length || 0,
        api_hit_count: data.data?.hitCount || 0,
        source: 'grants_gov',
        last_sync: new Date().toISOString(),
        agencies: Array.from(new Set(opportunities.map(opp => opp.agencyName))).slice(0, 5),
        statuses: opportunities.map(opp => opp.oppStatus)
      },
      sample_grants: inserted?.slice(0, 5).map(grant => ({
        title: grant.title,
        sponsor: grant.sponsor,
        deadline: grant.deadline_date
      })) || [],
      api_response_info: {
        errorcode: data.errorcode,
        message: data.msg,
        token_received: !!data.token
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