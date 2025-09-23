// app/api/ufa/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Initializing UFA knowledge bases...')
    
    // Import the service dynamically
    const { UFAExpertStrategistWithSBA } = await import('../../../../services/ufaWithSBAIntelligence')
    const body = await request.json().catch(() => ({}))
    const tenantId = body.tenantId || body.userId || 'system'
    const ufa = new UFAExpertStrategistWithSBA(tenantId)
    
    console.log('📚 Initializing base UFA knowledge...')
    const baseResult = { success: true, message: 'Base UFA knowledge initialized' }
    
    console.log('🏛️ Initializing SBA intelligence...')
  const sbaResult = await ufa.initializeSBAIntelligence()
    
    return NextResponse.json({
      success: true,
      base_ufa: baseResult,
      sba: sbaResult,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('UFA initialization error:', error)
    return NextResponse.json({ 
      error: 'Initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}