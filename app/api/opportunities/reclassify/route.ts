import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { opportunityId, makeNonMonetary, userRole } = await req.json()

    if (!opportunityId) {
      return NextResponse.json({ success: false, error: 'Missing opportunityId' }, { status: 400 })
    }

    // Simple role check: only admins can reclassify
    if (!['admin', 'super_admin'].includes(String(userRole || ''))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      return NextResponse.json({ success: false, error: 'Supabase env not configured' }, { status: 500 })
    }

    const supabase = createClient(url, key)

    if (makeNonMonetary) {
      // Mark as non‑monetary resource
      const { error } = await supabase
        .from('opportunities')
        .update({
          ai_analysis: {
            isNonMonetaryResource: true
          },
          ai_categories: ['resources','non_monetary']
        })
        .eq('id', opportunityId)

      if (error) throw error
    } else {
      // Mark as monetary: clear AI resource flags and categories
      const { error } = await supabase
        .from('opportunities')
        .update({
          ai_analysis: {
            isNonMonetaryResource: false
          },
          ai_categories: []
        })
        .eq('id', opportunityId)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Reclassify API error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 })
  }
}
