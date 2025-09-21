import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'

// Simple field extraction using AI with fallback heuristics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
  const { userQuery, availableFields = [] } = body || {}

    if (!userQuery) return NextResponse.json({ success: false, error: 'userQuery required' }, { status: 400 })

    const prompt = `Extract the most likely field name from this user question about a form field.

User question: "${userQuery}"

Available fields: ${availableFields.join(', ') || 'None'}

Return a single field name exactly as it appears in the list above if clearly matched, otherwise return the most likely normalized field name (snake_case). If unclear, return UNKNOWN.`

    try {
      const resp: any = await aiProviderService.generateCompletion('field-extraction', [
        { role: 'user', content: prompt }
      ], { temperature: 0.1, maxTokens: 60 })

      if (resp && typeof resp.content === 'string' && resp.content.trim()) {
        const extracted = resp.content.trim().replace(/\"/g, '')
        return NextResponse.json({ success: true, field: extracted })
      }
    } catch (e) {
      console.warn('AI field extraction failed:', e?.message)
    }

    // Heuristic fallback
    const heuristic = heuristicExtractFieldName(userQuery, availableFields)
    return NextResponse.json({ success: true, field: heuristic })
  } catch (error: any) {
    console.error('Field extract error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}

function heuristicExtractFieldName(query: string, availableFields: string[] = []) {
  const lower = query.toLowerCase()
  const common = ['project description', 'project title', 'budget', 'timeline', 'ein', 'organization name', 'personnel', 'objectives', 'summary']
  for (const c of common) if (lower.includes(c)) return c.replace(/\s+/g, '_')

  // Try match available fields by substring
  for (const f of availableFields) {
    if (typeof f !== 'string') continue
    const nf = f.toLowerCase().replace(/[_\s]+/g, ' ')
    if (lower.includes(nf)) return f
  }

  return 'UNKNOWN'
}