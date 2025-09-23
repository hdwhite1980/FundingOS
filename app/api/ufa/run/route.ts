// app/api/ufa/run/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return handleUFAAnalysis(request)
}

export async function POST(request: NextRequest) {
  return handleUFAAnalysis(request)
}

async function handleUFAAnalysis(request: NextRequest) {
  try {
    let userId: string | null = null
    
    // Handle both GET and POST requests
    if (request.method === 'GET') {
      userId = request.nextUrl.searchParams.get('userId')
    } else if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}))
      userId = body.userId || request.nextUrl.searchParams.get('userId')
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Import the service dynamically
    const { runExpertFundingAnalysisForTenant } = await import('../../../../services/ufaWithSBAIntelligence')
    
    console.log(`🚀 Starting UFA analysis for user: ${userId}`)
    const result = await runExpertFundingAnalysisForTenant(userId)
    
    return NextResponse.json({ 
      success: true,
      userId, 
      result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('UFA run error:', error)
    return NextResponse.json({ 
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}