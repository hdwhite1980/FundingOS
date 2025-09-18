import { NextRequest, NextResponse } from 'next/server'
import { analyzeProject } from '../../../../../lib/ai/projectAnalysisService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, userId, force = false } = body || {}
    if (!projectId || !userId) {
      return NextResponse.json({ error: 'projectId and userId required' }, { status: 400 })
    }

    const result = await analyzeProject({ projectId, userId, force })
    return NextResponse.json({ data: result })
  } catch (error: any) {
    console.error('Project analysis endpoint error', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
