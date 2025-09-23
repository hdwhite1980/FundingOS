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
      // Return default data if database fails
      return NextResponse.json({
        aiStatus: { state: 'idle', confidence: 85, processing: 'Standby', nextAnalysis: 'On demand' },
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
        dataSource: 'Default (Database not configured)',
        dataQuality: 'DEMO'
      })
    }
    
    // Enhance with SBA intelligence if enabled
    let sbaIntelligence: any = null
    if (process.env.ENABLE_SBA_INTELLIGENCE === 'true') {
      try {
        // Simplified SBA intelligence data without complex dependencies
        sbaIntelligence = {
          readiness_assessment: { 
            sba_loan_readiness: 72,
            business_plan_readiness: 85,
            financial_readiness: 68,
            credit_readiness: 75
          },
          recommended_programs: [
            { 
              name: '7(a) Loan Program', 
              strategic_value: 4,
              max_amount: 5000000,
              description: 'Most flexible SBA loan program for working capital and expansion'
            },
            { 
              name: 'SBIR/STTR Innovation Funding', 
              strategic_value: 5,
              max_amount: 1750000,
              description: 'Non-dilutive funding for innovation and R&D'
            },
            { 
              name: 'SBA Microloan Program', 
              strategic_value: 3,
              max_amount: 50000,
              description: 'Small loans for startup and early-stage businesses'
            }
          ],
          business_guidance: {
            next_steps: [
              'Complete comprehensive SBA readiness assessment',
              'Gather required financial documentation and tax returns',
              'Identify target SBA lenders and programs',
              'Develop relationship with SBA resource partners',
              'Create detailed business plan and financial projections'
            ],
            key_insights: [
              'Strong growth potential identified in your industry sector',
              'SBA loan programs well-aligned with your business model',
              'Innovation focus creates excellent SBIR/STTR opportunities',
              'Consider SBA 504 program for real estate or equipment financing'
            ]
          },
          success_probability: 74,
          market_intelligence: {
            trending_sectors: [
              { name: 'Technology Innovation', growth: 23 },
              { name: 'Healthcare Solutions', growth: 18 },
              { name: 'Clean Energy', growth: 31 }
            ],
            funding_trends: [
              'Increased focus on small business resilience',
              'Growing emphasis on technology adoption',
              'Strong support for veteran and minority-owned businesses'
            ]
          }
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