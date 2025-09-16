import { NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

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
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get or create investor profile
    let { data: investor, error: investorError } = await supabase
      .from('angel_investors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!investor && investorError && investorError.code === 'PGRST116') {
      const { data: userMeta } = await supabase.auth.admin.getUserById(userId)
      const { data: created, error: createErr } = await supabase
        .from('angel_investors')
        .insert({
          user_id: userId,
          name: userMeta?.user?.user_metadata?.full_name || userMeta?.user?.email || 'Angel Investor',
          email: userMeta?.user?.email || ''
        })
        .select()
        .single()
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })
      investor = created
    } else if (investorError && investorError.code !== 'PGRST116') {
      return NextResponse.json({ error: investorError.message }, { status: 400 })
    }

    // Portfolio (joins projects)
    const { data: portfolio, error: portfolioError } = await supabase
      .from('angel_investments')
      .select(`
        id, investment_amount, investment_date, status,
        projects(id, name, funding_goal, amount_raised, seeking_investment)
      `)
      .eq('investor_id', userId)
      .order('investment_date', { ascending: false })

    if (portfolioError) console.error('Portfolio error', portfolioError)

    // Opportunities from view
    const { data: opportunities, error: oppError } = await supabase
      .from('investment_opportunities')
      .select('*')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (oppError) console.error('Opportunities error', oppError)

    // Derived stats
    const investments = portfolio || []
    const totalInvested = investments.reduce((s, i) => s + Number(i.investment_amount || 0), 0)
    const portfolioValue = investments.reduce((s, i) => s + Number(i.investment_amount || 0) * 1.15, 0) // Mock 15% growth
    const activeInvestments = investments.filter(i => i.status === 'active').length

    return NextResponse.json({
      investor,
      portfolio: investments,
      opportunities: opportunities || [],
      stats: { totalInvested, portfolioValue, activeInvestments, avgROI: 15.0 }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const supabase = await getSupabaseClient()
    const { userId, ...updateData } = await request.json()
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

    const { data, error } = await supabase
      .from('angel_investors')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ investor: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}