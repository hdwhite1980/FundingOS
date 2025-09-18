import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../../lib/aiProviderService'

// Lightweight field guidance endpoint. Phase 1: If field is recognized, returns structured tips.
// Request: { userId, field, currentValue, projectDraft }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, field, currentValue = '', projectDraft = {}, useLLM = true } = body || {}
    if (!userId || !field) return NextResponse.json({ error: 'userId and field required' }, { status: 400 })

    const heuristic = buildHeuristic(field, currentValue, projectDraft)

    if (!useLLM) {
      return NextResponse.json({ data: heuristic })
    }

    const system = 'You are a funding project form expert. Give precise, actionable, example-driven guidance. Return JSON only.'
    const userPrompt = `Field: ${field}\nCurrent Value: ${currentValue}\nProject Draft: ${JSON.stringify(projectDraft).slice(0,1500)}\n\nHeuristic Draft JSON: ${JSON.stringify(heuristic)}\nRefine the draft. Keep keys the same.`

    let refined = heuristic
    try {
      const resp: any = await aiProviderService.generateCompletion('document-analysis', [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt }
      ], { maxTokens: 600, temperature: 0.3 })
      if (resp && typeof resp.content === 'string') {
        refined = aiProviderService.safeParseJSON(resp.content)
      }
    } catch (e: any) {
      console.warn('Field help refinement failed, using heuristic', e?.message)
    }

    return NextResponse.json({ data: refined })
  } catch (error: any) {
    console.error('Field help error', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

interface FieldHelp {
  field: string
  explanation: string
  what_great_looks_like: string[]
  examples: string[]
  common_pitfalls: string[]
  suggestions: string[]
}

function buildHeuristic(field: string, value: string, draft: any): FieldHelp {
  const base: FieldHelp = {
    field,
    explanation: 'Detailed guidance will appear here as the AI system matures.',
    what_great_looks_like: [],
    examples: [],
    common_pitfalls: [],
    suggestions: []
  }

  const f = field.toLowerCase()
  if (f.includes('narrative') || f.includes('description')) {
    base.explanation = 'Provide a concise problem, your solution approach, beneficiaries, and measurable outcomes.'
    base.what_great_looks_like = [
      'Clear statement of need with supporting data',
      'Specific target population and scale',
      'Theory of change or logic model elements',
      'Baseline + intended measurable outcomes'
    ]
    base.examples = [
      'We address rural clinic staffing shortages by deploying a telehealth training program projected to reach 2,500 patients in year one.'
    ]
    base.common_pitfalls = ['Vague impact claims', 'Missing beneficiary counts', 'Overly broad goals']
    base.suggestions = value.length < 400 ? ['Expand with quantitative context (who, how many, over what timeframe)'] : []
  } else if (f.includes('budget') || f.includes('amount')) {
    base.explanation = 'Clarify total project cost, requested amount, major cost buckets, and any matching funds.'
    base.what_great_looks_like = ['Breakdown by major category', 'Alignment between scope and cost', 'Mention of leveraged/matching funds if available']
    base.examples = ['Total: $185K (Personnel 60%, Technology 25%, Evaluation 10%, Admin 5%)']
    base.common_pitfalls = ['Round numbers without rationale', 'No linkage to activities']
  } else if (f.includes('outcome') || f.includes('goal')) {
    base.explanation = 'Define SMART outcomes—Specific, Measurable, Achievable, Relevant, Time-bound.'
    base.examples = ['Increase colorectal screening rates from 48% to 62% across 12 clinics within 18 months.']
    base.what_great_looks_like = ['Uses baseline + target', 'Time-bound', 'Directly tied to activities']
    base.common_pitfalls = ['Listing activities instead of outcomes', 'No baseline metric']
  }
  return base
}
