import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

interface GrantsGovOpportunity {
  oppId: string
  oppTitle: string
  agencyName: string
  oppDescription: string
  eligibilityCategory?: string
  awardFloor?: number
  awardCeiling?: number
  closeDateLt?: string
  openDate?: string
  synopsis?: string
  oppNumber?: string
  cfdaNumbers?: string[]
}

interface ProcessedOpportunity {
  external_id: string
  source: string
  title: string
  sponsor: string
  agency: string
  description: string
  category: string
  amount_min: number | null
  amount_max: number | null
  deadline: string | null
  posted_date: string | null
  url: string
  eligibility: string[]
  metadata: any
}

export async function GET() {
  const supabase = createServerClient()
  
  try {
    // Fetch REAL data from Grants.gov public API using GET
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

    if (opportunities.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No opportunities available from Grants.gov at this time'
      })
    }

    // Transform data to match your existing opportunities table structure
    const processedOpportunities: ProcessedOpportunity[] = opportunities.map((opp: GrantsGovOpportunity) => ({
      external_id: opp.oppId,
      source: 'grants_gov',
      title: opp.oppTitle,
      sponsor: opp.agencyName,
      agency: opp.agencyName,
      description: opp.oppDescription || opp.synopsis || '',
      category: opp.eligibilityCategory || 'General',
      amount_min: opp.awardFloor || null,
      amount_max: opp.awardCeiling || null,
      deadline: opp.closeDateLt ? new Date(opp.closeDateLt).toISOString().split('T')[0] : null,
      posted_date: opp.openDate ? new Date(opp.openDate).toISOString().split('T')[0] : null,
      url: `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${opp.oppId}`,
      eligibility: opp.eligibilityCategory ? [opp.eligibilityCategory] : [],
      metadata: {
        opportunityNumber: opp.oppNumber,
        cfdaNumbers: opp.cfdaNumbers,
        synopsis: opp.synopsis,
        rawData: opp
      }
    }))

    // Insert into your existing opportunities table
    const { data: inserted, error } = await supabase
      .from('opportunities')
      .upsert(processedOpportunities, { 
        onConflict: 'external_id,source',
        ignoreDuplicates: false 
      })
      .select('id')

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      imported: inserted?.length || 0,
      message: `Imported ${inserted?.length || 0} real opportunities from Grants.gov`,
      sample: processedOpportunities.slice(0, 3).map(opp => ({
        title: opp.title,
        sponsor: opp.sponsor,
        amount_max: opp.amount_max,
        deadline: opp.deadline
      }))
    })

  } catch (error: any) {
    console.error('Grants.gov sync error:', error)
    return NextResponse.json({ 
      error: 'Failed to sync with Grants.gov API',
      details: error.message 
    }, { status: 500 })
  }
}

// Keep POST method for backward compatibility and cron jobs
export async function POST() {
  return GET()
}