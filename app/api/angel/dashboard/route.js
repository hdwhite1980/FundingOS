import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
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
      .single()

    if (investorError && investorError.code === 'PGRST116') {
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
    } else if (investorError) {
      return NextResponse.json({ error: investorError.message }, { status: 400 })
    }

    // Portfolio (joins projects)
    const { data: portfolio, error: portfolioError } = await supabase
      .from('angel_investments')
      .select(`
        id, investment_amount, current_value, roi_percentage, investment_date, status,
        project:projects(id, name, funding_stage, funding_goal, amount_raised, seeking_investment)
      `)
      .eq('investor_id', investor.id)
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
    const portfolioValue = investments.reduce((s, i) => s + Number(i.current_value || i.investment_amount || 0), 0)
    const activeInvestments = investments.filter(i => i.status === 'active').length
    const avgROI = investments.length ? (
      investments.reduce((s, i) => s + Number(i.roi_percentage || 0), 0) / investments.length
    ) : 0

    return NextResponse.json({
      investor,
      portfolio: investments,
      opportunities: opportunities || [],
      stats: { totalInvested, portfolioValue, activeInvestments, avgROI }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
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