import { NextResponse } from 'next/server'

async function getSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase environment variables are not set')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

export async function GET(request) {
  try {
    const supabase = await getSupabaseClient()
    
    const { searchParams } = new URL(request.url)
    const industry = searchParams.get('industry')
    const stage = searchParams.get('stage')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const minInvestment = searchParams.get('minInvestment')
    const maxInvestment = searchParams.get('maxInvestment')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('investment_opportunities')
      .select('*')

    // Apply filters
    if (industry && industry !== 'all') {
      query = query.eq('industry', industry)
    }

    if (stage && stage !== 'all') {
      query = query.eq('funding_stage', stage)
    }

    if (featured === 'true') {
      query = query.eq('featured', true)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,industry.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (minInvestment) {
      query = query.gte('minimum_investment', parseFloat(minInvestment))
    }

    if (maxInvestment) {
      query = query.lte('minimum_investment', parseFloat(maxInvestment))
    }

    // Apply pagination and ordering
    const { data: opportunities, error, count } = await query
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('investment_opportunities')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({ 
      opportunities,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = await getSupabaseClient()
    const opportunityData = await request.json()

    // Validate required fields
    const requiredFields = ['name', 'industry', 'funding_stage', 'funding_goal', 'description']
    for (const field of requiredFields) {
      if (!opportunityData[field]) {
        return NextResponse.json({ 
          error: `${field} is required` 
        }, { status: 400 })
      }
    }

    // Create new investment opportunity
    const { data: opportunity, error } = await supabase
      .from('companies')
      .insert({
        ...opportunityData,
        seeking_investment: true,
        amount_raised: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      opportunity,
      message: 'Investment opportunity created successfully' 
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}