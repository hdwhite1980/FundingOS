// app/api/ufa/intelligence/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    // Import the base service
    const { getIntelligenceDashboardData } = await import('../../../../services/enhancedUnifiedFundingAgent')
    
    // Get base dashboard data
    const baseDashboardData = await getIntelligenceDashboardData(tenantId)
    
    if (baseDashboardData?.error) {
      console.error('Base dashboard data error:', baseDashboardData.error)
      // Return minimal response when database is not configured
      return NextResponse.json({
        aiStatus: { 
          state: 'unavailable', 
          confidence: 0, 
          processing: 'Database not configured', 
          nextAnalysis: 'Configure database connection' 
        },
        goals: [],
        tasks: [],
        metrics: [],
        events: [],
        notifications: [],
        strategicOverview: {
          totalOpportunities: 0,
          highPriorityMatches: 0,
          applicationsPending: 0,
          successRate: 0,
          portfolioValue: 0
        },
        sbaIntelligence: null,
        dataSource: 'No Data (Database not configured)',
        dataQuality: 'UNAVAILABLE',
        message: 'Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables to enable real data'
      })
    }
    
    // Enhance with SBA intelligence if enabled and database is configured
    let sbaIntelligence: any = null
    if (process.env.ENABLE_SBA_INTELLIGENCE === 'true' && !baseDashboardData?.error) {
      try {
        const { UFAExpertStrategistWithSBA } = await import('../../../../services/ufaWithSBAIntelligence')
        const ufaSBA = new UFAExpertStrategistWithSBA(tenantId)
        
        // Get real organization profile from database
        const orgProfile = await ufaSBA.getOrganizationBusinessProfile()
        
        if (orgProfile && !orgProfile.error) {
          // Only provide SBA intelligence if we have real org data
          const analysisResult = await ufaSBA.analyzeComprehensiveFundingEcosystem()
          sbaIntelligence = analysisResult.sbaIntelligence
        }
      } catch (error) {
        console.warn('SBA intelligence enhancement failed:', error.message)
        sbaIntelligence = null
      }
    }
    
    const dashboardData = {
      ...baseDashboardData,
      sbaIntelligence,
      dataSource: 'Enhanced UFA Intelligence',
      dataQuality: sbaIntelligence ? 'ENHANCED' : 'STANDARD',
      analysisTimestamp: new Date().toISOString()
    }
    
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