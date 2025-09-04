import { supabase } from '../../../../lib/supabase'
import { NextResponse } from 'next/server'

interface GrantsGovOpportunity {
  oppId: string
  oppTitle: string
  agencyName: string
  oppDescription: string
  synopsis?: string
  eligibilityCategory?: string
  awardFloor?: string | number
  awardCeiling?: string | number
  closeDateLt?: string
  openDate?: string
  oppNumber?: string
  cfdaNumbers?: string[]
  fundingInstrumentDesc?: string
  applicantEligibilityDesc?: string
  competitionId?: string
}

export async function GET() {
  try {
    console.log('Starting Grants.gov sync...')
    
    const searchParams = new URLSearchParams({
      format: 'json',
      rows: '100',
      startRecordNum: '0',
      oppStatuses: 'forecasted|posted',
      sortBy: 'openDate|desc'
    })

    const response = await fetch(
      `https://www.grants.gov/grantsws/rest/opportunities/search/?${searchParams}`,
      {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'FundingPlatform/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Grants.gov API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const opportunities: GrantsGovOpportunity[] = data.oppHits || []

    console.log(`Fetched ${opportunities.length} opportunities from Grants.gov`)

    if (opportunities.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No opportunities available from Grants.gov at this time'
      })
    }

    // Helper functions for data processing
    const parseAmount = (amount: string | number | undefined): number | null => {
      if (!amount) return null
      const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount
      return isNaN(numAmount) ? null : numAmount
    }

    const parseEligibility = (eligibilityText: string | undefined): string[] => {
      if (!eligibilityText) return ['general']
      const text = eligibilityText.toLowerCase()
      const criteria: string[] = []
      
      if (text.includes('nonprofit') || text.includes('non-profit')) criteria.push('nonprofit')
      if (text.includes('for-profit') || text.includes('business')) criteria.push('for_profit')
      if (text.includes('government') || text.includes('municipality')) criteria.push('government')
      if (text.includes('small business')) criteria.push('small_business')
      if (text.includes('minority') || text.includes('disadvantaged')) criteria.push('minority_owned')
      if (text.includes('woman') || text.includes('women')) criteria.push('woman_owned')
      if (text.includes('veteran')) criteria.push('veteran_owned')
      
      return criteria.length > 0 ? criteria : ['general']
    }

    const inferProjectTypes = (category: string | undefined): string[] => {
      if (!category) return ['general']
      
      const cat = category.toLowerCase()
      const types: string[] = []
      
      if (cat.includes('housing') || cat.includes('community')) types.push('community_development')
      if (cat.includes('research') || cat.includes('science')) types.push('research')
      if (cat.includes('technology') || cat.includes('innovation')) types.push('technology')
      if (cat.includes('infrastructure') || cat.includes('construction')) types.push('infrastructure')
      if (cat.includes('education') || cat.includes('training')) types.push('education')
      if (cat.includes('health') || cat.includes('medical')) types.push('healthcare')
      if (cat.includes('environment') || cat.includes('energy')) types.push('environmental')
      if (cat.includes('economic') || cat.includes('business')) types.push('small_business')
      
      return types.length > 0 ? types : ['general']
    }

    // Transform data to match your exact schema
    const processedOpportunities = opportunities.map((opp: GrantsGovOpportunity) => ({
      external_id: opp.oppId,
      source: 'grants_gov',
      title: opp.oppTitle,
      sponsor: opp.agencyName,
      agency: opp.agencyName,
      description: opp.oppDescription || opp.synopsis || 'No description available',
      amount_min: parseAmount(opp.awardFloor),
      amount_max: parseAmount(opp.awardCeiling),
      credit_percentage: null,
      deadline_date: opp.closeDateLt ? opp.closeDateLt : null,
      deadline_type: opp.closeDateLt ? 'fixed' : 'rolling',
      match_requirement_percentage: 0,
      eligibility_criteria: parseEligibility(opp.applicantEligibilityDesc),
      geography: ['nationwide'],
      project_types: inferProjectTypes(opp.eligibilityCategory),
      organization_types: ['nonprofit', 'for_profit', 'government'],
      industry_focus: opp.eligibilityCategory ? [opp.eligibilityCategory] : ['general'],
      minority_business: false,
      woman_owned_business: false,
      veteran_owned_business: false,
      small_business_only: false,
      cfda_number: opp.cfdaNumbers?.[0] || null,
      source_url: `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${opp.oppId}`,
      application_process: null,
      required_documents: ['application_form'],
      contact_email: null,
      contact_phone: null,
      competition_level: opp.competitionId ? 'competitive' : 'formula',
      funding_instrument: opp.fundingInstrumentDesc || 'grant',
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
        source: 'grants_gov',
        last_sync: new Date().toISOString()
      },
      sample_grants: inserted?.slice(0, 3).map(grant => ({
        title: grant.title,
        sponsor: grant.sponsor,
        deadline: grant.deadline_date
      })) || []
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