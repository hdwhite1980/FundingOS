// app/api/ufa/intelligence/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    // Import the service dynamically to avoid module resolution issues
    const { getIntelligenceDashboardData } = await import('../../../../services/enhancedUnifiedFundingAgent')
    
    const dashboardData = await getIntelligenceDashboardData(tenantId)
    
    if (dashboardData?.error) {
      return NextResponse.json({ error: dashboardData.error }, { status: 500 })
    }

    return NextResponse.json(dashboardData)
    
  } catch (error) {
    console.error('UFA intelligence API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}