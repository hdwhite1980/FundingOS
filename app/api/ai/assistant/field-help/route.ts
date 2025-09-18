import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../../lib/aiProviderService'

// Field improvement endpoint: analyze current user input and return upgrade guidance not generic descriptions.
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

  const system = 'You are Wali-OS Assistant, an expert grant strategist. ONLY provide improvement guidance for the user\'s existing text. Be constructive, specific, quantified where possible. Return JSON only.'
  const userPrompt = `Field: ${field}\nCurrent Raw Value:\n"""\n${currentValue}\n"""\nProject Draft Snapshot (truncated):\n${JSON.stringify(projectDraft).slice(0,1500)}\n\nHeuristic JSON (keys to preserve):\n${JSON.stringify(heuristic)}\n\nRevise STRICTLY to focus on: 1) Missing elements, 2) Strengthening clarity, 3) Adding measurability, 4) Alignment with funder expectations. Do not restate generic field definitions. Keep keys identical.`

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
    explanation: 'Improvement suggestions based on your current draft.',
    what_great_looks_like: [],
    examples: [],
    common_pitfalls: [],
    suggestions: []
  }

  const f = field.toLowerCase()
  if (f.includes('narrative') || f.includes('description')) {
    base.explanation = 'Strengthen narrative clarity, specificity, quantification.'
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
    base.suggestions = []
    if (value.length < 200) base.suggestions.push('Add problem scale data (numbers, % or trend).')
    if (!/\d/.test(value)) base.suggestions.push('Introduce at least one quantitative metric to anchor scope.')
    if (!/(will|increase|reduce|expand)/i.test(value)) base.suggestions.push('Add action verbs and expected directional change.')
  } else if (f.includes('budget') || f.includes('amount')) {
    base.explanation = 'Refine financial clarity and alignment with activities.'
    base.what_great_looks_like = ['Breakdown by major category', 'Alignment between scope and cost', 'Mention of leveraged/matching funds if available']
    base.examples = ['Total: $185K (Personnel 60%, Technology 25%, Evaluation 10%, Admin 5%)']
    base.common_pitfalls = ['Round numbers without rationale', 'No linkage to activities']
    if (!/%/.test(value) && !/personnel|equipment|travel|indirect/i.test(value)) base.suggestions.push('Add category percentages or amounts for transparency.')
  } else if (f.includes('outcome') || f.includes('goal')) {
    base.explanation = 'Elevate outcomes to SMART structure.'
    base.examples = ['Increase colorectal screening rates from 48% to 62% across 12 clinics within 18 months.']
    base.what_great_looks_like = ['Uses baseline + target', 'Time-bound', 'Directly tied to activities']
    base.common_pitfalls = ['Listing activities instead of outcomes', 'No baseline metric']
    if (!/\d/.test(value)) base.suggestions.push('Add baseline and numeric target (e.g., from 120 to 180 participants).')
    if (!/month|year|week|quarter|\d+\s?(days|months|years)/i.test(value)) base.suggestions.push('Include a clear timeframe for achieving the change.')
  }
  return base
}
