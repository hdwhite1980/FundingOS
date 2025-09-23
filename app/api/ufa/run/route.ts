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
    let tenantId: string | null = null
    
    // Handle both GET and POST requests
    if (request.method === 'GET') {
      tenantId = request.nextUrl.searchParams.get('tenantId')
    } else if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}))
      tenantId = body.tenantId || request.nextUrl.searchParams.get('tenantId')
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    // Import the service dynamically
    const { runExpertFundingAnalysisForTenant } = await import('../../../../services/ufaWithSBAIntelligence')
    
    console.log(`🚀 Starting UFA analysis for tenant: ${tenantId}`)
    const result = await runExpertFundingAnalysisForTenant(tenantId)
    
    return NextResponse.json({ 
      success: true,
      tenantId, 
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