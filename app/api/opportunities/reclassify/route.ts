import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { opportunityId, makeNonMonetary, userRole, adminUserId, reason } = await req.json()

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

    // Load current record to preserve/merge JSON
    const { data: currentRows, error: loadErr } = await supabase
      .from('opportunities')
      .select('id, ai_analysis, ai_categories')
      .eq('id', opportunityId)
      .limit(1)
    if (loadErr) throw loadErr
    const current = currentRows?.[0] || { ai_analysis: {}, ai_categories: [] }
    const currentAnalysis = (current.ai_analysis || {}) as any
    const currentCategories: string[] = Array.isArray(current.ai_categories) ? current.ai_categories : []

    let newAnalysis = { ...currentAnalysis, isNonMonetaryResource: !!makeNonMonetary }
    let newCategories = [...currentCategories]
    const addCats = (cats: string[]) => {
      const set = new Set(newCategories.map(c => String(c).toLowerCase()))
      for (const c of cats) set.add(String(c).toLowerCase())
      newCategories = Array.from(set)
    }
    const removeCats = (cats: string[]) => {
      const remove = new Set(cats.map(c => String(c).toLowerCase()))
      newCategories = newCategories.filter(c => !remove.has(String(c).toLowerCase()))
    }

    if (makeNonMonetary) {
      addCats(['resources','non_monetary'])
    } else {
      // Remove only resource markers; leave other AI categories intact
      removeCats(['resources','non_monetary','software_grant','cloud_credits','data_credits','ad_credits','in_kind','services','mentorship','training','equipment','facility_access','incubator','accelerator'])
    }

    const { error: updateErr } = await supabase
      .from('opportunities')
      .update({ ai_analysis: newAnalysis, ai_categories: newCategories })
      .eq('id', opportunityId)
    if (updateErr) throw updateErr

    // Write audit record (best effort)
    try {
      await supabase.from('opportunity_reclassification_audit').insert({
        opportunity_id: opportunityId,
        acted_by_user_id: adminUserId || null,
        action: makeNonMonetary ? 'mark_non_monetary' : 'mark_monetary',
        previous_ai_analysis: currentAnalysis,
        new_ai_analysis: newAnalysis,
        previous_ai_categories: currentCategories,
        new_ai_categories: newCategories,
        reason: reason || null
      })
    } catch (auditErr) {
      console.warn('Audit insert failed (non-fatal):', auditErr)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Reclassify API error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 })
  }
}
