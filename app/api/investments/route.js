import { createClient } from '@supabase/supabase-js'

// Service role client for operations that need to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const investorId = searchParams.get('investorId')
    
    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🔍 Service role API: Getting investments for user:', userId)

    let query = supabaseAdmin
      .from('investments')
      .select('*, investors(name, company)')
      .eq('user_id', userId)
      .order('investment_date', { ascending: false })

    if (investorId) {
      query = query.eq('investor_id', investorId)
    }

    const { data: investments, error } = await query

    if (error) {
      console.error('Service role investments fetch error:', error)
      return Response.json({ 
        error: 'Failed to fetch investments', 
        details: error.message 
      }, { status: 500 })
    }

    console.log(`✅ Service role API: Retrieved ${investments?.length || 0} investments`)
    
    return Response.json({ investments })
  } catch (error) {
    console.error('Service role investments GET error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { user_id, investor_id, amount, investment_date, investment_type, notes } = data
    
    if (!user_id || !investor_id || !amount) {
      return Response.json({ 
        error: 'User ID, Investor ID, and Amount are required' 
      }, { status: 400 })
    }

    console.log('🚀 Service role API: Creating investment for user:', user_id)

    const investmentToCreate = {
      user_id,
      investor_id,
      amount: parseFloat(amount),
      investment_date: investment_date || new Date().toISOString(),
      investment_type: investment_type || 'equity',
      notes: notes || null,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: investment, error } = await supabaseAdmin
      .from('investments')
      .insert([investmentToCreate])
      .select('*, investors(name, company)')
      .single()

    if (error) {
      console.error('Service role investment creation error:', error)
      return Response.json({ 
        error: 'Failed to create investment', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: Investment created successfully:', investment.id)
    
    return Response.json({ investment })
  } catch (error) {
    console.error('Service role investment POST error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')
    
    if (!id || !userId) {
      return Response.json({ error: 'Investment ID and User ID are required' }, { status: 400 })
    }

    console.log('🗑️ Service role API: Deleting investment:', id)

    const { error } = await supabaseAdmin
      .from('investments')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Service role investment deletion error:', error)
      return Response.json({ 
        error: 'Failed to delete investment', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: Investment deleted successfully:', id)
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('Service role investment DELETE error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}
