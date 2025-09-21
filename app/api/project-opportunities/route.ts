export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getServerClient()
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      console.log('❌ No userId provided')
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Get opportunities - either from user-specific table or general opportunities
    let opportunities = []
    
    // First try to get user-specific project opportunities
    try {
      const { data: projectOpps, error: projectError } = await supabase
        .from('project_opportunities')
        .select(`
          id, title, description, funding_amount, 
          deadline, status, source, opportunity_type,
          eligibility_criteria, match_score,
          created_at, updated_at
        `)
        .eq('user_id', userId)
        .order('match_score', { ascending: false })
        .limit(50)
      
      if (!projectError && projectOpps) {
        opportunities = projectOpps
      }
    } catch (e) {
      console.log('No project_opportunities table found, trying alternatives...')
    }
    
    // If no user-specific opportunities, try general opportunities table
    if (opportunities.length === 0) {
      try {
        const { data: generalOpps, error: generalError } = await supabase
          .from('opportunities')
          .select(`
            id, title, description, amount, 
            deadline, status, source, type,
            eligibility, fit_score,
            created_at, updated_at
          `)
          .eq('status', 'open')
          .order('fit_score', { ascending: false })
          .limit(100)
        
        if (!generalError && generalOpps) {
          // Transform to match expected format
          opportunities = generalOpps.map(opp => ({
            id: opp.id,
            title: opp.title,
            description: opp.description,
            funding_amount: opp.amount,
            deadline: opp.deadline,
            status: opp.status,
            source: opp.source,
            opportunity_type: opp.type,
            eligibility_criteria: opp.eligibility,
            match_score: opp.fit_score,
            created_at: opp.created_at,
            updated_at: opp.updated_at
          }))
        }
      } catch (e) {
        console.log('No general opportunities table found either')
      }
    }
    
    // If still no opportunities, return empty array with success
    if (opportunities.length === 0) {
      console.log(`No opportunities found for user ${userId.substring(0, 8)}...`)
    } else {
      console.log(`Found ${opportunities.length} opportunities for user ${userId.substring(0, 8)}...`)
    }
    
    return NextResponse.json({ 
      opportunities,
      count: opportunities.length,
      message: opportunities.length === 0 ? 'No opportunities found' : `Found ${opportunities.length} opportunities`
    })
    
  } catch (e: any) {
    console.error('GET /api/project-opportunities error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, opportunity } = body || {}
    
    if (!userId || !opportunity) {
      return NextResponse.json({ error: 'userId and opportunity data required' }, { status: 400 })
    }

    const supabase = getServerClient()

    const opportunityData = {
      user_id: userId,
      title: opportunity.title || 'Untitled Opportunity',
      description: opportunity.description || null,
      funding_amount: opportunity.funding_amount ? parseFloat(opportunity.funding_amount) : null,
      deadline: opportunity.deadline || null,
      status: opportunity.status || 'open',
      source: opportunity.source || 'manual',
      opportunity_type: opportunity.opportunity_type || opportunity.type || null,
      eligibility_criteria: opportunity.eligibility_criteria || opportunity.eligibility || null,
      match_score: opportunity.match_score ? parseFloat(opportunity.match_score) : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('project_opportunities')
      .insert(opportunityData)
      .select()
      .single()
    
    if (error) {
      console.error('Opportunity creation error:', error)
      return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 })
    }
    
    return NextResponse.json({ opportunity: data })
  } catch (e: any) {
    console.error('POST /api/project-opportunities error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}